import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  In,
  Repository,
} from "typeorm";

import { ChatMessageEntity } from "./entities/chat.entity";
import { MessageReactionEntity } from "./entities/message-reaction.entity";

import { ConversationService } from "./conversation/conversation.service";

import { ConversationParticipantEntity } from "./conversation/entities/conversation-participant.entity";

import { UsersEntity } from "@/auth/entities/auth.entity";

export const MAX_MESSAGE_LENGTH = 5000;

const MAX_PAGE_SIZE = 100;

export interface MessageReaction {
  userId: number;
  emoji: string;
}

export interface ReplyPreview {
  messageId: number;
  senderId: number;
  message: string;
  isDeleted: boolean;
}

/**
 * Shape every message has when it leaves the server
 * (REST responses and socket events).
 */
export interface SerializedMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  message: string;
  status: string;
  createdAt: Date;
  editedAt: Date | null;
  isDeleted: boolean;
  replyTo: ReplyPreview | null;
  reactions: MessageReaction[];
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,

    @InjectRepository(
      ConversationParticipantEntity,
    )
    private readonly participantRepository: Repository<ConversationParticipantEntity>,

    @InjectRepository(MessageReactionEntity)
    private readonly reactionRepository: Repository<MessageReactionEntity>,

    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,

    private readonly conversationService: ConversationService,

    private readonly dataSource: DataSource,
  ) {}

  /* ==========================================================
     SERIALIZATION
  ========================================================== */

  /**
   * Attach reply previews and reactions to messages.
   */
  async serializeMessages(
    messages: ChatMessageEntity[],
  ): Promise<SerializedMessage[]> {
    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map(
      (message) => message.messageId,
    );

    const replyIds = [
      ...new Set(
        messages
          .map(
            (message) =>
              message.replyToMessageId,
          )
          .filter(
            (id): id is number =>
              id !== null &&
              id !== undefined,
          ),
      ),
    ];

    const [reactions, replies] =
      await Promise.all([
        this.reactionRepository.find({
          where: {
            messageId: In(messageIds),
          },
          order: {
            createdAt: "ASC",
          },
        }),

        replyIds.length > 0
          ? this.messageRepository.find({
              where: {
                messageId: In(replyIds),
              },
            })
          : Promise.resolve(
              [] as ChatMessageEntity[],
            ),
      ]);

    const reactionsByMessage =
      new Map<number, MessageReaction[]>();

    for (const reaction of reactions) {
      const list =
        reactionsByMessage.get(
          reaction.messageId,
        ) ?? [];

      list.push({
        userId: reaction.userId,
        emoji: reaction.emoji,
      });

      reactionsByMessage.set(
        reaction.messageId,
        list,
      );
    }

    const repliesById = new Map(
      replies.map((reply) => [
        reply.messageId,
        reply,
      ]),
    );

    return messages.map((message) => {
      const reply =
        message.replyToMessageId
          ? repliesById.get(
              message.replyToMessageId,
            )
          : undefined;

      return {
        messageId: message.messageId,
        conversationId:
          message.conversationId,
        senderId: message.senderId,
        message: message.isDeleted
          ? ""
          : message.message,
        status: message.status,
        createdAt: message.createdAt,
        editedAt:
          message.editedAt ?? null,
        isDeleted: Boolean(
          message.isDeleted,
        ),
        replyTo: reply
          ? {
              messageId: reply.messageId,
              senderId: reply.senderId,
              message: reply.isDeleted
                ? ""
                : reply.message.slice(
                    0,
                    200,
                  ),
              isDeleted: Boolean(
                reply.isDeleted,
              ),
            }
          : null,
        reactions:
          reactionsByMessage.get(
            message.messageId,
          ) ?? [],
      };
    });
  }

  async serializeMessage(
    message: ChatMessageEntity,
  ): Promise<SerializedMessage> {
    const [serialized] =
      await this.serializeMessages([
        message,
      ]);

    return serialized;
  }

  /* ==========================================================
     READ
  ========================================================== */

  /**
   * Get messages belonging to a conversation.
   *
   * With limit/offset the newest `limit` messages
   * (skipping `offset` newest) are returned, in
   * oldest -> newest order. Without limit, all
   * messages are returned.
   */
  async GetConversation(
    userId: number,
    conversationId: number,
    limit?: number,
    offset?: number,
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

    const query = this.messageRepository
      .createQueryBuilder("chat")
      .where(
        "chat.conversationId = :conversationId",
        {
          conversationId:
            normalizedConversationId,
        },
      );

    const numericLimit = Number(limit);

    if (
      Number.isFinite(numericLimit) &&
      numericLimit > 0
    ) {
      const take = Math.min(
        Math.floor(numericLimit),
        MAX_PAGE_SIZE,
      );

      const skip = Math.max(
        0,
        Math.floor(Number(offset) || 0),
      );

      const page = await query
        .orderBy("chat.createdAt", "DESC")
        .addOrderBy(
          "chat.messageId",
          "DESC",
        )
        .skip(skip)
        .take(take)
        .getMany();

      return await this.serializeMessages(
        page.reverse(),
      );
    }

    const messages = await query
      .orderBy("chat.createdAt", "ASC")
      .addOrderBy("chat.messageId", "ASC")
      .getMany();

    return await this.serializeMessages(
      messages,
    );
  }

  /**
   * Get messages for a conversation after
   * verifying that the current user is a participant.
   */
  async GetMessages(
    userId: number,
    conversationId: number,
    limit?: number,
    offset?: number,
  ) {
    return await this.GetConversation(
      userId,
      conversationId,
      limit,
      offset,
    );
  }

  /* ==========================================================
     CREATE
  ========================================================== */

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
    replyToMessageId?: number | null,
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

    if (
      trimmedMessage.length >
      MAX_MESSAGE_LENGTH
    ) {
      throw new BadRequestException(
        `Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`,
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

    /*
     * A reply must point at a message
     * in the same conversation.
     */
    let normalizedReplyId: number | null =
      null;

    if (
      replyToMessageId !== undefined &&
      replyToMessageId !== null
    ) {
      const replyId = Number(
        replyToMessageId,
      );

      const replyTarget =
        Number.isFinite(replyId)
          ? await this.messageRepository.findOne(
              {
                where: {
                  messageId: replyId,
                },
              },
            )
          : null;

      if (
        !replyTarget ||
        replyTarget.conversationId !==
          normalizedConversationId
      ) {
        throw new BadRequestException(
          "The message you are replying to was not found.",
        );
      }

      normalizedReplyId =
        replyTarget.messageId;
    }

    const result =
      await this.dataSource.transaction(
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

              replyToMessageId:
                normalizedReplyId,

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
            savedMessage,

            recipientId: Number(
              recipientParticipant.userId,
            ),

            senderUnreadCount:
              senderParticipant.unreadCount,

            recipientUnreadCount:
              recipientParticipant.unreadCount,
          };
        },
      );

    return {
      message:
        await this.serializeMessage(
          result.savedMessage,
        ),

      senderId: normalizedUserId,

      recipientId: result.recipientId,

      senderUnreadCount:
        result.senderUnreadCount,

      recipientUnreadCount:
        result.recipientUnreadCount,
    };
  }

  /* ==========================================================
     EDIT / DELETE
  ========================================================== */

  private async getOwnMessage(
    userId: number,
    messageId: number,
  ) {
    const message =
      await this.messageRepository.findOne({
        where: {
          messageId: Number(messageId),
        },
      });

    if (!message) {
      throw new NotFoundException(
        "Message not found.",
      );
    }

    if (
      Number(message.senderId) !==
      Number(userId)
    ) {
      throw new ForbiddenException(
        "You can only change your own messages.",
      );
    }

    if (message.isDeleted) {
      throw new BadRequestException(
        "This message was deleted.",
      );
    }

    return message;
  }

  async EditMessage(
    userId: number,
    messageId: number,
    text: string,
  ) {
    const trimmed =
      typeof text === "string"
        ? text.trim()
        : "";

    if (!trimmed) {
      throw new BadRequestException(
        "Message cannot be empty.",
      );
    }

    if (
      trimmed.length > MAX_MESSAGE_LENGTH
    ) {
      throw new BadRequestException(
        `Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`,
      );
    }

    const message =
      await this.getOwnMessage(
        userId,
        messageId,
      );

    if (message.message === trimmed) {
      return await this.serializeMessage(
        message,
      );
    }

    message.message = trimmed;
    message.editedAt = new Date();

    const saved =
      await this.messageRepository.save(
        message,
      );

    return await this.serializeMessage(
      saved,
    );
  }

  /**
   * Unsend for everyone. The row stays so replies
   * and ordering keep working, but the text is wiped.
   */
  async DeleteMessage(
    userId: number,
    messageId: number,
  ) {
    const message =
      await this.getOwnMessage(
        userId,
        messageId,
      );

    message.isDeleted = true;
    message.message = "";

    await this.reactionRepository.delete({
      messageId: message.messageId,
    });

    const saved =
      await this.messageRepository.save(
        message,
      );

    return await this.serializeMessage(
      saved,
    );
  }

  /* ==========================================================
     REACTIONS
  ========================================================== */

  /**
   * Same emoji again -> remove.
   * Different emoji   -> replace.
   */
  async ToggleReaction(
    userId: number,
    messageId: number,
    emoji: string,
  ) {
    const normalizedEmoji =
      typeof emoji === "string"
        ? emoji.trim()
        : "";

    if (
      !normalizedEmoji ||
      normalizedEmoji.length > 16
    ) {
      throw new BadRequestException(
        "Invalid reaction.",
      );
    }

    const message =
      await this.messageRepository.findOne({
        where: {
          messageId: Number(messageId),
        },
      });

    if (!message || message.isDeleted) {
      throw new NotFoundException(
        "Message not found.",
      );
    }

    await this.conversationService.getConversationForUser(
      message.conversationId,
      Number(userId),
    );

    const existing =
      await this.reactionRepository.findOne({
        where: {
          messageId: message.messageId,
          userId: Number(userId),
        },
      });

    if (
      existing &&
      existing.emoji === normalizedEmoji
    ) {
      await this.reactionRepository.remove(
        existing,
      );
    } else if (existing) {
      existing.emoji = normalizedEmoji;

      await this.reactionRepository.save(
        existing,
      );
    } else {
      await this.reactionRepository.save(
        this.reactionRepository.create({
          messageId: message.messageId,
          userId: Number(userId),
          emoji: normalizedEmoji,
        }),
      );
    }

    return await this.serializeMessage(
      message,
    );
  }

  /* ==========================================================
     RECEIPTS
  ========================================================== */

  /**
   * Mark every message the other side sent in this
   * conversation as seen. Returns how many changed.
   */
  async MarkMessagesSeen(
    conversationId: number,
    readerId: number,
  ): Promise<number> {
    const result =
      await this.messageRepository
        .createQueryBuilder()
        .update(ChatMessageEntity)
        .set({ status: "seen" })
        .where(
          `"conversationId" = :conversationId`,
          {
            conversationId:
              Number(conversationId),
          },
        )
        .andWhere(
          `"senderId" != :readerId`,
          {
            readerId: Number(readerId),
          },
        )
        .andWhere(`"status" != 'seen'`)
        .execute();

    return result.affected ?? 0;
  }

  /**
   * When a user comes online, everything that was
   * waiting for them becomes "delivered".
   *
   * Returns the affected conversation IDs.
   */
  async MarkPendingDelivered(
    userId: number,
  ): Promise<number[]> {
    const rows: Array<{
      conversationId: number;
    }> = await this.dataSource.query(
      `
        UPDATE "chat_messages" AS m
        SET "status" = 'delivered'
        WHERE m."status" = 'sent'
          AND m."senderId" != $1
          AND m."conversationId" IN (
            SELECT p."conversationId"
            FROM "conversation_participants" p
            WHERE p."userId" = $1
          )
        RETURNING m."conversationId"
      `,
      [Number(userId)],
    ).then((result) =>
      // pg returns [rows, count] for UPDATE ... RETURNING
      Array.isArray(result?.[0])
        ? result[0]
        : result,
    );

    return [
      ...new Set(
        (rows ?? []).map((row) =>
          Number(row.conversationId),
        ),
      ),
    ];
  }

  /* ==========================================================
     PRESENCE
  ========================================================== */

  /**
   * Every user who shares at least one
   * conversation with userId.
   */
  async GetContactIds(
    userId: number,
  ): Promise<number[]> {
    const rows: Array<{ userId: number }> =
      await this.participantRepository
        .createQueryBuilder("other")
        .select(
          `DISTINCT other."userId"`,
          "userId",
        )
        .where(
          `other."conversationId" IN (
            SELECT mine."conversationId"
            FROM "conversation_participants" mine
            WHERE mine."userId" = :userId
          )`,
          {
            userId: Number(userId),
          },
        )
        .andWhere(
          `other."userId" != :userId`,
          {
            userId: Number(userId),
          },
        )
        .getRawMany();

    return rows.map((row) =>
      Number(row.userId),
    );
  }

  async SharesConversation(
    userId: number,
    otherUserId: number,
  ): Promise<boolean> {
    const contacts =
      await this.GetContactIds(userId);

    return contacts.includes(
      Number(otherUserId),
    );
  }

  async SetLastSeen(
    userId: number,
    at: Date,
  ) {
    await this.userRepository.update(
      {
        userId: Number(userId),
      },
      {
        lastSeenAt: at,
      },
    );
  }

  async GetLastSeen(
    userId: number,
  ): Promise<Date | null> {
    const user =
      await this.userRepository.findOne({
        where: {
          userId: Number(userId),
        },
        select: {
          userId: true,
          lastSeenAt: true,
        },
      });

    return user?.lastSeenAt ?? null;
  }
}
