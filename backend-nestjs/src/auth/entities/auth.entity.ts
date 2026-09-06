import { ChatMessageEntity } from "src/chat/entities/chat.entity";
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index, ManyToOne,
  UpdateDateColumn } from "typeorm";

export class Auth { }

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

  @Column()
  role: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  // Messages sent by the user
  @OneToMany(() => ChatMessageEntity, chat => chat.sender)
  @JoinColumn({ name: "sendMessages" })
  sentMessages: ChatMessageEntity[];

  // Messages received by the user
  @OneToMany(() => ChatMessageEntity, chat => chat.receiver)
  @JoinColumn({ name: "receiveMessages" })
  receivedMessages: ChatMessageEntity[];

  @OneToMany(() => UserSessionEntity, (session) => session.user)
  sessions: UserSessionEntity[];
}


@Entity('auth_tokens')
export class AuthTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ unique: true })
  token: string;

  @Column()
  usedFor: String;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column()
  createdAt: Date;
}

export enum OtpType {
  FORGOT_PASSWORD = "FORGOT_PASSWORD",
}

@Entity("auth_otps")
export class AuthOtpEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  otpHash: string;

  @Column({
    type: "enum",
    enum: OtpType,
  })
  type: OtpType;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

@Entity('user_sessions')
export class UserSessionEntity {
  @PrimaryGeneratedColumn()
  sessionId: number;

  @Column()
  userId: number;

  @ManyToOne(() => UsersEntity, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UsersEntity;

  // Stores the unique JWT ID (jti claim) or SHA-256 hash of the token
  @Column({ unique: true })
  @Index()
  tokenIdentifier: string;

  // Session metadata for device management
  @Column({ nullable: true })
  deviceInfo: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}