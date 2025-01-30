import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsGateway } from './jobs.gateway';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsGateway: JobsGateway,
  ) {}

  @Post()
  async createJob(@Body('totalEmails') totalEmails: number) {
    const job = await this.jobsService.createJob(totalEmails);
    if (!job)
      throw new HttpException(
        'Job creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    // notify frontend that new job is created
    this.jobsGateway.sendJobCreated(job); // emitting via jobs gateway
    return job;
  }

  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Get()
  async getAllJobs() {
    return this.jobsService.getAllJobs();
  }

  @Delete(':id')
  async deleteJob(@Param('id') id: string) {
    const deleted = await this.jobsService.deleteJob(id);
    if (!deleted) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    return { message: `Job ${id} deleted successfully` };
  }
}
