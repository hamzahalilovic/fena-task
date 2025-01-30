import { Module } from '@nestjs/common';
import { QueueConsumer } from './queue.consumer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { JobsGateway } from '../jobs/jobs.gateway';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job]), JobsModule], 
  providers: [QueueConsumer, JobsGateway], 
  exports: [QueueConsumer], 
})
export class QueueModule {}
