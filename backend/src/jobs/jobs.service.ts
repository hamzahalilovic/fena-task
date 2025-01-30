import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './job.entity';
import { Kafka } from 'kafkajs';

import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const isProduction = process.env.NODE_ENV === 'production';

@Injectable()
export class JobsService {
  private kafkaProducer;
  private sqsClient;
  private dynamoDBClient;

  constructor(
    @InjectRepository(Job) private readonly jobRepo?: Repository<Job>, // PostgreSQL
    @Inject('DYNAMODB_CLIENT')
    private readonly dynamoClient?: DynamoDBDocumentClient, // DynamoDB
  ) {
    if (!isProduction) {
      const kafka = new Kafka({
        clientId: 'email-queue',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      });
      this.kafkaProducer = kafka.producer();
    } else {
      this.sqsClient = new SQSClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      this.dynamoDBClient = dynamoClient;
    }
  }

  async createJob(totalEmails: number): Promise<any> {
    if (!Number.isInteger(totalEmails) || totalEmails <= 0) {
      throw new HttpException(
        'Total emails must be a positive integer greater than zero',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isProduction) {
      const job = {
        id: crypto.randomUUID(),
        totalEmails,
        processedEmails: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoDBClient!.send(
        new PutCommand({ TableName: 'Jobs', Item: job }),
      );

      await this.sqsClient!.send(
        new SendMessageCommand({
          QueueUrl: process.env.AWS_SQS_URL!,
          MessageBody: JSON.stringify({ jobId: job.id, totalEmails }),
        }),
      );

      return job;
    } else {
      if (!this.jobRepo) throw new Error('PostgreSQL repo is not initialized!');

      const job = this.jobRepo.create({
        totalEmails,
        status: 'pending',
        processedEmails: 0,
      });
      const savedJob = await this.jobRepo.save(job);

      await this.kafkaProducer?.connect();
      await this.kafkaProducer?.send({
        topic: 'email-jobs',
        messages: [
          { value: JSON.stringify({ jobId: savedJob.id, totalEmails }) },
        ],
      });

      return savedJob;
    }
  }

  async getJobById(id: string): Promise<any> {
    if (isProduction) {
      const { Item } = await this.dynamoDBClient!.send(
        new GetCommand({ TableName: 'Jobs', Key: { id } }),
      );
      return Item;
    } else {
      if (!this.jobRepo) throw new Error('PostgreSQL repo is not initialized!');
      return this.jobRepo.findOneBy({ id });
    }
  }

  async updateJobProgress(id: string, processedEmails: number) {
    if (isProduction) {
      await this.dynamoDBClient!.send(
        new UpdateCommand({
          TableName: 'Jobs',
          Key: { id },
          UpdateExpression:
            'SET processedEmails = :processedEmails, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':processedEmails': processedEmails,
            ':updatedAt': new Date().toISOString(),
          },
        }),
      );
    } else {
      if (!this.jobRepo) throw new Error('PostgreSQL repo is not initialized');
      const job = await this.jobRepo.findOneBy({ id });
      if (!job)
        throw new HttpException(
          `Job with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );

      job.processedEmails = processedEmails;
      job.status =
        processedEmails >= job.totalEmails ? 'completed' : 'in-progress';
      return this.jobRepo.save(job);
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    if (isProduction) {
      await this.dynamoDBClient!.send(
        new DeleteCommand({ TableName: 'Jobs', Key: { id } }),
      );
      return true;
    } else {
      if (!this.jobRepo) throw new Error('PostgreSQL repo is not initialized');
      const job = await this.jobRepo.findOneBy({ id });
      if (!job) return false;
      await this.jobRepo.remove(job);
      return true;
    }
  }

  async getAllJobs(): Promise<any[]> {
    if (isProduction) {
      const { Items } = await this.dynamoDBClient!.send(
        new ScanCommand({ TableName: 'Jobs' }),
      );
      return Items || [];
    } else {
      if (!this.jobRepo) throw new Error('PostgreSQL repo is not initialized');
      return this.jobRepo.find();
    }
  }
}
