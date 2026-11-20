import {
  ConversationEntity,
  DEFAULT_GROUP_PERMISSIONS,
  GroupPermissions,
  PermissionLevel,
} from "../conversation/entities/conversation.entity";

import { ConversationParticipantEntity } from "../conversation/entities/conversation-participant.entity";

export type GroupAction = keyof GroupPermissions;

export const GROUP_ACTIONS: GroupAction[] = [
  "addMembers",
  "editInfo",
  "sendMessages",
];

const LEVELS: PermissionLevel[] = ["ALL", "ADMINS"];

export const resolvePermissions = (
  conversation: Pick<ConversationEntity, "permissions">,
): GroupPermissions => ({
  ...DEFAULT_GROUP_PERMISSIONS,
  ...(conversation.permissions ?? {}),
});

export const isLevel = (
  value: unknown,
): value is PermissionLevel =>
  LEVELS.includes(value as PermissionLevel);

/**
 * Admins can always do everything; members only
 * what the group allows for "ALL".
 */
export const canPerform = (
  conversation: Pick<ConversationEntity, "type" | "permissions">,
  participant: Pick<ConversationParticipantEntity, "role"> | null | undefined,
  action: GroupAction,
): boolean => {
  if (!participant) {
    return false;
  }

  if (conversation.type !== "GROUP") {
    return true;
  }

  if (participant.role === "ADMIN") {
    return true;
  }

  return resolvePermissions(conversation)[action] === "ALL";
};
