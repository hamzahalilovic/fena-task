import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Kafka, Consumer } from 'kafkajs';
import { JobsGateway } from '../jobs/jobs.gateway';

@Injectable()
export class QueueConsumer implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({
    clientId: 'email-queue',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  private consumer: Consumer;
  private logger = new Logger(QueueConsumer.name);
  private isConsuming = false; //  flag to track if consumer is running to prevent duplicate initialization

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly jobsGateway: JobsGateway,
  ) {
    this.consumer = this.kafka.consumer({ groupId: 'email-consumer' });
  }

  async onModuleInit() {
    if (this.isConsuming) {
      this.logger.warn(
        'Kafka Consumer is already running, skipping duplicate initialization',
      );
      return;
    }

    this.logger.log('Initializing Kafka Consumer...');
    this.isConsuming = true;
    await this.consumeJobs();
  }

  async consumeJobs() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka Consumer Connected');

      const subscriptions = await this.consumer.describeGroup();
      if (!subscriptions.members.length) {
        await this.consumer.subscribe({
          topic: 'email-jobs',
          fromBeginning: false,
        });
        this.logger.log('Subscribed to topic: email-jobs');
      } else {
        this.logger.warn(
          'Consumer already subscribed, skipping subscription',
        );
      }

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;

          try {
            const jobData = JSON.parse(message.value.toString());
            const { jobId, totalEmails } = jobData;

            this.logger.log(
              `Processing job ${jobId} with ${totalEmails} emails`,
            );

            let job = await this.jobRepo.findOneBy({ id: jobId });
            if (!job) {
              this.logger.warn(`Job ${jobId} not found`);
              return;
            }

            job.status = 'in-progress';
            await this.jobRepo.save(job);
            this.jobsGateway.sendJobUpdate(job);

            for (let i = 0; i < totalEmails; i += 100) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              job.processedEmails = Math.min(
                job.processedEmails + 100,
                totalEmails,
              );
              job.status =
                job.processedEmails >= totalEmails
                  ? 'completed'
                  : 'in-progress';

              await this.jobRepo.save(job);
              this.jobsGateway.sendJobUpdate(job);

              this.logger.log(
                `Job ${jobId}: Processed ${job.processedEmails}/${totalEmails} emails`,
              );
            }

            this.logger.log(`Job ${jobId} completed`);
          } catch (error) {
            this.logger.error(
              `Error processing job: ${error.message}`,
              error.stack,
            );
          }
        },
      });
    } catch (error) {
      this.logger.error(
        `Kafka Consumer failed to start: ${error.message}`,
        error.stack,
      );
    }
  }

  async shutdown() {
    try {
      this.logger.warn('Kafka consumer shutting down...');
      await this.consumer.disconnect();
      this.isConsuming = false;
      this.logger.log('Kafka consumer disconnected');
    } catch (error) {
      this.logger.error(
        `Error shutting down Kafka consumer: ${error.message}`,
        error.stack,
      );
    }
  }

  async onModuleDestroy() {
    await this.shutdown();
  }
}
