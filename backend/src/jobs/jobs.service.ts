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
    await this.producer.connect();
    const job = this.jobRepo.create({ totalEmails, status: 'pending' });
    const savedJob = await this.jobRepo.save(job);

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
    return this.jobRepo.update(id, {
      processedEmails,
      status: processedEmails >= 100000 ? 'completed' : 'in-progress',
    });
  }
}
