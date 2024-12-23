import { ChatMessageEntity } from "src/chat/entities/chat.entity";
import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export class Auth {}

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

    // Messages sent by the user
    @OneToMany(() => ChatMessageEntity, chat => chat.sender)
    @JoinColumn({ name: "sendMessages" })
    sentMessages: ChatMessageEntity[];

    // Messages received by the user
    @OneToMany(() => ChatMessageEntity, chat => chat.receiver)
    @JoinColumn({ name: "receiveMessages" })
    receivedMessages: ChatMessageEntity[];
}
