import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
    // prevent non integer or negative values when accessing outside frontend
    if (!Number.isInteger(totalEmails) || totalEmails <= 0) {
      throw new HttpException(
        'Total emails must be a positive integer greater than zero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const job = this.jobRepo.create({
      totalEmails,
      status: 'pending',
      processedEmails: 0,
    });
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
      throw new HttpException(
        `Job with ID ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    job.processedEmails = processedEmails;
    job.status =
      processedEmails >= job.totalEmails ? 'completed' : 'in-progress';

    return this.jobRepo.save(job);
  }

  async deleteJob(id: string): Promise<boolean> {
    const job = await this.jobRepo.findOneBy({ id });
    if (!job) {
      return false;
    }
    await this.jobRepo.remove(job);
    return true;
  }
}
