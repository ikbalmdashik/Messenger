import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthTokenEntity, UsersEntity } from './entities/auth.entity';
import { ChatMessageEntity } from 'src/chat/entities/chat.entity';
import { MailService } from 'src/mailer/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ UsersEntity, ChatMessageEntity, AuthTokenEntity ]),
    JwtModule.register({
      secret: "abc123def", // keep it into .env file
      // signOptions: {
      //   expiresIn: ""
      // }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
})
export class AuthModule {}
