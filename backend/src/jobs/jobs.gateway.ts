import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from '../jobs/job.entity';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class JobsGateway {
  @WebSocketServer()
  private server: Server;

  private logger = new Logger(JobsGateway.name);

  sendJobUpdate(job: Job) {
    this.server.emit('jobUpdate', {
      jobId: job.id,
      status: job.status,
      processedEmails: job.processedEmails,
      totalEmails: job.totalEmails,
    });
    this.logger.log(`Emitted update for job ${job.id}`);
  }

  sendJobCreated(job: Job) {
    this.server.emit('jobCreated', job); 
    this.logger.log(`Emitted new job created event for ${job.id}`);
  }
}
