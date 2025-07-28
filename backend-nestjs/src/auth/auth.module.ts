import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEntity } from './entities/auth.entity';
import { ChatMessageEntity } from 'src/chat/entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ UsersEntity, ChatMessageEntity ]),
    JwtModule.register({
      secret: "abc123def", // keep it into .env file
      // signOptions: {
      //   expiresIn: ""
      // }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
