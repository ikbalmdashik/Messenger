import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { ConversationEntity } from "./conversation.entity";
import { UsersEntity } from "@/auth/entities/auth.entity";

@Entity("conversation_participants")
@Unique(
  "UQ_conversation_participants_conversation_user",
  [
    "conversationId",
    "userId",
  ],
)
@Index(
  "IDX_conversation_participants_user",
  ["userId"],
)
@Index(
  "IDX_conversation_participants_conversation",
  ["conversationId"],
)
export class ConversationParticipantEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  userId: number;

  @Column({
    type: "integer",
    default: 0,
  })
  unreadCount: number;

  @ManyToOne(
    () => ConversationEntity,
    (conversation) =>
      conversation.participants,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "conversationId",
  })
  conversation: ConversationEntity;

  @ManyToOne(
    () => UsersEntity,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "userId",
  })
  user: UsersEntity;
}