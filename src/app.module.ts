import { ColumnModule } from './column/column.module';
import { ProjectModule } from './projects/project.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { BoardModule } from './board/board.module';
import { TaskModule } from './task/task.module';
import { CommentModule } from './comment/comment.module';
import { AttachmentModule } from './attachment/attachment.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './notification/notification.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? 'test/.env.test' : '.env',
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL') || configService.get('POSTGRES_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ProjectModule,
    UsersModule,
    AuthModule,
    WorkspaceModule,
    BoardModule,
    ColumnModule,
    TaskModule,
    CommentModule,
    AttachmentModule,
    NotificationModule,
    ActivityModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService) => ({
        uri: configService.get('MONGO_URI') || configService.get('MONGO_URL'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}