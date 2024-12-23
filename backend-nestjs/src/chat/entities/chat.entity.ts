import { UsersEntity } from 'src/auth/entities/auth.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity("Chats")
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  chatId: number;

  @Column({ name: "senderId" })
  senderId: number;

  @Column({ name: "receiverId" })
  receiverId: number

  // Relationship to the sender
  @ManyToOne(() => UsersEntity, user => user.sentMessages)
  @JoinColumn({ name: "senderId" })
  sender: UsersEntity;

  // Relationship to the receiver
  @ManyToOne(() => UsersEntity, user => user.receivedMessages)
  @JoinColumn({ name: "receiverId" })
  receiver: UsersEntity;

  @Column()
  message: string;

  @Column()
  status: string;

  @Column()
  createdAt: string;
}

@Entity("ChatsDemo")
export class ChatsEntityDemo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userName: string;

  @Column()
  message: string;

  @Column()
  createdAt: string;
}