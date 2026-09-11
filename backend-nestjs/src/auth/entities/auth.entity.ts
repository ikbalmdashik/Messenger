import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  UpdateDateColumn,
} from "typeorm";

import { ChatMessageEntity } from "@/chat/entities/chat.entity";

/*
 * ============================================================
 * USERS
 * ============================================================
 */

@Entity("users")
export class UsersEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({
    unique: true,
    nullable: true,
  })
  @Index()
  publicId: string;

  @Column()
  role: string;

  @Column({
    default: false,
  })
  isEmailVerified: boolean;

  /**
   * Messages sent by this user.
   *
   * There is no receivedMessages relationship anymore.
   *
   * In the new conversation architecture, received messages
   * are determined through:
   *
   * Conversation
   *      ↓
   * ConversationParticipant
   *      ↓
   * User
   */
  @OneToMany(
    () => ChatMessageEntity,
    (chat) => chat.sender,
  )
  sentMessages: ChatMessageEntity[];

  /**
   * User login sessions.
   */
  @OneToMany(
    () => UserSessionEntity,
    (session) => session.user,
  )
  sessions: UserSessionEntity[];
}

/*
 * ============================================================
 * AUTH TOKENS
 * ============================================================
 */

@Entity("auth_tokens")
export class AuthTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({
    unique: true,
  })
  token: string;

  @Column()
  usedFor: string;

  @Column()
  expiresAt: Date;

  @Column({
    default: false,
  })
  used: boolean;

  @Column()
  createdAt: Date;
}

/*
 * ============================================================
 * OTP
 * ============================================================
 */

export enum OtpType {
  FORGOT_PASSWORD = "FORGOT_PASSWORD",
}

@Entity("auth_otps")
@Index(
  "IDX_USER_OTP_LOOKUP",
  [
    "userId",
    "usedFor",
    "isUsed",
    "expiresAt",
  ],
)
export class AuthOtpEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "int",
  })
  userId: number;

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

  @Column({
    length: 255,
  })
  otpHash: string;

  @Column()
  usedFor: string;

  @Column({
    type: "timestamp with time zone",
  })
  expiresAt: Date;

  @Column({
    default: false,
  })
  isUsed: boolean;

  @Column({
    default: 0,
  })
  attempts: number;

  @Column({
    nullable: true,
  })
  ipAddress?: string;

  @CreateDateColumn({
    type: "timestamp with time zone",
  })
  createdAt: Date;
}

/*
 * ============================================================
 * USER SESSIONS
 * ============================================================
 */

export enum SessionStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

@Entity("user_sessions")
export class UserSessionEntity {
  @PrimaryGeneratedColumn()
  sessionId: number;

  @Column()
  userId: number;

  @ManyToOne(
    () => UsersEntity,
    (user) => user.sessions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({
    name: "userId",
  })
  user: UsersEntity;

  /**
   * Unique identifier for the JWT/session.
   *
   * Prefer storing a JTI or SHA-256 token hash here.
   */
  @Column({
    unique: true,
  })
  @Index()
  tokenIdentifier: string;

  /**
   * Device/browser information.
   */
  @Column({
    nullable: true,
  })
  deviceInfo: string;

  /**
   * IP address used by the session.
   */
  @Column({
    nullable: true,
  })
  ipAddress: string;

  /**
   * Current session status.
   */
  @Column({
    type: "enum",
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  /**
   * Session expiration time.
   */
  @Column({
    type: "timestamp",
  })
  expiresAt: Date;

  /**
   * Last time this session was active.
   */
  @Column({
    type: "timestamp",
    nullable: true,
  })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}