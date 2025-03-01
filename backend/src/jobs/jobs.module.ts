import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsGateway } from './jobs.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [JobsController],
  providers: [JobsService, JobsGateway],
  exports: [JobsService, JobsGateway], 
})
export class JobsModule {}
