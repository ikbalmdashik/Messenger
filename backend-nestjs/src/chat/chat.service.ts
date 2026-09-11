import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  Repository,
} from "typeorm";

import { ChatMessageEntity } from "./entities/chat.entity";

import { ConversationService } from "./conversation/conversation.service";

import { ConversationParticipantEntity } from "./conversation/entities/conversation-participant.entity";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,

    @InjectRepository(
      ConversationParticipantEntity,
    )
    private readonly participantRepository: Repository<ConversationParticipantEntity>,

    private readonly conversationService: ConversationService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get messages belonging to a conversation.
   */
  async GetConversation(
    userId: number,
    conversationId: number,
  ) {
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

    const normalizedConversationId =
      Number(conversationId);

    const normalizedUserId =
      Number(userId);

    await this.conversationService.getConversationForUser(
      normalizedConversationId,
      normalizedUserId,
    );

    return await this.messageRepository
      .createQueryBuilder("chat")
      .where(
        "chat.conversationId = :conversationId",
        {
          conversationId:
            normalizedConversationId,
        },
      )
      .orderBy(
        "chat.createdAt",
        "ASC",
      )
      .getMany();
  }

  /**
   * Create a message and update unread count.
   *
   * senderId always comes from the authenticated
   * socket user. Never trust senderId from frontend.
   */
  async CreateChat(
    userId: number,
    conversationId: number,
    message: string,
    status: string,
  ) {
    if (
      conversationId === undefined ||
      conversationId === null ||
      !Number.isFinite(Number(conversationId))
    ) {
      throw new BadRequestException(
        "conversationId is required.",
      );
    }

    const normalizedUserId =
      Number(userId);

    const normalizedConversationId =
      Number(conversationId);

    const trimmedMessage =
      message?.trim();

    if (!trimmedMessage) {
      throw new BadRequestException(
        "Message cannot be empty.",
      );
    }

    /*
     * Verify that the sender belongs
     * to this conversation.
     */
    await this.conversationService.getConversationForUser(
      normalizedConversationId,
      normalizedUserId,
    );

    return await this.dataSource.transaction(
      async (manager) => {
        const messageRepository =
          manager.getRepository(
            ChatMessageEntity,
          );

        const participantRepository =
          manager.getRepository(
            ConversationParticipantEntity,
          );

        /*
         * Get all conversation participants.
         */
        const participants =
          await participantRepository.find({
            where: {
              conversationId:
                normalizedConversationId,
            },
          });

        if (participants.length === 0) {
          throw new BadRequestException(
            "Conversation has no participants.",
          );
        }

        const senderParticipant =
          participants.find(
            (participant) =>
              Number(participant.userId) ===
              normalizedUserId,
          );

        if (!senderParticipant) {
          throw new BadRequestException(
            "You are not a participant of this conversation.",
          );
        }

        /*
         * For DIRECT conversations there should
         * be one other participant.
         */
        const recipientParticipant =
          participants.find(
            (participant) =>
              Number(participant.userId) !==
              normalizedUserId,
          );

        if (!recipientParticipant) {
          throw new BadRequestException(
            "Recipient not found.",
          );
        }

        /*
         * Create message.
         */
        const chat =
          messageRepository.create({
            conversationId:
              normalizedConversationId,

            senderId:
              normalizedUserId,

            message:
              trimmedMessage,

            status:
              status || "sent",

            createdAt:
              new Date(),
          });

        const savedMessage =
          await messageRepository.save(
            chat,
          );

        /*
         * Sender has no unread messages.
         */
        senderParticipant.unreadCount = 0;

        /*
         * Recipient now has one more
         * unread message.
         */
        recipientParticipant.unreadCount =
          Number(
            recipientParticipant.unreadCount ||
              0,
          ) + 1;

        await participantRepository.save([
          senderParticipant,
          recipientParticipant,
        ]);

        return {
          message: savedMessage,

          senderId:
            normalizedUserId,

          recipientId:
            Number(
              recipientParticipant.userId,
            ),

          senderUnreadCount:
            senderParticipant.unreadCount,

          recipientUnreadCount:
            recipientParticipant.unreadCount,
        };
      },
    );
  }

  /**
   * Get messages for a conversation after
   * verifying that the current user is a participant.
   */
  async GetMessages(
    userId: number,
    conversationId: number,
  ) {
    return await this.GetConversation(
      userId,
      conversationId,
    );
  }
}