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

export interface UserAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  description?: string;
}

export interface UserSocialLink {
  platform: string;
  url: string;
}

/**
 * Extra contact info. Account email and phone
 * live in their own columns.
 */
export interface UserContact {
  website?: string;
  socials?: UserSocialLink[];
}

export type ProfileVisibility =
  | "EVERYONE"
  | "CONTACTS"
  | "ONLY_ME";

export interface UserPrivacy {
  /** Email, phone, website, social links */
  contact: ProfileVisibility;
  education: ProfileVisibility;
  /** City / state / country */
  location: ProfileVisibility;
}

export type GroupPermissionLevel = "ALL" | "ADMINS";

export interface GroupPermissionDefaults {
  addMembers: GroupPermissionLevel;
  editInfo: GroupPermissionLevel;
  sendMessages: GroupPermissionLevel;
}

export type GroupInviteLevel =
  | "EVERYONE"
  | "CONTACTS"
  | "NOBODY";

export interface UserGroupSettings {
  /** Permissions applied to groups this user creates */
  defaults: GroupPermissionDefaults;
  /** Who may add this user to a group */
  whoCanAddMe: GroupInviteLevel;
}

export const DEFAULT_GROUP_SETTINGS: UserGroupSettings = {
  defaults: {
    addMembers: "ADMINS",
    editInfo: "ADMINS",
    sendMessages: "ALL",
  },
  whoCanAddMe: "EVERYONE",
};

export const DEFAULT_PRIVACY: UserPrivacy = {
  contact: "CONTACTS",
  education: "EVERYONE",
  location: "EVERYONE",
};

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
   * Updated when the user's last socket disconnects.
   * Used for "last seen" in the chat header.
   */
  @Column({
    type: "timestamp",
    nullable: true,
  })
  lastSeenAt: Date | null;

  /**
   * Postal address. Only city/state/country
   * are shown on the public profile.
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  address: UserAddress | null;

  /**
   * Education history, newest first.
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  education: UserEducation[] | null;

  @Column({
    type: "jsonb",
    nullable: true,
  })
  contact: UserContact | null;

  /**
   * Who can see each profile section.
   * Null means DEFAULT_PRIVACY.
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  privacy: UserPrivacy | null;

  @Column({
    type: "jsonb",
    nullable: true,
  })
  groupSettings: UserGroupSettings | null;

  /**
   * Hidden from search / profiles and cannot be
   * messaged. Logging in again reactivates.
   */
  @Column({
    type: "boolean",
    default: false,
  })
  isDeactivated: boolean;

  @Column({
    type: "timestamp",
    nullable: true,
  })
  deactivatedAt: Date | null;

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