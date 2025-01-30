import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Job } from '../jobs/job.entity';

const isProduction = process.env.NODE_ENV === 'production';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    ...(isProduction
      ? [] 
      : [TypeOrmModule.forFeature([Job])]),
  ],
  providers: [
    isProduction
      ? {
          provide: 'DYNAMODB_CLIENT',
          useFactory: () => {
            const client = new DynamoDBClient({
              region: process.env.AWS_REGION,
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
              },
            });
            return DynamoDBDocumentClient.from(client);
          },
        }
      : {
          provide: 'DATABASE_CONNECTION',
          useFactory: async () =>
            TypeOrmModule.forRoot({
              type: 'postgres',
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT) || 5432,
              username: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASS || 'password',
              database: process.env.DB_NAME || 'fena_task',
              autoLoadEntities: true,
              synchronize: true,
            }),
        },
  ],
  exports: isProduction ? ['DYNAMODB_CLIENT'] : ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
