import { ChatMessageEntity } from "src/chat/entities/chat.entity";
import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

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
  type: 'RESET_PASSWORD' | 'VERIFY_EMAIL';

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
