import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class QueueConsumer implements OnModuleInit {
  private kafka = new Kafka({
    clientId: 'email-queue',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });
  private consumer = this.kafka.consumer({ groupId: 'email-processors' });

  constructor(private readonly jobsService: JobsService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'email-jobs', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const { jobId, totalEmails } = JSON.parse(message.value.toString());

        for (let processed = 0; processed <= totalEmails; processed += 100) {
          await new Promise((res) => setTimeout(res, 500)); 
          await this.jobsService.updateJobProgress(jobId, processed);
        }
      },
    });
  }
}
