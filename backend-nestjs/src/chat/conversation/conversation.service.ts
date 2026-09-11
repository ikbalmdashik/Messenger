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

    if (!targetUser) {
      throw new NotFoundException("User not found.");
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
   * Check whether a user belongs to a conversation.
   */
  async isParticipant(
    conversationId: number,
    userId: number,
  ): Promise<boolean> {
    if (
      !Number.isInteger(Number(conversationId)) ||
      !Number.isInteger(Number(userId))
    ) {
      return false;
    }

    const participant =
      await this.participantRepository.findOne({
        where: {
          conversationId: Number(conversationId),
          userId: Number(userId),
        },
      });

    return !!participant;
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
   * Return all conversations belonging to the current user.
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

    // STEP 1: Find my participant rows
    const myParticipants =
      await this.participantRepository.find({
        where: {
          userId: currentUserId,
        },
        relations: {
          conversation: true,
        },
      });


    if (myParticipants.length === 0) {
      console.log(
        "NO PARTICIPANT ROW FOUND FOR USER:",
        currentUserId,
      );

      return [];
    }

    const conversations = [];

    for (const myParticipant of myParticipants) {

      const conversation =
        myParticipant.conversation;

      if (!conversation) {
        console.log(
          "NO CONVERSATION RELATION:",
          myParticipant,
        );
        continue;
      }

      if (conversation.type !== "DIRECT") {
        continue;
      }

      // STEP 2: Get ALL participants in this conversation
      const participants =
        await this.participantRepository.find({
          where: {
            conversationId:
              conversation.conversationId,
          },
          relations: {
            user: true,
          },
        });

      // STEP 3: Find the other user
      const otherParticipant =
        participants.find(
          (participant) =>
            Number(participant.userId) !==
            currentUserId,
        );

      if (!otherParticipant) {
        console.log(
          "NO OTHER PARTICIPANT FOUND",
        );
        continue;
      }

      if (!otherParticipant.user) {
        console.log(
          "OTHER PARTICIPANT HAS NO USER RELATION",
        );
        continue;
      }

      // STEP 4: Find latest message
      const lastMessage =
        await this.dataSource
          .getRepository(ChatMessageEntity)
          .createQueryBuilder("message")
          .where(
            "message.conversationId = :conversationId",
            {
              conversationId:
                conversation.conversationId,
            },
          )
          .orderBy(
            "message.createdAt",
            "DESC",
          )
          .getOne();

      conversations.push({
        conversationId:
          conversation.conversationId,

        userId:
          otherParticipant.user.userId,

        fullName:
          otherParticipant.user.fullName,

        email:
          otherParticipant.user.email,

        publicId:
          otherParticipant.user.publicId,

        isEmailVerified:
          otherParticipant.user.isEmailVerified,

        lastMessage:
          lastMessage?.message ?? null,

        lastMessageAt:
          lastMessage?.createdAt ?? null,

        lastMessageSenderId:
          lastMessage?.senderId ?? null,

        unreadCount:
          myParticipant.unreadCount ?? 0,

        updatedAt:
          conversation.updatedAt,
      });
    }

    conversations.sort((a, b) => {
      const dateA = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : new Date(a.updatedAt).getTime();

      const dateB = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : new Date(b.updatedAt).getTime();

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


  async getConversationSidebarUser(
    conversationId: number,
    currentUserId: number,
  ) {
    const participants =
      await this.getParticipants(
        conversationId,
        currentUserId,
      );

    const currentParticipant =
      participants.find(
        (participant) =>
          Number(participant.userId) ===
          Number(currentUserId),
      );

    const otherParticipant =
      participants.find(
        (participant) =>
          Number(participant.userId) !==
          Number(currentUserId),
      );

    if (
      !otherParticipant ||
      !otherParticipant.user
    ) {
      return null;
    }

    const user =
      otherParticipant.user;

    /*
     * Find latest message.
     */
    const lastMessage =
      await this.dataSource
        .getRepository(ChatMessageEntity)
        .createQueryBuilder("message")
        .where(
          "message.conversationId = :conversationId",
          {
            conversationId:
              Number(conversationId),
          },
        )
        .orderBy(
          "message.createdAt",
          "DESC",
        )
        .getOne();

    return {
      conversationId:
        Number(conversationId),

      userId:
        user.userId,

      fullName:
        user.fullName,

      email:
        user.email,

      publicId:
        user.publicId,

      isEmailVerified:
        user.isEmailVerified,

      lastMessage:
        lastMessage?.message ?? null,

      lastMessageAt:
        lastMessage?.createdAt ?? null,

      lastMessageSenderId:
        lastMessage?.senderId ?? null,

      unreadCount:
        currentParticipant?.unreadCount ??
        0,
    };
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


