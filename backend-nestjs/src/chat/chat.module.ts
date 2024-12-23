import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageEntity, ChatsEntityDemo } from './entities/chat.entity';
import { ChatGateway } from './chat.getway';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageEntity, ChatsEntityDemo])],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
