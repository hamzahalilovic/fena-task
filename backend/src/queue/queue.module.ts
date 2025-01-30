import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { QueueConsumer } from './queue.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [QueueConsumer],
  exports: [QueueConsumer],
})
export class QueueModule {}
