import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService) => ({
         type: 'postgres', 
         url: configService.get('POSTGRES_URL'), 
         autoLoadEntities: true, synchronize: true
        }),
      
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService) => ({
         uri: configService.get('MONGO_URL'),
        }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
