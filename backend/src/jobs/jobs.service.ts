import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './job.entity';
import { Kafka } from 'kafkajs';

@Injectable()
export class JobsService {
  private kafka = new Kafka({
    clientId: 'email-queue',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  private producer = this.kafka.producer();

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}

  async createJob(totalEmails: number): Promise<Job> {
    const job = this.jobRepo.create({ totalEmails, status: 'pending' });
    const savedJob = await this.jobRepo.save(job);

    await this.producer.connect();
    await this.producer.send({
      topic: 'email-jobs',
      messages: [
        { value: JSON.stringify({ jobId: savedJob.id, totalEmails }) },
      ],
    });

    return savedJob;
  }

  async getJobById(id: string): Promise<Job | null> {
    return this.jobRepo.findOneBy({ id });
  }

  async getAllJobs(): Promise<Job[]> {
    return this.jobRepo.find();
  }

  async updateJobProgress(id: string, processedEmails: number) {
    const job = await this.jobRepo.findOneBy({ id });
    if (!job) {
      throw new Error(`Job with ID ${id} not found`);
    }

    job.processedEmails = processedEmails;
    job.status =
      processedEmails >= job.totalEmails ? 'completed' : 'in-progress';

    return this.jobRepo.save(job);
  }
}
