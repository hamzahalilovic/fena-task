import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Kafka } from 'kafkajs';

@Injectable()
export class QueueConsumer {
  private kafka = new Kafka({
    clientId: 'email-queue',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  private consumer = this.kafka.consumer({ groupId: 'email-group' });
  private logger = new Logger(QueueConsumer.name);

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}

  async consumeJobs() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'email-jobs', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          this.logger.warn('got a message with no value, skipping.');
          return;
        }

        const jobData = JSON.parse(message.value.toString());
        const { jobId, totalEmails } = jobData;

        this.logger.log(`Processing job ${jobId} with ${totalEmails} emails.`);

        let job = await this.jobRepo.findOneBy({ id: jobId });
        if (!job) {
          this.logger.warn(`Job ${jobId} not found in the database.`);
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
            job.processedEmails >= totalEmails ? 'completed' : 'in-progress';
          await this.jobRepo.save(job);

          this.logger.log(
            `Job ${jobId}: Processed ${job.processedEmails}/${totalEmails} emails.`,
          );
        }

        this.logger.log(`Job ${jobId} completed.`);
      },
    });
  }
}
