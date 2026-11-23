import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.getway";
import { GroupController } from "./group/group.controller";
import { ChatActionsController } from "./chat-actions.controller";
import { GroupService } from "./group/group.service";
import { ConversationEntity } from "./conversation/entities/conversation.entity";

import { ChatMessageEntity } from "./entities/chat.entity";
import { MessageReactionEntity } from "./entities/message-reaction.entity";
import { MessageHiddenEntity } from "./entities/message-hidden.entity";
import { UsersEntity } from "@/auth/entities/auth.entity";

import { AuthModule } from "@/auth/auth.module";
import { ConversationModule } from "./conversation/conversation.module";
import { ConversationParticipantEntity } from "./conversation/entities/conversation-participant.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessageEntity,
      ConversationParticipantEntity,
      MessageReactionEntity,
      MessageHiddenEntity,
      UsersEntity,
      ConversationEntity,
    ]),

    AuthModule,

    ConversationModule,
  ],

  controllers: [
    ChatController,
    GroupController,
    ChatActionsController,
  ],

  providers: [
    ChatService,
    ChatGateway,
    GroupService,
  ],

  exports: [
    ChatService,
  ],
})
export class ChatModule {}