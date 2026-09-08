import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM PostgreSQL connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        // PostgreSQL connection URL
        url: configService.get<string>('DATABASE_URL'),

        // Don't automatically modify the database schema
        synchronize: false,

        // Automatically load entities registered with TypeOrmModule.forFeature()
        autoLoadEntities: true,

        // Enable TypeORM logging
        logging: true,

        // Entity files
        entities: ['dist/**/*.entity.js'],

        // Migration files
        migrations: ['dist/migrations/*.js'],
      }),

      inject: [ConfigService],
    }),

    ChatModule,
    AuthModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}