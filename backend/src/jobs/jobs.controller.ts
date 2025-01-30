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

  @Delete(':id')
  async deleteJob(@Param('id') id: string) {
    const deleted = await this.jobsService.deleteJob(id);
    if (!deleted) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }
    return { message: `Job ${id} deleted successfully` };
  }
}
