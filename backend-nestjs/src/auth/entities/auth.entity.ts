import { ChatMessageEntity } from "src/chat/entities/chat.entity";
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index, ManyToOne,
  UpdateDateColumn,
  BeforeInsert
} from "typeorm";

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

  @Column({ unique: true, nullable: true })
  @Index()
  publicId: string;

  @Column()
  role: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  // Messages sent by the user
  @OneToMany(() => ChatMessageEntity, (chat) => chat.sender)
  sentMessages: ChatMessageEntity[];

  // Messages received by the user
  @OneToMany(() => ChatMessageEntity, (chat) => chat.receiver)
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

@Entity('auth_otps')
// Index for fast validation lookups
@Index('IDX_USER_OTP_LOOKUP', ['userId', 'usedFor', 'isUsed', 'expiresAt'])
export class AuthOtpEntity {
  @PrimaryGeneratedColumn('uuid') // 1. Use UUIDs instead of auto-incrementing integers
  id: string;

  @Column({ type: 'int' }) // Ensure explicit type if referencing User primary key
  userId: number;

  // Foreign Key Relationship (Optional but recommended for data integrity)
  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UsersEntity;

  @Column({ length: 255 })
  otpHash: string;

  @Column()
  usedFor: string;

  @Column({ type: 'timestamp with time zone' }) // 2. Explicit timezone-aware timestamp
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true }) // 3. Store requester IP to prevent brute-force attacks
  ipAddress?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
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