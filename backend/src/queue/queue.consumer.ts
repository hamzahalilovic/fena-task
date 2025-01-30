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

@Injectable()
export class QueueConsumer implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({
    clientId: 'email-queue',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  private consumer: Consumer;
  private logger = new Logger(QueueConsumer.name);
  private isConnected = false; 

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Kafka Consumer');
    await this.consumeJobs();
  }

  async consumeJobs() {
    if (this.isConnected) {
      this.logger.warn(
        'consumer is already running',
      );
      return;
    }

    try {
      this.consumer = this.kafka.consumer({ groupId: 'email-consumer' });
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Kafka consumer connected');

      await this.consumer.subscribe({
        topic: 'email-jobs',
        fromBeginning: false,
      });
      this.logger.log('Subscribed to topic: email-jobs');

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) {
            this.logger.warn('Received a message with no value, skipping');
            return;
          }

          try {
            const jobData = JSON.parse(message.value.toString());
            const { jobId, totalEmails } = jobData;

            this.logger.log(
              `Processing job ${jobId} with ${totalEmails} emails`,
            );

            let job = await this.jobRepo.findOneBy({ id: jobId });
            if (!job) {
              this.logger.warn(`Job ${jobId} not found in the database`);
              return;
            }

            job.status = 'in-progress';
            await this.jobRepo.save(job);

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

              this.logger.log(
                `Job ${jobId}: Processed ${job.processedEmails}/${totalEmails} emails`,
              );
            }

            this.logger.log(`Job ${jobId} completed`);
          } catch (error) {
            this.logger.error(
              `Error processing job ${error.message}`,
              error.stack,
            );
          }
        },
      });
    } catch (error) {
      this.logger.error(
        `Kafka Consumer failed to start ${error.message}`,
        error.stack,
      );
    }
  }

  // graceful shutdown handler
  async shutdown() {
    try {
      if (this.isConnected) {
        this.logger.warn('Kafka Consumer is shutting down');
        await this.consumer.disconnect();
        this.isConnected = false;
        this.logger.log('Kafka Consumer Disconnected');
      }
    } catch (error) {
      this.logger.error(
        `Error shutting down Kafka Consumer ${error.message}`,
        error.stack,
      );
    }
  }

  async onModuleDestroy() {
    await this.shutdown();
  }
}
