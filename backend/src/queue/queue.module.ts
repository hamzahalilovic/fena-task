import { Module } from '@nestjs/common';
import { QueueConsumer } from './queue.consumer';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  providers: [QueueConsumer],
})
export class QueueModule {}
