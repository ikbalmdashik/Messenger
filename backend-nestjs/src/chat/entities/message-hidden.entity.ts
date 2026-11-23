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
 * "Delete for me": the message stays for everyone
 * else but is hidden from this user's view.
 */
@Entity("message_hidden")
@Unique(
  "UQ_message_hidden_message_user",
  ["messageId", "userId"],
)
@Index(
  "IDX_message_hidden_user",
  ["userId"],
)
export class MessageHiddenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  userId: number;

  @ManyToOne(
    () => ChatMessageEntity,
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
