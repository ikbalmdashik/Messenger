import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

import { ConversationEntity } from "./entities/conversation.entity";
import { ConversationParticipantEntity } from "./entities/conversation-participant.entity";

import { UsersEntity } from "@/auth/entities/auth.entity";

import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConversationParticipantEntity,
      UsersEntity,
    ]),

    AuthModule,
  ],

  controllers: [
    ConversationController,
  ],

  providers: [
    ConversationService,
  ],

  exports: [
    ConversationService,
  ],
})
export class ConversationModule {}