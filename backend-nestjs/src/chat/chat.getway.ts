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

import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";

import { ConversationService } from "./conversation/conversation.service";

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
       * VERIFY PARTICIPATION
       * ======================================
       */
      await this.conversationService.getConversationForUser(
        conversationId,
        userId,
      );

      /*
       * ======================================
       * SAVE MESSAGE
       * ======================================
       *
       * CreateChat now:
       *
       * 1. Saves message.
       * 2. Finds sender.
       * 3. Finds recipient.
       * 4. Increments recipient unreadCount.
       * 5. Keeps sender unreadCount = 0.
       */
      const result =
        await this.chatService.CreateChat(
          userId,

          conversationId,

          createChatDto.message.trim(),

          createChatDto.status ||
            "sent",
        );

      /*
       * CreateChat returns:
       *
       * {
       *   message,
       *   senderId,
       *   recipientId,
       *   senderUnreadCount,
       *   recipientUnreadCount
       * }
       */
      const savedMessage =
        result.message;

      const recipientId =
        Number(
          result.recipientId,
        );

      /*
       * ======================================
       * CONVERSATION ROOM
       * ======================================
       */
      const conversationRoom =
        `conversation-${conversationId}`;

      /*
       * ======================================
       * SEND ACTUAL MESSAGE
       * ======================================
       *
       * Middlebar already listens for:
       *
       * receive_message
       *
       * We continue sending only the
       * saved ChatMessageEntity here.
       */
      this.server
        .to(conversationRoom)
        .emit(
          "receive_message",
          savedMessage,
        );

      /*
       * ======================================
       * GET SIDEBAR DATA
       * ======================================
       *
       * For sender:
       *
       * show the recipient.
       *
       * For recipient:
       *
       * show the sender.
       */
      const senderSidebar =
        await this.conversationService.getConversationSidebarUser(
          conversationId,
          userId,
        );

      const recipientSidebar =
        await this.conversationService.getConversationSidebarUser(
          conversationId,
          recipientId,
        );

      /*
       * ======================================
       * UPDATE SENDER SIDEBAR
       * ======================================
       *
       * Sender's unread count is 0.
       */
      if (senderSidebar) {
        this.server
          .to(`user:${userId}`)
          .emit(
            "conversation_updated",
            {
              conversationId,

              userId:
                senderSidebar.userId,

              fullName:
                senderSidebar.fullName,

              email:
                senderSidebar.email,

              publicId:
                senderSidebar.publicId,

              isEmailVerified:
                senderSidebar.isEmailVerified,

              lastMessage:
                savedMessage.message,

              lastMessageAt:
                savedMessage.createdAt,

              lastMessageSenderId:
                userId,

              unreadCount:
                0,
            },
          );
      }

      /*
       * ======================================
       * UPDATE RECIPIENT SIDEBAR
       * ======================================
       *
       * recipientSidebar already contains:
       *
       * unreadCount
       *
       * because getConversationSidebarUser()
       * reads the recipient's participant row.
       */
      if (recipientSidebar) {
        this.server
          .to(
            `user:${recipientId}`,
          )
          .emit(
            "conversation_updated",
            {
              conversationId,

              userId:
                recipientSidebar.userId,

              fullName:
                recipientSidebar.fullName,

              email:
                recipientSidebar.email,

              publicId:
                recipientSidebar.publicId,

              isEmailVerified:
                recipientSidebar.isEmailVerified,

              lastMessage:
                savedMessage.message,

              lastMessageAt:
                savedMessage.createdAt,

              lastMessageSenderId:
                userId,

              unreadCount:
                recipientSidebar.unreadCount,
            },
          );
      }

      console.log(
        `Message sent | User: ${userId} | Recipient: ${recipientId} | Conversation: ${conversationId} | Message: ${savedMessage.messageId} | Recipient unread: ${recipientSidebar?.unreadCount ?? 0}`,
      );

      /*
       * Return the actual saved message
       * to the sender.
       */
      return savedMessage;
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
}