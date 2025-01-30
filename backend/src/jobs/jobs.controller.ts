import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async createJob(@Body('totalEmails') totalEmails: number) {
    return this.jobsService.createJob(totalEmails);
  }

  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Get()
  async getAllJobs() {
    return this.jobsService.getAllJobs();
  }
}
