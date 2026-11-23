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
import { MessageHiddenEntity } from "./entities/message-hidden.entity";

import { ConversationService } from "./conversation/conversation.service";

import {
  activeSuspension,
  ConversationParticipantEntity,
} from "./conversation/entities/conversation-participant.entity";

import { UsersEntity } from "@/auth/entities/auth.entity";
import { AuthService } from "@/auth/auth.service";

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
  type: string;
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

    @InjectRepository(MessageHiddenEntity)
    private readonly hiddenRepository: Repository<MessageHiddenEntity>,

    private readonly conversationService: ConversationService,

    private readonly authService: AuthService,

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
        type: message.type ?? "TEXT",
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

    const me =
      await this.participantRepository.findOne({
        where: {
          conversationId: normalizedConversationId,
          userId: normalizedUserId,
        },
      });

    const query = this.messageRepository
      .createQueryBuilder("chat")
      .where(
        "chat.conversationId = :conversationId",
        {
          conversationId:
            normalizedConversationId,
        },
      );

    /*
     * "Delete chat" hides everything before that
     * moment for this user only.
     */
    if (me?.clearedAt) {
      query.andWhere(
        "chat.createdAt > :clearedAt",
        { clearedAt: me.clearedAt },
      );
    }

    /*
     * "Delete for me" hides single messages.
     */
    query.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM "message_hidden" hidden
        WHERE hidden."messageId" = chat."messageId"
          AND hidden."userId" = :viewerId
      )`,
      { viewerId: normalizedUserId },
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

    if (
      await this.authService.IsDeactivated(
        normalizedUserId,
      )
    ) {
      throw new BadRequestException(
        "Your account is deactivated. Activate it to send messages.",
      );
    }

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
        replyTarget.type === "SYSTEM" ||
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

          const suspendedUntil =
            activeSuspension(senderParticipant);

          if (suspendedUntil) {
            throw new ForbiddenException(
              "You're suspended from sending messages in this chat.",
            );
          }

          const conversation =
            await this.conversationService.getConversationForUser(
              normalizedConversationId,
              normalizedUserId,
            );

          if (conversation.type === "DIRECT") {
            const other = participants.find(
              (participant) =>
                Number(participant.userId) !==
                normalizedUserId,
            );

            if (other) {
              if (
                await this.authService.IsBlockedEitherWay(
                  normalizedUserId,
                  Number(other.userId),
                )
              ) {
                throw new BadRequestException(
                  "You can't message this person.",
                );
              }

              const otherUser =
                await manager
                  .getRepository(UsersEntity)
                  .findOne({
                    where: { userId: Number(other.userId) },
                    select: { userId: true, isDeactivated: true },
                  });

              if (otherUser?.isDeactivated) {
                throw new BadRequestException(
                  "This account is deactivated.",
                );
              }
            }
          }

          /*
           * DIRECT: one other participant.
           * GROUP:  everyone else.
           */
          const recipientParticipants =
            participants.filter(
              (participant) =>
                Number(participant.userId) !==
                normalizedUserId,
            );

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
           * Every recipient now has one more
           * unread message.
           */
          for (const recipient of recipientParticipants) {
            recipient.unreadCount =
              Number(recipient.unreadCount || 0) +
              1;

            // A deleted chat comes back on new activity.
            recipient.isHidden = false;
          }

          senderParticipant.isHidden = false;

          await participantRepository.save([
            senderParticipant,
            ...recipientParticipants,
          ]);

          return {
            savedMessage,

            recipientIds:
              recipientParticipants.map(
                (participant) =>
                  Number(participant.userId),
              ),
          };
        },
      );

    return {
      message:
        await this.serializeMessage(
          result.savedMessage,
        ),

      senderId: normalizedUserId,

      recipientIds: result.recipientIds,
    };
  }

  /**
   * "Alice added Bob" style notice. Does not
   * change unread counts.
   */
  async CreateSystemMessage(
    conversationId: number,
    actorId: number,
    text: string,
  ): Promise<SerializedMessage> {
    await this.participantRepository.update(
      {
        conversationId: Number(conversationId),
        isHidden: true,
      },
      { isHidden: false },
    );

    const saved =
      await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: Number(conversationId),
          senderId: Number(actorId),
          message: text.slice(0, 500),
          type: "SYSTEM",
          status: "seen",
          createdAt: new Date(),
        }),
      );

    return await this.serializeMessage(saved);
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

    if (message.type === "SYSTEM") {
      throw new BadRequestException(
        "System messages can't be changed.",
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

  /**
   * Normalize a list of message ids from the client.
   */
  private normalizeMessageIds(
    messageIds: unknown,
  ): number[] {
    if (!Array.isArray(messageIds)) {
      throw new BadRequestException(
        "messageIds must be a list.",
      );
    }

    const ids = [
      ...new Set(
        messageIds
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) && id > 0,
          ),
      ),
    ];

    if (ids.length === 0) {
      throw new BadRequestException(
        "Select at least one message.",
      );
    }

    if (ids.length > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `You can delete up to ${MAX_PAGE_SIZE} messages at once.`,
      );
    }

    return ids;
  }

  /**
   * Load messages that all belong to one
   * conversation the user is part of.
   */
  private async getMessagesInOneConversation(
    userId: number,
    messageIds: number[],
  ) {
    const messages =
      await this.messageRepository.find({
        where: { messageId: In(messageIds) },
      });

    if (messages.length !== messageIds.length) {
      throw new NotFoundException(
        "Some messages were not found.",
      );
    }

    const conversationIds = new Set(
      messages.map((message) =>
        Number(message.conversationId),
      ),
    );

    if (conversationIds.size !== 1) {
      throw new BadRequestException(
        "Messages must be from the same chat.",
      );
    }

    const conversationId =
      Number(messages[0].conversationId);

    await this.conversationService.getConversationForUser(
      conversationId,
      Number(userId),
    );

    return { conversationId, messages };
  }

  /**
   * "Delete for me": hide messages from this
   * user's view only. Works on any message in a
   * chat the user belongs to.
   */
  async HideMessages(
    userId: number,
    messageIds: unknown,
  ) {
    const ids =
      this.normalizeMessageIds(messageIds);

    const { conversationId } =
      await this.getMessagesInOneConversation(
        userId,
        ids,
      );

    await this.hiddenRepository
      .createQueryBuilder()
      .insert()
      .into(MessageHiddenEntity)
      .values(
        ids.map((messageId) => ({
          messageId,
          userId: Number(userId),
        })),
      )
      .orIgnore()
      .execute();

    return { conversationId, messageIds: ids };
  }

  /**
   * "Delete for everyone" (unsend) for several
   * messages. Every message must be the user's own.
   */
  async DeleteMessages(
    userId: number,
    messageIds: unknown,
  ) {
    const ids =
      this.normalizeMessageIds(messageIds);

    const { messages } =
      await this.getMessagesInOneConversation(
        userId,
        ids,
      );

    const active = messages.filter(
      (message) => !message.isDeleted,
    );

    for (const message of active) {
      if (
        Number(message.senderId) !==
        Number(userId)
      ) {
        throw new ForbiddenException(
          "You can only unsend your own messages.",
        );
      }

      if (message.type === "SYSTEM") {
        throw new BadRequestException(
          "System messages can't be unsent.",
        );
      }
    }

    if (active.length === 0) {
      return [];
    }

    await this.reactionRepository.delete({
      messageId: In(
        active.map((message) => message.messageId),
      ),
    });

    for (const message of active) {
      message.isDeleted = true;
      message.message = "";
    }

    const saved =
      await this.messageRepository.save(active);

    return await this.serializeMessages(saved);
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

    // Custom reactions are allowed, but must be a
    // single emoji, not arbitrary text.
    const isEmoji =
      /^(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Component}‍️⃣])+$/u.test(
        normalizedEmoji,
      ) &&
      /[\p{Extended_Pictographic}\p{Regional_Indicator}⃣]/u.test(
        normalizedEmoji,
      );

    if (
      !normalizedEmoji ||
      normalizedEmoji.length > 16 ||
      !isEmoji
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

    if (
      !message ||
      message.isDeleted ||
      message.type === "SYSTEM"
    ) {
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
