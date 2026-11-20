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

import { UsersEntity } from "@/auth/entities/auth.entity";
import { ChatMessageEntity } from "./chat.entity";

/**
 * One emoji reaction per user per message.
 *
 * Reacting with the same emoji again removes it,
 * reacting with a different emoji replaces it.
 */
@Entity("message_reactions")
@Unique(
  "UQ_message_reactions_message_user",
  ["messageId", "userId"],
)
@Index(
  "IDX_message_reactions_message",
  ["messageId"],
)
export class MessageReactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  userId: number;

  @Column({
    type: "varchar",
    length: 16,
  })
  emoji: string;

  @ManyToOne(
    () => ChatMessageEntity,
    (message) => message.reactions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "messageId",
  })
  message: ChatMessageEntity;

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

  @CreateDateColumn()
  createdAt: Date;
}
