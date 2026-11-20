import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { ConversationEntity } from "./entities/conversation.entity";
import { ConversationParticipantEntity } from "./entities/conversation-participant.entity";

import { UsersEntity } from "@/auth/entities/auth.entity";
import { ChatMessageEntity } from "../entities/chat.entity";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { AuthService } from "@/auth/auth.service";

export interface SidebarItem {
  conversationId: number;
  type: "DIRECT" | "GROUP";
  userId: number | null;
  fullName?: string;
  email?: string;
  publicId?: string;
  isEmailVerified?: boolean;
  name?: string;
  description?: string | null;
  memberCount?: number;
  myRole?: string;
  isDeactivated?: boolean;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  lastMessageSenderId: number | null;
  lastMessageSenderName: string | null;
  lastMessageType: string | null;
  unreadCount: number;
  updatedAt: Date;
}

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,

    @InjectRepository(ConversationParticipantEntity)
    private readonly participantRepository: Repository<ConversationParticipantEntity>,

    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,

    private readonly dataSource: DataSource,

    private readonly authService: AuthService,
  ) { }

  /**
   * Create a DIRECT conversation or return the existing one.
   *
   * The directKey guarantees that:
   *
   * 1:2 === 2:1
   *
   * Therefore two users can only have one direct conversation.
   */
  async createOrGetDirectConversation(
    currentUserId: number,
    dto: CreateConversationDto,
  ) {
    const userId = Number(currentUserId);
    const targetUserId = Number(dto.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException("Invalid authenticated user ID.");
    }

    if (!Number.isInteger(targetUserId) || targetUserId < 1) {
      throw new BadRequestException("Invalid target user ID.");
    }

    if (userId === targetUserId) {
      throw new BadRequestException(
        "You cannot create a conversation with yourself.",
      );
    }

    const targetUser = await this.usersRepository.findOne({
      where: {
        userId: targetUserId,
      },
    });

    if (!targetUser || targetUser.isDeactivated) {
      throw new NotFoundException("User not found.");
    }

    if (await this.authService.IsDeactivated(userId)) {
      throw new BadRequestException(
        "Your account is deactivated. Activate it to start chats.",
      );
    }

    if (
      await this.authService.IsBlockedEitherWay(
        userId,
        targetUserId,
      )
    ) {
      throw new BadRequestException(
        "You can't message this person.",
      );
    }

    const directKey =
      userId < targetUserId
        ? `${userId}:${targetUserId}`
        : `${targetUserId}:${userId}`;

    /*
     * First check whether the conversation already exists.
     */
    const existingConversation =
      await this.conversationRepository.findOne({
        where: {
          directKey,
        },
      });

    if (existingConversation) {
      await this.ensureParticipants(
        existingConversation.conversationId,
        userId,
        targetUserId,
      );

      return {
        conversationId: existingConversation.conversationId,
        type: existingConversation.type,
        isNew: false,
      };
    }

    /*
     * Create conversation + participants atomically.
     */
    try {
      const conversationId = await this.dataSource.transaction(
        async (manager) => {
          const conversationRepository =
            manager.getRepository(ConversationEntity);

          const participantRepository =
            manager.getRepository(ConversationParticipantEntity);

          const conversation = conversationRepository.create({
            type: "DIRECT",
            name: null,
            directKey,
          });

          const savedConversation =
            await conversationRepository.save(conversation);

          const participants = participantRepository.create([
            {
              conversationId: savedConversation.conversationId,
              userId,
            },
            {
              conversationId: savedConversation.conversationId,
              userId: targetUserId,
            },
          ]);

          await participantRepository.save(participants);

          return savedConversation.conversationId;
        },
      );

      return {
        conversationId,
        type: "DIRECT" as const,
        isNew: true,
      };
    } catch (error: any) {
      /*
       * PostgreSQL unique constraint violation.
       *
       * This can happen when two requests try to create the same
       * conversation at exactly the same time.
       */
      if (error?.code === "23505") {
        const existingConversation =
          await this.conversationRepository.findOne({
            where: {
              directKey,
            },
          });

        if (existingConversation) {
          return {
            conversationId: existingConversation.conversationId,
            type: existingConversation.type,
            isNew: false,
          };
        }
      }

      throw error;
    }
  }

  /**
   * Make sure both users belong to the conversation.
   */
  async ensureParticipants(
    conversationId: number,
    userId: number,
    targetUserId: number,
  ) {
    const conversation =
      await this.conversationRepository.findOne({
        where: {
          conversationId,
        },
      });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const existingParticipants =
      await this.participantRepository.find({
        where: {
          conversationId,
        },
      });

    const existingUserIds = new Set(
      existingParticipants.map(
        (participant) => participant.userId,
      ),
    );

    const missingUserIds = [
      userId,
      targetUserId,
    ].filter(
      (id) => !existingUserIds.has(id),
    );

    if (missingUserIds.length === 0) {
      return;
    }

    const newParticipants =
      this.participantRepository.create(
        missingUserIds.map((missingUserId) => ({
          conversationId,
          userId: missingUserId,
        })),
      );

    await this.participantRepository.save(
      newParticipants,
    );
  }

  /**
   * Get a conversation only if the current user belongs to it.
   */
  async getConversationForUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationEntity> {
    if (
      conversationId === undefined ||
      conversationId === null ||
      !Number.isFinite(Number(conversationId))
    ) {
      throw new BadRequestException(
        "conversationId is required.",
      );
    }

    if (
      userId === undefined ||
      userId === null ||
      !Number.isFinite(Number(userId))
    ) {
      throw new BadRequestException(
        "Authenticated user ID is required.",
      );
    }

    const participant =
      await this.participantRepository.findOne({
        where: {
          conversationId: Number(conversationId),
          userId: Number(userId),
        },
        relations: {
          conversation: true,
        },
      });

    if (!participant) {
      throw new NotFoundException(
        "Conversation not found.",
      );
    }

    if (!participant.conversation) {
      throw new NotFoundException(
        "Conversation not found.",
      );
    }

    return participant.conversation;
  }

  /**
   * Return all conversations (direct + group)
   * belonging to the current user, newest first.
   */
  async getUserConversations(userId: number) {
    const currentUserId = Number(userId);

    if (
      !Number.isInteger(currentUserId) ||
      currentUserId < 1
    ) {
      throw new BadRequestException(
        "Authenticated user ID is required.",
      );
    }

    const myParticipants =
      await this.participantRepository.find({
        where: {
          userId: currentUserId,
        },
      });

    const conversations: SidebarItem[] = [];

    for (const myParticipant of myParticipants) {
      if (myParticipant.isHidden) {
        continue;
      }

      const item =
        await this.getSidebarItem(
          myParticipant.conversationId,
          currentUserId,
        );

      if (item) {
        conversations.push(item);
      }
    }

    conversations.sort((a, b) => {
      const dateA = new Date(
        a.lastMessageAt ?? a.updatedAt,
      ).getTime();

      const dateB = new Date(
        b.lastMessageAt ?? b.updatedAt,
      ).getTime();

      return dateB - dateA;
    });

    return conversations;
  }

  /**
   * Get participants of a conversation.
   */
  async getParticipants(
    conversationId: number,
    userId: number,
  ) {
    await this.getConversationForUser(
      conversationId,
      userId,
    );

    return await this.participantRepository.find({
      where: {
        conversationId: Number(conversationId),
      },
      relations: {
        user: true,
      },
    });
  }

  /**
   * All participant user IDs (no membership check).
   */
  async getParticipantIds(
    conversationId: number,
  ): Promise<number[]> {
    const rows =
      await this.participantRepository.find({
        where: {
          conversationId: Number(conversationId),
        },
        select: {
          userId: true,
        },
      });

    return rows.map((row) => Number(row.userId));
  }

  /**
   * One sidebar row, as seen by `forUserId`.
   *
   * DIRECT: describes the other user.
   * GROUP:  describes the group.
   */
  async getSidebarItem(
    conversationId: number,
    forUserId: number,
  ): Promise<SidebarItem | null> {
    const participants =
      await this.participantRepository.find({
        where: {
          conversationId: Number(conversationId),
        },
        relations: {
          user: true,
          conversation: true,
        },
      });

    const me = participants.find(
      (participant) =>
        Number(participant.userId) ===
        Number(forUserId),
    );

    if (!me || !me.conversation || me.isHidden) {
      return null;
    }

    const conversation = me.conversation;

    const lastMessageQuery =
      this.dataSource
        .getRepository(ChatMessageEntity)
        .createQueryBuilder("message")
        .where(
          "message.conversationId = :conversationId",
          {
            conversationId:
              Number(conversationId),
          },
        );

    if (me.clearedAt) {
      lastMessageQuery.andWhere(
        "message.createdAt > :clearedAt",
        { clearedAt: me.clearedAt },
      );
    }

    const lastMessage =
      await lastMessageQuery
        .orderBy("message.createdAt", "DESC")
        .addOrderBy("message.messageId", "DESC")
        .getOne();

    const lastMessageText = lastMessage
      ? lastMessage.isDeleted
        ? "Message deleted"
        : lastMessage.message
      : null;

    const lastSender = lastMessage
      ? participants.find(
          (participant) =>
            Number(participant.userId) ===
            Number(lastMessage.senderId),
        )?.user
      : undefined;

    const base = {
      conversationId:
        conversation.conversationId,
      lastMessage: lastMessageText,
      lastMessageAt:
        lastMessage?.createdAt ?? null,
      lastMessageSenderId:
        lastMessage?.senderId ?? null,
      lastMessageSenderName:
        lastSender?.fullName ?? null,
      lastMessageType:
        lastMessage?.type ?? null,
      unreadCount: me.unreadCount ?? 0,
      updatedAt: conversation.updatedAt,
    };

    if (conversation.type === "GROUP") {
      return {
        ...base,
        type: "GROUP",
        userId: null,
        name: conversation.name ?? "Group",
        description:
          conversation.description ?? null,
        memberCount: participants.length,
        myRole: me.role ?? "MEMBER",
      };
    }

    const other = participants.find(
      (participant) =>
        Number(participant.userId) !==
        Number(forUserId),
    );

    if (!other?.user) {
      return null;
    }

    return {
      ...base,
      type: "DIRECT",
      userId: other.user.userId,
      fullName: other.user.fullName,
      email: other.user.email,
      publicId: other.user.publicId,
      isEmailVerified:
        other.user.isEmailVerified,
      isDeactivated: Boolean(
        other.user.isDeactivated,
      ),
    };
  }

  /**
   * "Delete chat" for one user. Other members keep
   * their full history; this user sees only what is
   * sent after now, and the chat leaves their
   * sidebar until then.
   */
  async deleteChatForMe(
    userId: number,
    conversationId: number,
  ) {
    const participant =
      await this.participantRepository.findOne({
        where: {
          conversationId: Number(conversationId),
          userId: Number(userId),
        },
      });

    if (!participant) {
      throw new NotFoundException(
        "Conversation not found.",
      );
    }

    participant.clearedAt = new Date();
    participant.isHidden = true;
    participant.unreadCount = 0;

    await this.participantRepository.save(
      participant,
    );

    return { success: true, conversationId: Number(conversationId) };
  }

  async deleteAllChatsForMe(userId: number) {
    const result =
      await this.participantRepository.update(
        { userId: Number(userId) },
        {
          clearedAt: new Date(),
          isHidden: true,
          unreadCount: 0,
        },
      );

    return { success: true, deleted: result.affected ?? 0 };
  }

  async markConversationAsRead(
    conversationId: number,
    userId: number,
  ) {
    const participant =
      await this.participantRepository.findOne({
        where: {
          conversation: {
            conversationId,
          },
          user: {
            userId,
          },
        },
      });

    if (!participant) {
      throw new NotFoundException(
        "Conversation participant not found.",
      );
    }

    participant.unreadCount = 0;

    await this.participantRepository.save(
      participant,
    );

    return participant;
  }
}


