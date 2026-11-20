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

import { UsersEntity } from "./auth.entity";

/**
 * blockerId blocked blockedId. Either direction
 * stops direct messages between the two.
 */
@Entity("user_blocks")
@Unique("UQ_user_blocks_pair", ["blockerId", "blockedId"])
@Index("IDX_user_blocks_blocked", ["blockedId"])
export class UserBlockEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blockerId: number;

  @Column()
  blockedId: number;

  @ManyToOne(() => UsersEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blockerId" })
  blocker: UsersEntity;

  @ManyToOne(() => UsersEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blockedId" })
  blocked: UsersEntity;

  @CreateDateColumn()
  createdAt: Date;
}
