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

  /**
   * Suspended from sending messages until this
   * moment. GROUP: set by an admin. DIRECT: set
   * by the other person. Null / past = not
   * suspended.
   */
  @Column({
    type: "timestamp",
    nullable: true,
  })
  suspendedUntil: Date | null;

  @Column({
    type: "integer",
    nullable: true,
  })
  suspendedById: number | null;

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

/**
 * "Until lifted" suspensions are stored far in
 * the future.
 */
export const INDEFINITE_SUSPENSION_YEAR = 9999;

export const MAX_SUSPENSION_MINUTES = 60 * 24 * 365;

/**
 * Active suspension end, or null.
 */
export const activeSuspension = (
  participant:
    | Pick<ConversationParticipantEntity, "suspendedUntil">
    | null
    | undefined,
): Date | null => {
  const until = participant?.suspendedUntil
    ? new Date(participant.suspendedUntil)
    : null;

  return until && until.getTime() > Date.now()
    ? until
    : null;
};

/**
 * `durationMinutes`: positive number, or null /
 * 0 for "until lifted".
 */
export const suspensionEnd = (
  durationMinutes: unknown,
): Date => {
  if (
    durationMinutes === null ||
    durationMinutes === undefined ||
    Number(durationMinutes) === 0
  ) {
    return new Date(
      Date.UTC(INDEFINITE_SUSPENSION_YEAR, 11, 31),
    );
  }

  const minutes = Number(durationMinutes);

  if (
    !Number.isFinite(minutes) ||
    minutes < 1 ||
    minutes > MAX_SUSPENSION_MINUTES
  ) {
    return new Date(NaN);
  }

  return new Date(Date.now() + Math.round(minutes) * 60_000);
};

export const describeDuration = (
  durationMinutes: unknown,
) => {
  const minutes = Number(durationMinutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "until further notice";
  }

  const units: Array<[number, string]> = [
    [60 * 24 * 7, "week"],
    [60 * 24, "day"],
    [60, "hour"],
    [1, "minute"],
  ];

  for (const [size, name] of units) {
    if (minutes >= size && minutes % size === 0) {
      const count = minutes / size;

      return `for ${count} ${name}${count === 1 ? "" : "s"}`;
    }
  }

  return `for ${Math.round(minutes)} minutes`;
};
