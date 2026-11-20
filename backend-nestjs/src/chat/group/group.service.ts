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

import { UsersEntity } from "@/auth/entities/auth.entity";
import { AuthService } from "@/auth/auth.service";

import {
  ConversationEntity,
  GroupPermissions,
} from "../conversation/entities/conversation.entity";

import {
  ConversationParticipantEntity,
  ParticipantRole,
} from "../conversation/entities/conversation-participant.entity";

import { ChatService } from "../chat.service";
import { ChatGateway } from "../chat.getway";

import {
  canPerform,
  GROUP_ACTIONS,
  GroupAction,
  isLevel,
  resolvePermissions,
} from "./group-permissions";

const MAX_GROUP_MEMBERS = 256;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export interface GroupMember {
  userId: number;
  fullName: string;
  publicId: string;
  isEmailVerified: boolean;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface GroupDetails {
  conversationId: number;
  type: "GROUP";
  name: string;
  description: string | null;
  createdById: number | null;
  createdAt: Date;
  permissions: GroupPermissions;
  members: GroupMember[];
}

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,

    @InjectRepository(ConversationParticipantEntity)
    private readonly participantRepository: Repository<ConversationParticipantEntity>,

    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,

    private readonly chatService: ChatService,

    private readonly chatGateway: ChatGateway,

    private readonly authService: AuthService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Respect each person's "who can add me to
   * groups" setting and blocks.
   */
  private async assertCanAdd(
    actorId: number,
    users: Array<{ userId: number; fullName: string }>,
  ) {
    if (await this.authService.IsDeactivated(actorId)) {
      throw new ForbiddenException(
        "Your account is deactivated. Activate it to manage groups.",
      );
    }

    const refused: string[] = [];

    for (const user of users) {
      if (
        !(await this.authService.CanAddToGroup(
          actorId,
          user.userId,
        ))
      ) {
        refused.push(user.fullName);
      }
    }

    if (refused.length > 0) {
      throw new ForbiddenException(
        `${this.formatNames(refused)} can't be added to groups by you.`,
      );
    }
  }

  /* ==========================================================
     HELPERS
  ========================================================== */

  private cleanName(value: unknown): string {
    const name =
      typeof value === "string"
        ? value.trim()
        : "";

    if (!name) {
      throw new BadRequestException(
        "Group name is required.",
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `Group name can be at most ${MAX_NAME_LENGTH} characters.`,
      );
    }

    return name;
  }

  private cleanUserIds(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map(Number)
          .filter(
            (id) =>
              Number.isInteger(id) && id > 0,
          ),
      ),
    ];
  }

  /**
   * Load group + caller's membership, or 404.
   */
  private async loadGroup(
    conversationId: number,
    userId: number,
  ) {
    const conversation =
      await this.conversationRepository.findOne({
        where: {
          conversationId: Number(conversationId),
        },
      });

    if (
      !conversation ||
      conversation.type !== "GROUP"
    ) {
      throw new NotFoundException(
        "Group not found.",
      );
    }

    const me =
      await this.participantRepository.findOne({
        where: {
          conversationId:
            conversation.conversationId,
          userId: Number(userId),
        },
      });

    if (!me) {
      throw new NotFoundException(
        "Group not found.",
      );
    }

    return { conversation, me };
  }

  private requirePermission(
    conversation: ConversationEntity,
    me: ConversationParticipantEntity,
    action: GroupAction,
    message: string,
  ) {
    if (!canPerform(conversation, me, action)) {
      throw new ForbiddenException(message);
    }
  }

  private requireAdmin(
    me: ConversationParticipantEntity,
  ) {
    if (me.role !== "ADMIN") {
      throw new ForbiddenException(
        "Only group admins can do this.",
      );
    }
  }

  private async userName(userId: number) {
    const user =
      await this.userRepository.findOne({
        where: { userId: Number(userId) },
        select: { userId: true, fullName: true },
      });

    return user?.fullName ?? "Someone";
  }

  private formatNames(names: string[]) {
    if (names.length <= 2) {
      return names.join(" and ");
    }

    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  /**
   * Post a system message and push the new
   * group state to every member.
   */
  private async announce(
    conversationId: number,
    actorId: number,
    text: string | null,
    extraUserIds: number[] = [],
  ) {
    if (text) {
      const message =
        await this.chatService.CreateSystemMessage(
          conversationId,
          actorId,
          text,
        );

      await this.chatGateway.broadcastNewMessage(
        message,
      );
    } else {
      await this.chatGateway.emitSidebarUpdates(
        conversationId,
      );
    }

    const details =
      await this.buildDetails(conversationId);

    if (details) {
      this.chatGateway.emitToUsers(
        details.members.map(
          (member) => member.userId,
        ),
        "group_updated",
        details,
      );
    }

    if (extraUserIds.length > 0) {
      this.chatGateway.emitToUsers(
        extraUserIds,
        "conversations_changed",
        { conversationId },
      );
    }

    return details;
  }

  private async buildDetails(
    conversationId: number,
  ): Promise<GroupDetails | null> {
    const conversation =
      await this.conversationRepository.findOne({
        where: {
          conversationId: Number(conversationId),
        },
      });

    if (!conversation) {
      return null;
    }

    const participants =
      await this.participantRepository.find({
        where: {
          conversationId: Number(conversationId),
        },
        relations: { user: true },
        order: { joinedAt: "ASC" },
      });

    const members: GroupMember[] = participants
      .filter((participant) => participant.user)
      .map((participant) => ({
        userId: participant.user.userId,
        fullName: participant.user.fullName,
        publicId: participant.user.publicId,
        isEmailVerified:
          participant.user.isEmailVerified,
        role: participant.role ?? "MEMBER",
        joinedAt: participant.joinedAt,
      }))
      .sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === "ADMIN" ? -1 : 1;
        }

        return a.fullName.localeCompare(
          b.fullName,
        );
      });

    return {
      conversationId:
        conversation.conversationId,
      type: "GROUP",
      name: conversation.name ?? "Group",
      description:
        conversation.description ?? null,
      createdById:
        conversation.createdById ?? null,
      createdAt: conversation.createdAt,
      permissions:
        resolvePermissions(conversation),
      members,
    };
  }

  /* ==========================================================
     CREATE
  ========================================================== */

  async createGroup(
    creatorId: number,
    body: {
      name?: unknown;
      memberIds?: unknown;
    },
  ) {
    const name = this.cleanName(body.name);

    const memberIds = this.cleanUserIds(
      body.memberIds,
    ).filter((id) => id !== Number(creatorId));

    if (memberIds.length === 0) {
      throw new BadRequestException(
        "Add at least one other person to the group.",
      );
    }

    if (memberIds.length + 1 > MAX_GROUP_MEMBERS) {
      throw new BadRequestException(
        `A group can have at most ${MAX_GROUP_MEMBERS} members.`,
      );
    }

    const existingUsers =
      await this.userRepository.find({
        where: { userId: In(memberIds) },
        select: { userId: true, fullName: true },
      });

    if (existingUsers.length !== memberIds.length) {
      throw new BadRequestException(
        "Some selected people were not found.",
      );
    }

    await this.assertCanAdd(
      Number(creatorId),
      existingUsers,
    );

    /*
     * New groups start with the creator's
     * default permissions.
     */
    const creatorDefaults = (
      await this.authService.GetGroupSettings(
        creatorId,
      )
    ).defaults;

    const conversationId =
      await this.dataSource.transaction(
        async (manager) => {
          const conversation =
            await manager
              .getRepository(ConversationEntity)
              .save(
                manager
                  .getRepository(ConversationEntity)
                  .create({
                    type: "GROUP",
                    name,
                    directKey: null,
                    createdById: Number(creatorId),
                    permissions: { ...creatorDefaults },
                  }),
              );

          const participantRepository =
            manager.getRepository(
              ConversationParticipantEntity,
            );

          await participantRepository.save(
            participantRepository.create([
              {
                conversationId:
                  conversation.conversationId,
                userId: Number(creatorId),
                role: "ADMIN" as const,
              },
              ...memberIds.map((id) => ({
                conversationId:
                  conversation.conversationId,
                userId: id,
                role: "MEMBER" as const,
              })),
            ]),
          );

          return conversation.conversationId;
        },
      );

    const creatorName = await this.userName(
      creatorId,
    );

    await this.announce(
      conversationId,
      creatorId,
      `${creatorName} created the group "${name}"`,
      [Number(creatorId), ...memberIds],
    );

    return await this.buildDetails(conversationId);
  }

  /* ==========================================================
     READ
  ========================================================== */

  async getDetails(
    conversationId: number,
    userId: number,
  ) {
    await this.loadGroup(conversationId, userId);

    return await this.buildDetails(conversationId);
  }

  /* ==========================================================
     INFO
  ========================================================== */

  async updateInfo(
    userId: number,
    conversationId: number,
    body: {
      name?: unknown;
      description?: unknown;
    },
  ) {
    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    this.requirePermission(
      conversation,
      me,
      "editInfo",
      "Only admins can change the group info.",
    );

    const changes: string[] = [];

    if (body.name !== undefined) {
      const name = this.cleanName(body.name);

      if (name !== conversation.name) {
        conversation.name = name;
        changes.push(`renamed the group to "${name}"`);
      }
    }

    if (body.description !== undefined) {
      const description =
        typeof body.description === "string"
          ? body.description
              .trim()
              .slice(0, MAX_DESCRIPTION_LENGTH)
          : "";

      const normalized = description || null;

      if (normalized !== conversation.description) {
        conversation.description = normalized;
        changes.push("updated the group description");
      }
    }

    if (changes.length === 0) {
      return await this.buildDetails(
        conversation.conversationId,
      );
    }

    await this.conversationRepository.save(
      conversation,
    );

    const actorName = await this.userName(userId);

    return await this.announce(
      conversation.conversationId,
      userId,
      `${actorName} ${changes.join(" and ")}`,
    );
  }

  /* ==========================================================
     PERMISSIONS
  ========================================================== */

  async updatePermissions(
    userId: number,
    conversationId: number,
    body: Record<string, unknown>,
    verificationToken: unknown,
  ) {
    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    this.requireAdmin(me);

    await this.authService.VerifyActionToken(
      userId,
      verificationToken,
      "UPDATE_GROUP_PERMISSIONS",
    );

    const permissions =
      resolvePermissions(conversation);

    for (const action of GROUP_ACTIONS) {
      const value = body?.[action];

      if (value === undefined) {
        continue;
      }

      if (!isLevel(value)) {
        throw new BadRequestException(
          `Invalid value for ${action}.`,
        );
      }

      permissions[action] = value;
    }

    conversation.permissions = permissions;

    await this.conversationRepository.save(
      conversation,
    );

    const actorName = await this.userName(userId);

    return await this.announce(
      conversation.conversationId,
      userId,
      `${actorName} changed the group settings`,
    );
  }

  /* ==========================================================
     MEMBERS
  ========================================================== */

  async addMembers(
    userId: number,
    conversationId: number,
    rawUserIds: unknown,
  ) {
    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    this.requirePermission(
      conversation,
      me,
      "addMembers",
      "Only admins can add members to this group.",
    );

    const existing =
      await this.participantRepository.find({
        where: {
          conversationId:
            conversation.conversationId,
        },
        select: { userId: true },
      });

    const existingIds = new Set(
      existing.map((row) => Number(row.userId)),
    );

    const newIds = this.cleanUserIds(
      rawUserIds,
    ).filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      throw new BadRequestException(
        "Those people are already in the group.",
      );
    }

    if (
      existingIds.size + newIds.length >
      MAX_GROUP_MEMBERS
    ) {
      throw new BadRequestException(
        `A group can have at most ${MAX_GROUP_MEMBERS} members.`,
      );
    }

    const users = await this.userRepository.find({
      where: { userId: In(newIds) },
      select: { userId: true, fullName: true },
    });

    if (users.length !== newIds.length) {
      throw new BadRequestException(
        "Some selected people were not found.",
      );
    }

    await this.assertCanAdd(Number(userId), users);

    await this.participantRepository.save(
      this.participantRepository.create(
        users.map((user) => ({
          conversationId:
            conversation.conversationId,
          userId: user.userId,
          role: "MEMBER" as const,
        })),
      ),
    );

    const actorName = await this.userName(userId);

    return await this.announce(
      conversation.conversationId,
      userId,
      `${actorName} added ${this.formatNames(
        users.map((user) => user.fullName),
      )}`,
      newIds,
    );
  }

  /**
   * Admins can remove members; only the group
   * creator can remove other admins.
   */
  async removeMember(
    userId: number,
    conversationId: number,
    targetUserId: number,
  ) {
    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    if (Number(targetUserId) === Number(userId)) {
      return await this.leaveGroup(
        userId,
        conversationId,
      );
    }

    this.requireAdmin(me);

    const target =
      await this.participantRepository.findOne({
        where: {
          conversationId:
            conversation.conversationId,
          userId: Number(targetUserId),
        },
      });

    if (!target) {
      throw new NotFoundException(
        "That person is not in this group.",
      );
    }

    if (
      Number(target.userId) ===
      Number(conversation.createdById)
    ) {
      throw new ForbiddenException(
        "The group creator can't be removed.",
      );
    }

    if (
      target.role === "ADMIN" &&
      Number(userId) !==
        Number(conversation.createdById)
    ) {
      throw new ForbiddenException(
        "Only the group creator can remove another admin.",
      );
    }

    await this.participantRepository.remove(target);

    this.chatGateway.removeUsersFromConversationRoom(
      [Number(targetUserId)],
      conversation.conversationId,
    );

    this.chatGateway.emitToUsers(
      [Number(targetUserId)],
      "group_removed",
      {
        conversationId:
          conversation.conversationId,
        reason: "removed",
      },
    );

    const [actorName, targetName] =
      await Promise.all([
        this.userName(userId),
        this.userName(targetUserId),
      ]);

    return await this.announce(
      conversation.conversationId,
      userId,
      `${actorName} removed ${targetName}`,
    );
  }

  async setMemberRole(
    userId: number,
    conversationId: number,
    targetUserId: number,
    role: unknown,
  ) {
    if (role !== "ADMIN" && role !== "MEMBER") {
      throw new BadRequestException(
        "Role must be ADMIN or MEMBER.",
      );
    }

    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    this.requireAdmin(me);

    const target =
      await this.participantRepository.findOne({
        where: {
          conversationId:
            conversation.conversationId,
          userId: Number(targetUserId),
        },
      });

    if (!target) {
      throw new NotFoundException(
        "That person is not in this group.",
      );
    }

    if (target.role === role) {
      return await this.buildDetails(
        conversation.conversationId,
      );
    }

    if (role === "MEMBER") {
      if (
        Number(target.userId) ===
        Number(conversation.createdById)
      ) {
        throw new ForbiddenException(
          "The group creator is always an admin.",
        );
      }

      if (
        Number(target.userId) !== Number(userId) &&
        Number(userId) !==
          Number(conversation.createdById)
      ) {
        throw new ForbiddenException(
          "Only the group creator can dismiss another admin.",
        );
      }

      const adminCount =
        await this.participantRepository.count({
          where: {
            conversationId:
              conversation.conversationId,
            role: "ADMIN",
          },
        });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "A group needs at least one admin.",
        );
      }
    }

    target.role = role;

    await this.participantRepository.save(target);

    const [actorName, targetName] =
      await Promise.all([
        this.userName(userId),
        this.userName(targetUserId),
      ]);

    return await this.announce(
      conversation.conversationId,
      userId,
      role === "ADMIN"
        ? `${actorName} made ${targetName} an admin`
        : Number(targetUserId) === Number(userId)
          ? `${actorName} is no longer an admin`
          : `${actorName} dismissed ${targetName} as admin`,
    );
  }

  /**
   * Leave a group. The last admin must hand the
   * admin role to someone (`newAdminId`) first.
   * An empty group is deleted.
   */
  async leaveGroup(
    userId: number,
    conversationId: number,
    newAdminId?: number | null,
    options: { autoSuccessor?: boolean } = {},
  ) {
    const { conversation, me } =
      await this.loadGroup(conversationId, userId);

    const others =
      await this.participantRepository.find({
        where: {
          conversationId:
            conversation.conversationId,
        },
      });

    const remaining = others.filter(
      (participant) =>
        Number(participant.userId) !==
        Number(userId),
    );

    const isLastAdmin =
      me.role === "ADMIN" &&
      remaining.length > 0 &&
      !remaining.some(
        (participant) =>
          participant.role === "ADMIN",
      );

    let successor: ConversationParticipantEntity | undefined;

    if (
      isLastAdmin &&
      options.autoSuccessor &&
      (newAdminId === undefined || newAdminId === null)
    ) {
      // Longest-standing member takes over.
      newAdminId = [...remaining].sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() -
          new Date(b.joinedAt).getTime(),
      )[0].userId;
    }

    if (isLastAdmin) {
      if (
        newAdminId === undefined ||
        newAdminId === null
      ) {
        throw new BadRequestException(
          "You're the only admin. Choose a new admin before leaving.",
        );
      }

      successor = remaining.find(
        (participant) =>
          Number(participant.userId) ===
          Number(newAdminId),
      );

      if (!successor) {
        throw new BadRequestException(
          "The new admin must be a member of this group.",
        );
      }
    }

    await this.dataSource.transaction(
      async (manager) => {
        const repository = manager.getRepository(
          ConversationParticipantEntity,
        );

        if (successor) {
          successor.role = "ADMIN";

          await repository.save(successor);
        }

        await repository.remove(me);

        if (remaining.length === 0) {
          await manager
            .getRepository(ConversationEntity)
            .delete({
              conversationId:
                conversation.conversationId,
            });
        }
      },
    );

    this.chatGateway.removeUsersFromConversationRoom(
      [Number(userId)],
      conversation.conversationId,
    );

    this.chatGateway.emitToUsers(
      [Number(userId)],
      "group_removed",
      {
        conversationId:
          conversation.conversationId,
        reason: "left",
      },
    );

    if (remaining.length === 0) {
      return { success: true };
    }

    const actorName = await this.userName(userId);

    let notice = `${actorName} left the group`;

    if (successor) {
      const successorName = await this.userName(
        successor.userId,
      );

      notice = `${actorName} made ${successorName} an admin and left the group`;
    }

    await this.announce(
      conversation.conversationId,
      userId,
      notice,
    );

    return { success: true };
  }

  /* ==========================================================
     SETTINGS PAGE
  ========================================================== */

  /**
   * Every group the user belongs to, with whether
   * its permissions match the user's defaults.
   */
  async listMyGroups(userId: number) {
    const memberships =
      await this.participantRepository.find({
        where: { userId: Number(userId) },
        relations: { conversation: true },
      });

    const defaults = (
      await this.authService.GetGroupSettings(userId)
    ).defaults;

    const groups = [];

    for (const membership of memberships) {
      const conversation = membership.conversation;

      if (!conversation || conversation.type !== "GROUP") {
        continue;
      }

      const permissions = resolvePermissions(conversation);

      const memberCount =
        await this.participantRepository.count({
          where: {
            conversationId: conversation.conversationId,
          },
        });

      groups.push({
        conversationId: conversation.conversationId,
        name: conversation.name ?? "Group",
        memberCount,
        myRole: membership.role,
        permissions,
        usesDefaults: GROUP_ACTIONS.every(
          (action) => permissions[action] === defaults[action],
        ),
      });
    }

    groups.sort((a, b) => a.name.localeCompare(b.name));

    return groups;
  }

  /**
   * Reset a group's permissions to the admin's
   * own defaults.
   */
  async applyDefaults(
    userId: number,
    conversationId: number,
    verificationToken: unknown,
  ) {
    const defaults = (
      await this.authService.GetGroupSettings(userId)
    ).defaults;

    return this.updatePermissions(
      userId,
      conversationId,
      { ...defaults },
      verificationToken,
    );
  }

  /**
   * Used by "Reset account": leave every group.
   */
  async leaveAllGroups(userId: number) {
    const memberships =
      await this.participantRepository.find({
        where: { userId: Number(userId) },
        relations: { conversation: true },
      });

    let left = 0;

    for (const membership of memberships) {
      if (membership.conversation?.type !== "GROUP") {
        continue;
      }

      await this.leaveGroup(
        userId,
        membership.conversationId,
        null,
        { autoSuccessor: true },
      );

      left += 1;
    }

    return left;
  }
}
