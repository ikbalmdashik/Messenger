import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UsersEntity } from "@/auth/entities/auth.entity";
import { ConversationEntity } from "../conversation/entities/conversation.entity";
import { MessageReactionEntity } from "./message-reaction.entity";

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

  /**
   * sent      -> saved, recipient offline
   * delivered -> recipient had an active connection
   * seen      -> recipient opened the conversation
   */
  @Column()
  status: string;

  /**
   * Message this one replies to (if any).
   */
  @Column({
    type: "integer",
    nullable: true,
  })
  replyToMessageId: number | null;

  @ManyToOne(
    () => ChatMessageEntity,
    {
      onDelete: "SET NULL",
      nullable: true,
    },
  )
  @JoinColumn({
    name: "replyToMessageId",
  })
  replyTo: ChatMessageEntity | null;

  /**
   * Set when the sender edits the text.
   */
  @Column({
    type: "timestamp",
    nullable: true,
  })
  editedAt: Date | null;

  /**
   * Soft delete ("unsend for everyone").
   * The text is wiped when this is set.
   */
  @Column({
    type: "boolean",
    default: false,
  })
  isDeleted: boolean;

  @OneToMany(
    () => MessageReactionEntity,
    (reaction) => reaction.message,
  )
  reactions: MessageReactionEntity[];

  @CreateDateColumn()
  createdAt: Date;
}