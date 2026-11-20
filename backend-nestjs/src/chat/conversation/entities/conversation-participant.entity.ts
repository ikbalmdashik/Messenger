import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { ConversationEntity } from "./conversation.entity";
import { UsersEntity } from "@/auth/entities/auth.entity";

export type ParticipantRole =
  | "ADMIN"
  | "MEMBER";

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

  /**
   * Only meaningful for GROUP conversations.
   */
  @Column({
    type: "varchar",
    length: 20,
    default: "MEMBER",
  })
  role: ParticipantRole;

  @CreateDateColumn()
  joinedAt: Date;

  /**
   * "Delete chat" (for me): messages up to this
   * moment are no longer shown to this user.
   */
  @Column({
    type: "timestamp",
    nullable: true,
  })
  clearedAt: Date | null;

  /**
   * Hidden from this user's sidebar until the
   * next new message.
   */
  @Column({
    type: "boolean",
    default: false,
  })
  isHidden: boolean;

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