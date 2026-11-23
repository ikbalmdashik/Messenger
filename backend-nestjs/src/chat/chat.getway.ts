import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { JwtService } from "@nestjs/jwt";

import {
  Server,
  Socket,
} from "socket.io";

import {
  ChatService,
  SerializedMessage,
} from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";

import { ConversationService } from "./conversation/conversation.service";
import { canPerform } from "./group/group-permissions";

/**
 * How long a user may have zero sockets
 * before being reported offline.
 */
const OFFLINE_GRACE_MS = 4000;

interface JwtPayload {
  sub?: {
    user?: number;
  };
}

@WebSocketGateway({
  cors: {
    origin: true,

    methods: [
      "GET",
      "HEAD",
      "PUT",
      "PATCH",
      "POST",
      "DELETE",
      "OPTIONS",
    ],

    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,

    private readonly conversationService: ConversationService,

    private readonly jwtService: JwtService,
  ) {}

  /**
   * ==========================================
   * SOCKET CONNECTION
   * ==========================================
   *
   * Authenticate the socket using the
   * HTTP-only access_token cookie.
   *
   * After authentication, the socket joins:
   *
   * user:{userId}
   *
   * This personal room is used for:
   *
   * - sidebar updates
   * - unread count updates
   * - read-status updates
   * - multi-tab synchronization
   */
  async handleConnection(
    socket: Socket,
  ) {
    console.log(
      `Client connected: ${socket.id}`,
    );

    try {
      /*
       * Get access token from cookie.
       */
      const token =
        this.extractAccessToken(socket);

      if (!token) {
        console.error(
          `Socket authentication failed: no access_token cookie. Socket: ${socket.id}`,
        );

        socket.disconnect(true);

        return;
      }

      /*
       * Verify JWT.
       */
      const payload =
        this.jwtService.verify<JwtPayload>(
          token,
          {
            secret:
              process.env.JWT_SECRET,
          },
        );

      /*
       * Extract authenticated user ID.
       */
      const userId = Number(
        payload?.sub?.user,
      );

      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        console.error(
          `Socket authentication failed: invalid user ID. Socket: ${socket.id}`,
        );

        socket.disconnect(true);

        return;
      }

      /*
       * Store authenticated user ID
       * on the socket.
       *
       * The frontend cannot control this.
       */
      socket.data.userId = userId;

      /*
       * ======================================
       * PERSONAL USER ROOM
       * ======================================
       *
       * Example:
       *
       * user:1
       * user:2
       * user:3
       *
       * If User 1 has three browser tabs:
       *
       * user:1
       *   ├── socket A
       *   ├── socket B
       *   └── socket C
       *
       * Sending to user:1 therefore updates
       * all of the user's tabs.
       */
      await socket.join(
        `user:${userId}`,
      );

      console.log(
        `Socket authenticated. User ID: ${userId}, Socket: ${socket.id}`,
      );

      console.log(
        `Socket joined personal room: user:${userId}`,
      );

      /*
       * First connection for this user -> online.
       */
      const sockets =
        await this.server
          .in(`user:${userId}`)
          .fetchSockets();

      if (sockets.length === 1) {
        void this.handleUserOnline(userId);
      }
    } catch (error) {
      console.error(
        `Socket authentication failed: ${socket.id}`,
        error,
      );

      socket.disconnect(true);
    }
  }

  /**
   * ==========================================
   * EXTRACT ACCESS TOKEN
   * ==========================================
   */
  private extractAccessToken(
    socket: Socket,
  ): string | null {
    const cookieHeader =
      socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader
      .split(";")
      .map((cookie) =>
        cookie.trim(),
      );

    const accessTokenCookie =
      cookies.find((cookie) =>
        cookie.startsWith(
          "access_token=",
        ),
      );

    if (!accessTokenCookie) {
      return null;
    }

    const separatorIndex =
      accessTokenCookie.indexOf("=");

    if (separatorIndex === -1) {
      return null;
    }

    const token =
      accessTokenCookie
        .slice(separatorIndex + 1)
        .trim();

    if (!token) {
      return null;
    }

    return decodeURIComponent(token);
  }

  /**
   * ==========================================
   * SOCKET DISCONNECT
   * ==========================================
   */
  async handleDisconnect(
    socket: Socket,
  ) {
    const userId =
      Number(socket.data.userId);

    console.log(
      `Client disconnected: ${socket.id} | User: ${userId}`,
    );

    if (
      !Number.isFinite(userId) ||
      userId <= 0
    ) {
      return;
    }

    try {
      /*
       * Grace period: the frontend reconnects
       * its sockets when switching chats, so
       * wait briefly before going "offline".
       */
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          OFFLINE_GRACE_MS,
        ),
      );

      /*
       * The disconnected socket has already
       * left its rooms here.
       */
      const remaining =
        await this.server
          .in(`user:${userId}`)
          .fetchSockets();

      if (remaining.length > 0) {
        return;
      }

      const lastSeenAt = new Date();

      await this.chatService.SetLastSeen(
        userId,
        lastSeenAt,
      );

      await this.broadcastPresence(
        userId,
        false,
        lastSeenAt,
      );
    } catch (error) {
      console.error(
        "Presence offline error:",
        error,
      );
    }
  }

  /**
   * ==========================================
   * PRESENCE HELPERS
   * ==========================================
   */
  private async isUserOnline(
    userId: number,
  ): Promise<boolean> {
    const sockets =
      await this.server
        .in(`user:${userId}`)
        .fetchSockets();

    return sockets.length > 0;
  }

  /**
   * Tell everyone who shares a conversation
   * with this user that their presence changed.
   */
  private async broadcastPresence(
    userId: number,
    isOnline: boolean,
    lastSeenAt: Date | null,
  ) {
    const contactIds =
      await this.chatService.GetContactIds(
        userId,
      );

    if (contactIds.length === 0) {
      return;
    }

    this.server
      .to(
        contactIds.map(
          (id) => `user:${id}`,
        ),
      )
      .emit("presence_update", {
        userId,
        isOnline,
        lastSeenAt,
      });
  }

  private async handleUserOnline(
    userId: number,
  ) {
    try {
      await this.broadcastPresence(
        userId,
        true,
        null,
      );

      /*
       * Everything sent while this user was
       * offline is now delivered.
       */
      const conversationIds =
        await this.chatService.MarkPendingDelivered(
          userId,
        );

      for (const conversationId of conversationIds) {
        this.server
          .to(
            `conversation-${conversationId}`,
          )
          .emit("messages_delivered", {
            conversationId,
            recipientId: userId,
          });
      }
    } catch (error) {
      console.error(
        "Presence online error:",
        error,
      );
    }
  }

  private getSocketUserId(
    client: Socket,
  ): number | null {
    const userId = Number(
      client.data.userId,
    );

    return Number.isFinite(userId) &&
      userId > 0
      ? userId
      : null;
  }

  private errorResponse(
    error: unknown,
    fallback: string,
  ) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : fallback,
    };
  }

  /**
   * ==========================================
   * JOIN CONVERSATION ROOM
   * ==========================================
   *
   * Example:
   *
   * conversation-15
   */
  @SubscribeMessage("join_room")
  async HandleJoinRoom(
    @MessageBody()
    data: {
      conversationId: number;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        Number(client.data.userId);

      /*
       * Make sure socket is authenticated.
       */
      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      /*
       * Validate conversationId.
       */
      if (
        !data ||
        data.conversationId ===
          undefined ||
        data.conversationId ===
          null ||
        !Number.isFinite(
          Number(
            data.conversationId,
          ),
        )
      ) {
        return {
          success: false,
          message:
            "conversationId is required.",
        };
      }

      const conversationId =
        Number(
          data.conversationId,
        );

      /*
       * Verify that the authenticated
       * user belongs to the conversation.
       */
      await this.conversationService.getConversationForUser(
        conversationId,
        userId,
      );

      const room =
        `conversation-${conversationId}`;

      /*
       * Join conversation room.
       */
      await client.join(room);

      console.log(
        `${client.id} joined room: ${room} | User: ${userId}`,
      );

      return {
        success: true,

        conversationId,

        room,
      };
    } catch (error) {
      console.error(
        "Join conversation error:",
        error,
      );

      return {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to join conversation.",
      };
    }
  }

  /**
   * ==========================================
   * LEAVE CONVERSATION ROOM
   * ==========================================
   */
  @SubscribeMessage("leave_room")
  async HandleLeaveRoom(
    @MessageBody()
    data: {
      conversationId: number;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        Number(client.data.userId);

      /*
       * Make sure socket is authenticated.
       */
      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      /*
       * Validate conversationId.
       */
      if (
        !data ||
        data.conversationId ===
          undefined ||
        data.conversationId ===
          null ||
        !Number.isFinite(
          Number(
            data.conversationId,
          ),
        )
      ) {
        return {
          success: false,
          message:
            "conversationId is required.",
        };
      }

      const conversationId =
        Number(
          data.conversationId,
        );

      /*
       * Verify membership.
       */
      await this.conversationService.getConversationForUser(
        conversationId,
        userId,
      );

      const room =
        `conversation-${conversationId}`;

      /*
       * Leave conversation room.
       */
      await client.leave(room);

      console.log(
        `${client.id} left room: ${room} | User: ${userId}`,
      );

      return {
        success: true,

        conversationId,

        room,
      };
    } catch (error) {
      console.error(
        "Leave conversation error:",
        error,
      );

      return {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to leave conversation.",
      };
    }
  }

  /**
   * ==========================================
   * MARK CONVERSATION AS READ
   * ==========================================
   *
   * Frontend emits:
   *
   * socket.emit(
   *   "mark_conversation_read",
   *   {
   *     conversationId
   *   }
   * );
   *
   * Backend:
   *
   * unreadCount = 0
   *
   * Then all tabs belonging to the user
   * receive "conversation_read".
   */
  @SubscribeMessage(
    "mark_conversation_read",
  )
  async HandleMarkConversationRead(
    @MessageBody()
    data: {
      conversationId: number;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        Number(client.data.userId);

      /*
       * Make sure socket is authenticated.
       */
      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      /*
       * Validate conversationId.
       */
      if (
        !data ||
        data.conversationId ===
          undefined ||
        data.conversationId ===
          null ||
        !Number.isFinite(
          Number(
            data.conversationId,
          ),
        )
      ) {
        return {
          success: false,
          message:
            "conversationId is required.",
        };
      }

      const conversationId =
        Number(
          data.conversationId,
        );

      /*
       * SECURITY:
       *
       * Make sure the authenticated user
       * actually belongs to this conversation.
       */
      await this.conversationService.getConversationForUser(
        conversationId,
        userId,
      );

      /*
       * Set unreadCount = 0.
       */
      await this.conversationService.markConversationAsRead(
        conversationId,
        userId,
      );

      /*
       * Read receipts: the other side's
       * messages are now "seen".
       */
      const seenCount =
        await this.chatService.MarkMessagesSeen(
          conversationId,
          userId,
        );

      if (seenCount > 0) {
        this.server
          .to(
            `conversation-${conversationId}`,
          )
          .emit("messages_seen", {
            conversationId,
            readerId: userId,
          });
      }

      /*
       * Tell every tab/device belonging
       * to this user that this conversation
       * is now read.
       */
      this.server
        .to(`user:${userId}`)
        .emit(
          "conversation_read",
          {
            conversationId,

            unreadCount: 0,
          },
        );

      console.log(
        `Conversation marked as read | User: ${userId} | Conversation: ${conversationId}`,
      );

      return {
        success: true,

        conversationId,

        unreadCount: 0,
      };
    } catch (error) {
      console.error(
        "Mark conversation as read error:",
        error,
      );

      return {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to mark conversation as read.",
      };
    }
  }

  /**
   * ==========================================
   * SEND MESSAGE
   * ==========================================
   *
   * senderId is ALWAYS taken from:
   *
   * client.data.userId
   *
   * Never trust senderId from frontend.
   */
  @SubscribeMessage("send_message")
  async HandleMessage(
    @MessageBody()
    createChatDto: CreateChatDto,

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      /*
       * ======================================
       * AUTHENTICATED USER
       * ======================================
       */
      const userId =
        Number(client.data.userId);

      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      /*
       * ======================================
       * VALIDATE CONVERSATION ID
       * ======================================
       */
      if (
        !createChatDto ||
        createChatDto.conversationId ===
          undefined ||
        createChatDto.conversationId ===
          null ||
        !Number.isFinite(
          Number(
            createChatDto.conversationId,
          ),
        )
      ) {
        return {
          success: false,
          message:
            "conversationId is required.",
        };
      }

      /*
       * ======================================
       * VALIDATE MESSAGE
       * ======================================
       */
      if (
        typeof createChatDto.message !==
          "string" ||
        !createChatDto.message.trim()
      ) {
        return {
          success: false,
          message: "Message is required.",
        };
      }

      const conversationId =
        Number(
          createChatDto.conversationId,
        );

      /*
       * ======================================
       * VERIFY PARTICIPATION + PERMISSION
       * ======================================
       */
      const participants =
        await this.conversationService.getParticipants(
          conversationId,
          userId,
        );

      const me = participants.find(
        (participant) =>
          Number(participant.userId) === userId,
      );

      const conversation =
        me?.conversation ??
        (await this.conversationService.getConversationForUser(
          conversationId,
          userId,
        ));

      if (
        !canPerform(
          conversation,
          me,
          "sendMessages",
        )
      ) {
        return {
          success: false,
          message:
            "Only admins can send messages in this group.",
        };
      }

      /*
       * "delivered" when any recipient has an
       * active connection right now.
       */
      let anyRecipientOnline = false;

      for (const participant of participants) {
        if (
          Number(participant.userId) !== userId &&
          (await this.isUserOnline(
            Number(participant.userId),
          ))
        ) {
          anyRecipientOnline = true;
          break;
        }
      }

      const result =
        await this.chatService.CreateChat(
          userId,

          conversationId,

          createChatDto.message.trim(),

          anyRecipientOnline
            ? "delivered"
            : "sent",

          createChatDto.replyToMessageId ??
            null,
        );

      await this.broadcastNewMessage(
        result.message,
      );

      console.log(
        `Message sent | User: ${userId} | Conversation: ${conversationId} | Message: ${result.message.messageId}`,
      );

      return result.message;
    } catch (error) {
      console.error(
        "Send message error:",
        error,
      );

      return {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to send message.",
      };
    }
  }

  /**
   * ==========================================
   * BROADCAST HELPERS (also used by groups)
   * ==========================================
   */

  emitToUsers(
    userIds: number[],
    event: string,
    payload: unknown,
  ) {
    if (userIds.length === 0) {
      return;
    }

    this.server
      .to(userIds.map((id) => `user:${id}`))
      .emit(event, payload);
  }

  /**
   * Kick users' sockets out of a conversation
   * room (e.g. removed from a group).
   */
  removeUsersFromConversationRoom(
    userIds: number[],
    conversationId: number,
  ) {
    for (const id of userIds) {
      this.server
        .in(`user:${id}`)
        .socketsLeave(
          `conversation-${conversationId}`,
        );
    }
  }

  /**
   * Refresh every participant's sidebar row.
   */
  async emitSidebarUpdates(
    conversationId: number,
  ) {
    const participantIds =
      await this.conversationService.getParticipantIds(
        conversationId,
      );

    for (const participantId of participantIds) {
      const item =
        await this.conversationService.getSidebarItem(
          conversationId,
          participantId,
        );

      if (item) {
        this.server
          .to(`user:${participantId}`)
          .emit("conversation_updated", item);
      }
    }
  }

  /**
   * Deliver a new message to the open chat views
   * and update everyone's sidebar.
   */
  async broadcastNewMessage(
    message: SerializedMessage,
  ) {
    this.server
      .to(
        `conversation-${message.conversationId}`,
      )
      .emit("receive_message", message);

    await this.emitSidebarUpdates(
      message.conversationId,
    );
  }

  /**
   * ==========================================
   * TYPING INDICATOR
   * ==========================================
   *
   * Frontend emits:
   *
   * socket.emit("typing", {
   *   conversationId,
   *   isTyping: true | false,
   * });
   *
   * Only sockets that already joined the
   * conversation room (membership verified in
   * join_room) can broadcast, so no DB hit
   * per keystroke.
   */
  @SubscribeMessage("typing")
  HandleTyping(
    @MessageBody()
    data: {
      conversationId: number;
      isTyping: boolean;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    const userId =
      this.getSocketUserId(client);

    const conversationId = Number(
      data?.conversationId,
    );

    if (
      !userId ||
      !Number.isFinite(conversationId)
    ) {
      return { success: false };
    }

    const room =
      `conversation-${conversationId}`;

    if (!client.rooms.has(room)) {
      return { success: false };
    }

    client.to(room).emit("typing", {
      conversationId,
      userId,
      isTyping: Boolean(data?.isTyping),
    });

    return { success: true };
  }

  /**
   * ==========================================
   * PRESENCE LOOKUP
   * ==========================================
   *
   * Used when a conversation is opened to show
   * "Online" / "Last seen ..." immediately.
   */
  @SubscribeMessage("get_presence")
  async HandleGetPresence(
    @MessageBody()
    data: {
      userId: number;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        this.getSocketUserId(client);

      const targetId = Number(
        data?.userId,
      );

      if (
        !userId ||
        !Number.isFinite(targetId)
      ) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      const allowed =
        await this.chatService.SharesConversation(
          userId,
          targetId,
        );

      if (!allowed) {
        return {
          success: false,
          message:
            "No shared conversation.",
        };
      }

      const isOnline =
        await this.isUserOnline(targetId);

      return {
        success: true,
        userId: targetId,
        isOnline,
        lastSeenAt: isOnline
          ? null
          : await this.chatService.GetLastSeen(
              targetId,
            ),
      };
    } catch (error) {
      return this.errorResponse(
        error,
        "Unable to load presence.",
      );
    }
  }

  /**
   * Broadcast a changed message to everyone
   * viewing its conversation.
   */
  private emitMessageUpdated(
    message: SerializedMessage,
  ) {
    this.server
      .to(
        `conversation-${message.conversationId}`,
      )
      .emit("message_updated", message);
  }

  /**
   * After an edit/unsend the sidebar preview may
   * show the old text; refresh it.
   */
  private refreshSidebarsQuietly(
    conversationId: number,
  ) {
    this.emitSidebarUpdates(
      conversationId,
    ).catch((error) =>
      console.error(
        "Sidebar refresh error:",
        error,
      ),
    );
  }

  /**
   * ==========================================
   * EDIT MESSAGE
   * ==========================================
   */
  @SubscribeMessage("edit_message")
  async HandleEditMessage(
    @MessageBody()
    data: {
      messageId: number;
      message: string;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        this.getSocketUserId(client);

      if (!userId) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      const updated =
        await this.chatService.EditMessage(
          userId,
          Number(data?.messageId),
          data?.message,
        );

      this.emitMessageUpdated(updated);

      this.refreshSidebarsQuietly(
        updated.conversationId,
      );

      return {
        success: true,
        message: updated,
      };
    } catch (error) {
      return this.errorResponse(
        error,
        "Unable to edit message.",
      );
    }
  }

  /**
   * ==========================================
   * DELETE (UNSEND) MESSAGE
   * ==========================================
   */
  @SubscribeMessage("delete_message")
  async HandleDeleteMessage(
    @MessageBody()
    data: {
      messageId: number;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        this.getSocketUserId(client);

      if (!userId) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      const deleted =
        await this.chatService.DeleteMessage(
          userId,
          Number(data?.messageId),
        );

      this.emitMessageUpdated(deleted);

      this.refreshSidebarsQuietly(
        deleted.conversationId,
      );

      return {
        success: true,
        message: deleted,
      };
    } catch (error) {
      return this.errorResponse(
        error,
        "Unable to delete message.",
      );
    }
  }

  /**
   * ==========================================
   * DELETE MESSAGES (for me / for everyone)
   * ==========================================
   *
   * scope "me"       -> hide from my view only
   * scope "everyone" -> unsend (own messages only)
   */
  @SubscribeMessage("delete_messages")
  async HandleDeleteMessages(
    @MessageBody()
    data: {
      messageIds: number[];
      scope: "me" | "everyone";
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        this.getSocketUserId(client);

      if (!userId) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      if (data?.scope === "everyone") {
        const deleted =
          await this.chatService.DeleteMessages(
            userId,
            data?.messageIds,
          );

        for (const message of deleted) {
          this.emitMessageUpdated(message);
        }

        if (deleted.length > 0) {
          this.refreshSidebarsQuietly(
            deleted[0].conversationId,
          );
        }

        return {
          success: true,
          messages: deleted,
        };
      }

      const hidden =
        await this.chatService.HideMessages(
          userId,
          data?.messageIds,
        );

      // Only this user's own tabs/devices.
      this.emitToUsers(
        [userId],
        "messages_hidden",
        hidden,
      );

      const item =
        await this.conversationService.getSidebarItem(
          hidden.conversationId,
          userId,
        );

      if (item) {
        this.emitToUsers(
          [userId],
          "conversation_updated",
          item,
        );
      }

      return {
        success: true,
        ...hidden,
      };
    } catch (error) {
      return this.errorResponse(
        error,
        "Unable to delete messages.",
      );
    }
  }

  /**
   * ==========================================
   * TOGGLE REACTION
   * ==========================================
   */
  @SubscribeMessage("toggle_reaction")
  async HandleToggleReaction(
    @MessageBody()
    data: {
      messageId: number;
      emoji: string;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const userId =
        this.getSocketUserId(client);

      if (!userId) {
        return {
          success: false,
          message: "Unauthorized.",
        };
      }

      const updated =
        await this.chatService.ToggleReaction(
          userId,
          Number(data?.messageId),
          data?.emoji,
        );

      this.emitMessageUpdated(updated);

      return {
        success: true,
        message: updated,
      };
    } catch (error) {
      return this.errorResponse(
        error,
        "Unable to react to message.",
      );
    }
  }
}
