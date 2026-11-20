import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { ConversationParticipantEntity } from "./conversation-participant.entity";
import { ChatMessageEntity } from "../../entities/chat.entity";

export type ConversationType =
  | "DIRECT"
  | "GROUP";

/**
 * Who may perform an action in a group.
 */
export type PermissionLevel =
  | "ALL"
  | "ADMINS";

export interface GroupPermissions {
  addMembers: PermissionLevel;
  editInfo: PermissionLevel;
  sendMessages: PermissionLevel;
}

export const DEFAULT_GROUP_PERMISSIONS: GroupPermissions =
  {
    addMembers: "ADMINS",
    editInfo: "ADMINS",
    sendMessages: "ALL",
  };

@Entity("conversations")
@Index(
  "UQ_conversations_direct_key",
  ["directKey"],
  {
    unique: true,
    where: `"directKey" IS NOT NULL`,
  },
)
export class ConversationEntity {
  @PrimaryGeneratedColumn()
  conversationId: number;

  @Column({
    type: "varchar",
    length: 20,
    default: "DIRECT",
  })
  type: ConversationType;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  name: string | null;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
  })
  directKey: string | null;

  @Column({
    type: "varchar",
    length: 500,
    nullable: true,
  })
  description: string | null;

  @Column({
    type: "integer",
    nullable: true,
  })
  createdById: number | null;

  /**
   * GROUP only. Null means defaults.
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  permissions: GroupPermissions | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => ConversationParticipantEntity,
    (participant) =>
      participant.conversation,
  )
  participants: ConversationParticipantEntity[];

  @OneToMany(
    () => ChatMessageEntity,
    (message) =>
      message.conversation,
  )
  messages: ChatMessageEntity[];
}