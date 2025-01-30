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
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';

const isProduction = process.env.NODE_ENV === 'production';

@Injectable()
export class QueueConsumer implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(QueueConsumer.name);
  private queueClient;
  private consumer?: Consumer;
  private isConsuming = false;

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly jobsGateway: JobsGateway,
  ) {
    if (isProduction) {
      this.queueClient = new SQSClient({ region: process.env.AWS_REGION });
    } else {
      const kafka = new Kafka({
        clientId: 'email-queue',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      });
      this.consumer = kafka.consumer({ groupId: 'email-consumer' });
      this.queueClient = this.consumer;
    }
  }

  async onModuleInit() {
    if (this.isConsuming) {
      this.logger.warn(
        'Consumer is already running, skipping duplicate initialization',
      );
      return;
    }
    this.isConsuming = true;

    isProduction
      ? await this.consumeSqsMessages()
      : await this.consumeKafkaMessages();
  }

  async consumeKafkaMessages() {
    await this.queueClient.connect();
    this.logger.log('Kafka Consumer Connected');

    await this.queueClient.subscribe({
      topic: 'email-jobs',
      fromBeginning: false,
    });
    this.logger.log('Subscribed to Kafka topic: email-jobs');

    await this.queueClient.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        await this.processJobMessage(message.value.toString());
      },
    });
  }

  async consumeSqsMessages() {
    this.logger.log('AWS SQS Consumer Started');
    while (true) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: process.env.AWS_SQS_URL!,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 5,
        });

        const response = await this.queueClient.send(command);

        if (response?.Messages) {
          for (const message of response.Messages) {
            if (message.Body) {
              await this.processJobMessage(message.Body);
              await this.queueClient.send(
                new DeleteMessageCommand({
                  QueueUrl: process.env.AWS_SQS_URL!,
                  ReceiptHandle: message.ReceiptHandle!,
                }),
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `AWS SQS Consumer error: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async processJobMessage(message: string) {
    const jobData = JSON.parse(message);
    const { jobId, totalEmails } = jobData;

    this.logger.log(`Processing job ${jobId} with ${totalEmails} emails.`);

    let job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) {
      this.logger.warn(`Job ${jobId} not found.`);
      return;
    }

    job.status = 'in-progress';
    await this.jobRepo.save(job);
    this.jobsGateway.sendJobUpdate(job);

    for (let i = 0; i < totalEmails; i += 100) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      job.processedEmails = Math.min(job.processedEmails + 100, totalEmails);
      job.status =
        job.processedEmails >= totalEmails ? 'completed' : 'in-progress';

      await this.jobRepo.save(job);
      this.jobsGateway.sendJobUpdate(job);
    }

    this.logger.log(`Job ${jobId} completed.`);
  }

  async shutdown() {
    if (isProduction) {
      this.logger.log('SQS Consumer Stopping...');
      this.isConsuming = false;
    } else {
      this.logger.log('Kafka Consumer Disconnecting...');
      await this.queueClient.disconnect();
    }
  }

  async onModuleDestroy() {
    await this.queueClient.disconnect();
    this.logger.log('Queue Consumer Disconnected.');
  }
}
