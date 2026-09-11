import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.getway";

import { ChatMessageEntity } from "./entities/chat.entity";

import { AuthModule } from "@/auth/auth.module";
import { ConversationModule } from "./conversation/conversation.module";
import { ConversationParticipantEntity } from "./conversation/entities/conversation-participant.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessageEntity,
      ConversationParticipantEntity
    ]),

    AuthModule,

    ConversationModule,
  ],

  controllers: [
    ChatController,
  ],

  providers: [
    ChatService,
    ChatGateway,
  ],

  exports: [
    ChatService,
  ],
})
export class ChatModule {}