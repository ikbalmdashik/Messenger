import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "@/auth/auth.guard";
import { AuthService } from "@/auth/auth.service";
import { AuthenticatedRequest } from "@/auth/interfaces/authenticated-request.interface";

import { ChatGateway } from "./chat.getway";
import { ChatService } from "./chat.service";
import { describeDuration } from "./conversation/entities/conversation-participant.entity";
import { UsersEntity } from "@/auth/entities/auth.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConversationService } from "./conversation/conversation.service";
import { GroupService } from "./group/group.service";

const requireUserId = (request: AuthenticatedRequest) => {
  const userId = Number(request.user?.userId);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestException("Authenticated user ID is missing.");
  }

  return userId;
};

const requireId = (value: unknown, name: string) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(`${name} is required.`);
  }

  return id;
};

/**
 * Blocking and "delete chat" actions.
 */
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatActionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly chatGateway: ChatGateway,
    private readonly groupService: GroupService,
    private readonly chatService: ChatService,
    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,
  ) {}

  /* ==========================================================
     BLOCKING
  ========================================================== */

  @Post("blocks")
  async listBlocked(@Req() request: AuthenticatedRequest) {
    return this.authService.ListBlocked(requireUserId(request));
  }

  @Post("blocks/status")
  async blockStatus(
    @Req() request: AuthenticatedRequest,
    @Body("userId") userId: unknown,
  ) {
    return this.authService.GetBlockStatus(
      requireUserId(request),
      requireId(userId, "userId"),
    );
  }

  @Post("blocks/block")
  async block(
    @Req() request: AuthenticatedRequest,
    @Body("userId") userId: unknown,
  ) {
    const me = requireUserId(request);
    const target = requireId(userId, "userId");

    const status = await this.authService.BlockUser(me, target);

    this.notifyBlockChange(me, target);

    return status;
  }

  @Post("blocks/unblock")
  async unblock(
    @Req() request: AuthenticatedRequest,
    @Body("userId") userId: unknown,
  ) {
    const me = requireUserId(request);
    const target = requireId(userId, "userId");

    const status = await this.authService.UnblockUser(me, target);

    this.notifyBlockChange(me, target);

    return status;
  }

  /**
   * Tell both people's open chats, each from
   * their own point of view.
   */
  private notifyBlockChange(me: number, target: number) {
    void Promise.all([
      this.authService.GetBlockStatus(me, target),
      this.authService.GetBlockStatus(target, me),
    ]).then(([mine, theirs]) => {
      this.chatGateway.emitToUsers([me], "block_updated", {
        userId: target,
        ...mine,
      });

      this.chatGateway.emitToUsers([target], "block_updated", {
        userId: me,
        ...theirs,
      });
    });
  }

  /* ==========================================================
     DIRECT-CHAT SUSPENSION
  ========================================================== */

  @Post("conversations/suspension")
  async suspensionStatus(
    @Req() request: AuthenticatedRequest,
    @Body("conversationId") conversationId: unknown,
  ) {
    return this.conversationService.getDirectSuspension(
      requireId(conversationId, "conversationId"),
      requireUserId(request),
    );
  }

  @Post("conversations/suspend")
  async suspendDirect(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: { conversationId?: unknown; durationMinutes?: unknown },
  ) {
    const me = requireUserId(request);

    const status = await this.conversationService.suspendDirect(
      requireId(body?.conversationId, "conversationId"),
      me,
      body?.durationMinutes ?? null,
    );

    await this.notifySuspension(
      me,
      status.otherUserId,
      status.conversationId,
      (actor, target) =>
        `${actor} suspended ${target} from sending messages ${describeDuration(body?.durationMinutes)}`,
    );

    return status;
  }

  @Post("conversations/unsuspend")
  async unsuspendDirect(
    @Req() request: AuthenticatedRequest,
    @Body("conversationId") conversationId: unknown,
  ) {
    const me = requireUserId(request);

    const status = await this.conversationService.unsuspendDirect(
      requireId(conversationId, "conversationId"),
      me,
    );

    if (status.changed) {
      await this.notifySuspension(
        me,
        status.otherUserId,
        status.conversationId,
        (actor, target) =>
          `${actor} lifted the suspension of ${target}`,
      );
    }

    return status;
  }

  private async notifySuspension(
    me: number,
    other: number,
    conversationId: number,
    text: (actor: string, target: string) => string,
  ) {
    const users = await this.userRepository.find({
      where: [{ userId: me }, { userId: other }],
      select: { userId: true, fullName: true },
    });

    const nameOf = (id: number) =>
      users.find((user) => Number(user.userId) === id)?.fullName ??
      "Someone";

    try {
      const message = await this.chatService.CreateSystemMessage(
        conversationId,
        me,
        text(nameOf(me), nameOf(other)),
      );

      await this.chatGateway.broadcastNewMessage(message);
    } catch (error) {
      console.error("Suspension notice failed:", error);
    }

    this.chatGateway.emitToUsers([me, other], "suspension_updated", {
      conversationId,
    });
  }

  /* ==========================================================
     DELETE CHATS (for me only)
  ========================================================== */

  @Post("conversations/delete")
  async deleteChat(
    @Req() request: AuthenticatedRequest,
    @Body("conversationId") conversationId: unknown,
  ) {
    const me = requireUserId(request);

    const result = await this.conversationService.deleteChatForMe(
      me,
      requireId(conversationId, "conversationId"),
    );

    this.chatGateway.emitToUsers([me], "conversation_deleted", {
      conversationId: result.conversationId,
    });

    return result;
  }

  /**
   * "Reset account": leave all groups, delete every
   * chat for me, clear profile details and blocks,
   * and restore default privacy / group settings.
   * Name, email, phone and password stay.
   */
  @Post("account/reset")
  async resetAccount(
    @Req() request: AuthenticatedRequest,
    @Body("verificationToken") verificationToken: unknown,
  ) {
    const me = requireUserId(request);

    await this.authService.VerifyActionToken(
      me,
      verificationToken,
      "RESET_ACCOUNT",
    );

    const groupsLeft = await this.groupService.leaveAllGroups(me);

    const { deleted } =
      await this.conversationService.deleteAllChatsForMe(me);

    await this.authService.ResetProfileData(me);

    this.chatGateway.emitToUsers([me], "conversations_changed", {});

    return { success: true, groupsLeft, chatsDeleted: deleted };
  }
}
