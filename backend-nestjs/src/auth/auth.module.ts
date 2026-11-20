import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthOtpEntity, AuthTokenEntity, UsersEntity, UserSessionEntity } from './entities/auth.entity';
import { UserBlockEntity } from './entities/user-block.entity';
import { ChatMessageEntity } from 'src/chat/entities/chat.entity';
import { MailService } from 'src/mailer/mail.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsersEntity,
      ChatMessageEntity,
      AuthTokenEntity,
      AuthOtpEntity,
      UserSessionEntity,
      UserBlockEntity,
    ]),

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),

  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtStrategy],
  exports: [PassportModule, JwtModule, JwtStrategy, AuthService]
})
export class AuthModule {}
