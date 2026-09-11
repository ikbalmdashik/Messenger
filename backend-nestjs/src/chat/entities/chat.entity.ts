import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UsersEntity } from "@/auth/entities/auth.entity";
import { ConversationEntity } from "../conversation/entities/conversation.entity";

@Entity("chat_messages")
@Index(
  ["conversationId", "createdAt"],
)
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  messageId: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  @ManyToOne(
    () => UsersEntity,
    (user) =>
      user.sentMessages,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "senderId",
  })
  sender: UsersEntity;

  @ManyToOne(
    () => ConversationEntity,
    (conversation) =>
      conversation.messages,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "conversationId",
  })
  conversation: ConversationEntity;

  @Column()
  message: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}