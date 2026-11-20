import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "@/auth/auth.guard";
import { AuthenticatedRequest } from "@/auth/interfaces/authenticated-request.interface";

import { GroupService } from "./group.service";

const requireUserId = (
  request: AuthenticatedRequest,
) => {
  const userId = Number(request.user?.userId);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestException(
      "Authenticated user ID is missing.",
    );
  }

  return userId;
};

const requireId = (
  value: unknown,
  name: string,
) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(
      `${name} is required.`,
    );
  }

  return id;
};

@UseGuards(JwtAuthGuard)
@Controller("chat/groups")
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: { name?: unknown; memberIds?: unknown },
  ) {
    return await this.groupService.createGroup(
      requireUserId(request),
      body ?? {},
    );
  }

  @Post("details")
  async details(
    @Req() request: AuthenticatedRequest,
    @Body("conversationId") conversationId: unknown,
  ) {
    return await this.groupService.getDetails(
      requireId(conversationId, "conversationId"),
      requireUserId(request),
    );
  }

  @Post("update")
  async update(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      name?: unknown;
      description?: unknown;
    },
  ) {
    return await this.groupService.updateInfo(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      {
        name: body?.name,
        description: body?.description,
      },
    );
  }

  @Post("permissions")
  async permissions(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      permissions?: Record<string, unknown>;
      verificationToken?: unknown;
    },
  ) {
    return await this.groupService.updatePermissions(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      body?.permissions ?? {},
      body?.verificationToken,
    );
  }

  @Post("mine")
  async mine(@Req() request: AuthenticatedRequest) {
    return await this.groupService.listMyGroups(
      requireUserId(request),
    );
  }

  @Post("applyDefaults")
  async applyDefaults(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      verificationToken?: unknown;
    },
  ) {
    return await this.groupService.applyDefaults(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      body?.verificationToken,
    );
  }

  @Post("addMembers")
  async addMembers(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      userIds?: unknown;
    },
  ) {
    return await this.groupService.addMembers(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      body?.userIds,
    );
  }

  @Post("removeMember")
  async removeMember(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      userId?: unknown;
    },
  ) {
    return await this.groupService.removeMember(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      requireId(body?.userId, "userId"),
    );
  }

  @Post("setRole")
  async setRole(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      userId?: unknown;
      role?: unknown;
    },
  ) {
    return await this.groupService.setMemberRole(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      requireId(body?.userId, "userId"),
      body?.role,
    );
  }

  @Post("leave")
  async leave(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      conversationId?: unknown;
      newAdminId?: unknown;
    },
  ) {
    return await this.groupService.leaveGroup(
      requireUserId(request),
      requireId(body?.conversationId, "conversationId"),
      body?.newAdminId === undefined ||
        body?.newAdminId === null
        ? null
        : requireId(body.newAdminId, "newAdminId"),
    );
  }
}
