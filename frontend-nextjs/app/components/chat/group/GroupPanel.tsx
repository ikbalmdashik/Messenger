"use client";

import React, { useEffect, useState } from "react";

import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";

import {
  AlertDialog,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  DropdownMenu,
  Flex,
  IconButton,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import {
  ArrowLeft,
  Crown,
  LogOut,
  MoreHorizontal,
  Pencil,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

import API_ENDPOINTS, {
  GroupDetails,
  GroupMember,
  GroupPermissions,
  PermissionLevel,
} from "@/app/routes/api";

import { getErrorMessage } from "@/app/lib/apiError";
import Routes from "@/app/routes/routes";
import useConfirm, {
  changed,
  ConfirmOptions,
} from "../../shared/useConfirm";

import UserPicker, {
  PickedUser,
} from "../shared/UserPicker";

interface GroupPanelProps {
  group: GroupDetails | null;
  currentUserId: number;
  onGroupChange: (group: GroupDetails) => void;
  onLeft: () => void;
  onBack?: () => void;
}

const PERMISSION_LABELS: Record<
  keyof GroupPermissions,
  string
> = {
  sendMessages: "Send messages",
  addMembers: "Add members",
  editInfo: "Edit group name & description",
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "G";

const GroupPanel: React.FC<GroupPanelProps> = ({
  group,
  currentUserId,
  onGroupChange,
  onLeft,
  onBack,
}) => {
  const [editingInfo, setEditingInfo] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [adding, setAdding] = useState(false);
  const [newMembers, setNewMembers] = useState<PickedUser[]>([]);

  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  /**
   * Chosen successor when the last admin leaves.
   */
  const [newAdminId, setNewAdminId] = useState<string>("");

  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    setEditingInfo(false);
    setAdding(false);
    setNewMembers([]);
  }, [group?.conversationId]);

  if (!group) {
    return (
      <Flex
        align="center"
        justify="center"
        className="h-full p-6"
      >
        <Text size="2" color="gray">
          Loading group…
        </Text>
      </Flex>
    );
  }

  const me = group.members.find(
    (member) => member.userId === currentUserId,
  );

  const isAdmin = me?.role === "ADMIN";

  const can = (action: keyof GroupPermissions) =>
    isAdmin || group.permissions[action] === "ALL";

  const isCreator = (member: GroupMember) =>
    member.userId === group.createdById;

  const otherMembers = group.members.filter(
    (member) => member.userId !== currentUserId,
  );

  /*
   * The last admin can't leave without
   * handing the role to someone else.
   */
  const mustPickAdmin =
    isAdmin &&
    otherMembers.length > 0 &&
    !otherMembers.some((member) => member.role === "ADMIN");

  /**
   * Run a group mutation; the server answers with
   * the new group state.
   */
  const mutate = async (
    url: string,
    body: Record<string, unknown>,
    successMessage?: string,
    confirmOptions?: ConfirmOptions,
  ) => {
    if (confirmOptions && !(await confirm(confirmOptions))) {
      return false;
    }

    try {
      setBusy(true);

      const response = await axios.post<GroupDetails>(
        url,
        { conversationId: group.conversationId, ...body },
        { withCredentials: true },
      );

      if (response.data?.members) {
        onGroupChange(response.data);
      }

      if (successMessage) {
        toast.success(successMessage);
      }

      return true;
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Something went wrong."),
      );

      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = async () => {
    const changes = [
      ...changed("Group name", group.name, name.trim()),
      ...changed(
        "Description",
        group.description ?? "",
        description.trim(),
      ),
    ];

    if (changes.length === 0) {
      setEditingInfo(false);
      return;
    }

    const ok = await mutate(
      API_ENDPOINTS.UpdateGroup,
      { name, description },
      "Group info updated.",
      {
        title: "Update group info?",
        description: "Every member will see the change.",
        changes,
        confirmLabel: "Save",
      },
    );

    if (ok) {
      setEditingInfo(false);
    }
  };

  const addMembers = async () => {
    const ok = await mutate(
      API_ENDPOINTS.AddGroupMembers,
      { userIds: newMembers.map((user) => user.userId) },
      newMembers.length === 1
        ? `${newMembers[0].fullName} added.`
        : `${newMembers.length} people added.`,
      {
        title: `Add ${newMembers.length === 1 ? "this person" : `${newMembers.length} people`} to "${group.name}"?`,
        changes: [
          {
            label: "Members",
            from: String(group.members.length),
            to: String(group.members.length + newMembers.length),
          },
        ],
        consequences: newMembers.map(
          (user) => `${user.fullName} (@${user.publicId}) will see new messages.`,
        ),
        confirmLabel: "Add",
      },
    );

    if (ok) {
      setAdding(false);
      setNewMembers([]);
    }
  };

  const leave = async () => {
    try {
      setBusy(true);

      await axios.post(
        API_ENDPOINTS.LeaveGroup,
        {
          conversationId: group.conversationId,
          newAdminId: mustPickAdmin ? Number(newAdminId) : undefined,
        },
        { withCredentials: true },
      );

      toast.success(`You left "${group.name}".`);

      onLeft();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Couldn't leave the group."),
      );
    } finally {
      setBusy(false);
      setConfirmLeave(false);
    }
  };

  return (
    <Flex direction="column" className="h-full min-h-0">
      {onBack && (
        <Box p="3" className="shrink-0 border-b border-[var(--gray-a4)]">
          <IconButton
            variant="ghost"
            color="gray"
            onClick={onBack}
            aria-label="Back to chat"
          >
            <ArrowLeft size={18} />
          </IconButton>
        </Box>
      )}

      <ScrollArea type="auto" scrollbars="vertical">
        <Flex direction="column" gap="4" p="4">
          {/* ==================================================
              HEADER / INFO
          ================================================== */}

          <Flex direction="column" align="center" gap="2">
            <Avatar
              size="6"
              radius="full"
              color="indigo"
              variant="soft"
              fallback={initialsOf(group.name)}
            />

            {editingInfo ? (
              <Flex direction="column" gap="2" width="100%">
                <TextField.Root
                  value={name}
                  maxLength={100}
                  placeholder="Group name"
                  onChange={(event) => setName(event.target.value)}
                />

                <TextArea
                  value={description}
                  maxLength={500}
                  rows={3}
                  placeholder="Description (optional)"
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                />

                <Flex gap="2" justify="end">
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={() => setEditingInfo(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={saveInfo}
                    loading={busy}
                    disabled={!name.trim()}
                  >
                    Save
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <>
                <Flex align="center" gap="2">
                  <Text size="4" weight="bold" align="center">
                    {group.name}
                  </Text>

                  {can("editInfo") && (
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label="Edit group info"
                      onClick={() => {
                        setName(group.name);
                        setDescription(group.description ?? "");
                        setEditingInfo(true);
                      }}
                    >
                      <Pencil size={14} />
                    </IconButton>
                  )}
                </Flex>

                <Text size="2" color="gray">
                  Group · {group.members.length} member
                  {group.members.length === 1 ? "" : "s"}
                </Text>

                {group.description && (
                  <Text
                    size="2"
                    align="center"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {group.description}
                  </Text>
                )}
              </>
            )}
          </Flex>

          <Separator size="4" />

          {/* ==================================================
              MEMBERS
          ================================================== */}

          <Flex align="center" justify="between">
            <Flex align="center" gap="2">
              <Users size={16} />
              <Text size="2" weight="bold">
                Members
              </Text>
            </Flex>

            {can("addMembers") && !adding && (
              <Button
                size="1"
                variant="soft"
                onClick={() => setAdding(true)}
              >
                <UserPlus size={14} />
                Add
              </Button>
            )}
          </Flex>

          {adding && (
            <Card>
              <Flex direction="column" gap="3">
                <UserPicker
                  selected={newMembers}
                  onChange={setNewMembers}
                  excludeUserIds={group.members.map(
                    (member) => member.userId,
                  )}
                />

                <Flex gap="2" justify="end">
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={() => {
                      setAdding(false);
                      setNewMembers([]);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={addMembers}
                    loading={busy}
                    disabled={newMembers.length === 0}
                  >
                    Add {newMembers.length || ""}
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}

          <Flex direction="column" gap="1">
            {group.members.map((member) => {
              const isMe = member.userId === currentUserId;

              const canRemove =
                isAdmin &&
                !isMe &&
                !isCreator(member) &&
                (member.role === "MEMBER" ||
                  currentUserId === group.createdById);

              const canPromote =
                isAdmin && member.role === "MEMBER";

              const canDemote =
                isAdmin &&
                member.role === "ADMIN" &&
                !isCreator(member) &&
                (isMe || currentUserId === group.createdById);

              const hasActions =
                canRemove || canPromote || canDemote;

              return (
                <Flex
                  key={member.userId}
                  align="center"
                  gap="3"
                  className="rounded px-2 py-2 hover:bg-[var(--gray-a3)]"
                >
                  <Avatar
                    size="2"
                    radius="full"
                    fallback={initialsOf(member.fullName)}
                  />

                  <Box className="min-w-0 flex-1">
                    <Link
                      href={`/${encodeURIComponent(member.publicId)}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {member.fullName}
                      {isMe ? " (You)" : ""}
                    </Link>

                    <Text size="1" color="gray" className="block truncate">
                      @{member.publicId}
                    </Text>
                  </Box>

                  {isCreator(member) ? (
                    <Badge color="amber" variant="soft">
                      <Crown size={12} />
                      Creator
                    </Badge>
                  ) : (
                    member.role === "ADMIN" && (
                      <Badge color="blue" variant="soft">
                        <Shield size={12} />
                        Admin
                      </Badge>
                    )
                  )}

                  {hasActions && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="gray"
                          aria-label={`Actions for ${member.fullName}`}
                          disabled={busy}
                        >
                          <MoreHorizontal size={16} />
                        </IconButton>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Content align="end">
                        {canPromote && (
                          <DropdownMenu.Item
                            onSelect={() =>
                              mutate(
                                API_ENDPOINTS.SetGroupRole,
                                {
                                  userId: member.userId,
                                  role: "ADMIN",
                                },
                                `${member.fullName} is now an admin.`,
                                {
                                  title: `Make ${member.fullName} an admin?`,
                                  changes: [
                                    {
                                      label: `${member.fullName}'s role`,
                                      from: "Member",
                                      to: "Admin",
                                    },
                                  ],
                                  consequences: [
                                    "Admins can add and remove members, change roles and group settings.",
                                  ],
                                  confirmLabel: "Make admin",
                                },
                              )
                            }
                          >
                            Make admin
                          </DropdownMenu.Item>
                        )}

                        {canDemote && (
                          <DropdownMenu.Item
                            onSelect={() =>
                              mutate(
                                API_ENDPOINTS.SetGroupRole,
                                {
                                  userId: member.userId,
                                  role: "MEMBER",
                                },
                                undefined,
                                {
                                  title: isMe
                                    ? "Step down as admin?"
                                    : `Dismiss ${member.fullName} as admin?`,
                                  changes: [
                                    {
                                      label: isMe
                                        ? "Your role"
                                        : `${member.fullName}'s role`,
                                      from: "Admin",
                                      to: "Member",
                                    },
                                  ],
                                  confirmLabel: isMe
                                    ? "Step down"
                                    : "Dismiss",
                                  danger: true,
                                },
                              )
                            }
                          >
                            {isMe
                              ? "Step down as admin"
                              : "Dismiss as admin"}
                          </DropdownMenu.Item>
                        )}

                        {canRemove && (
                          <>
                            <DropdownMenu.Separator />

                            <DropdownMenu.Item
                              color="red"
                              onSelect={() =>
                                mutate(
                                  API_ENDPOINTS.RemoveGroupMember,
                                  { userId: member.userId },
                                  `${member.fullName} removed.`,
                                  {
                                    title: `Remove ${member.fullName}?`,
                                    consequences: [
                                      `${member.fullName} leaves "${group.name}" and stops getting its messages.`,
                                      "They can be added back later.",
                                    ],
                                    confirmLabel: "Remove",
                                    danger: true,
                                  },
                                )
                              }
                            >
                              Remove from group
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )}
                </Flex>
              );
            })}
          </Flex>

          <Separator size="4" />

          {/* ==================================================
              PERMISSIONS
          ================================================== */}

          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Shield size={16} />
              <Text size="2" weight="bold">
                Who can…
              </Text>
            </Flex>

            {isAdmin ? (
              <Link
                href={`${Routes.Settings}?tab=groups`}
                className="text-xs text-[var(--accent-11)] hover:underline"
              >
                Change in Settings → Groups (requires verification)
              </Link>
            ) : (
              <Text size="1" color="gray">
                Only admins can change these settings.
              </Text>
            )}

            {(
              Object.keys(PERMISSION_LABELS) as Array<
                keyof GroupPermissions
              >
            ).map((action) => (
              <Flex
                key={action}
                align="center"
                justify="between"
                gap="3"
              >
                <Text size="2">{PERMISSION_LABELS[action]}</Text>

                <Badge variant="soft" color="gray">
                  {group.permissions[action] === "ALL"
                    ? "All members"
                    : "Only admins"}
                </Badge>
              </Flex>
            ))}
          </Flex>

          <Separator size="4" />

          <Button
            color="red"
            variant="soft"
            onClick={() => {
              setNewAdminId("");
              setConfirmLeave(true);
            }}
            disabled={busy}
          >
            <LogOut size={15} />
            Leave group
          </Button>
        </Flex>
      </ScrollArea>

      {confirmDialog}

      <AlertDialog.Root
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Leave “{group.name}”?</AlertDialog.Title>

          <AlertDialog.Description size="2">
            You&apos;ll stop receiving messages from this group.
            {mustPickAdmin &&
              " You're the only admin, so choose who takes over before you leave."}
          </AlertDialog.Description>

          {mustPickAdmin && (
            <Flex direction="column" gap="1" mt="3">
              <Text size="1" weight="medium" color="gray">
                New admin
              </Text>

              <Select.Root
                value={newAdminId}
                onValueChange={setNewAdminId}
              >
                <Select.Trigger placeholder="Choose a member…" />
                <Select.Content>
                  {otherMembers.map((member) => (
                    <Select.Item
                      key={member.userId}
                      value={String(member.userId)}
                    >
                      {member.fullName} (@{member.publicId})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          )}

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>

            <Button
              color="red"
              onClick={leave}
              loading={busy}
              disabled={mustPickAdmin && !newAdminId}
            >
              {mustPickAdmin ? "Make admin & leave" : "Leave"}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Flex>
  );
};

export default GroupPanel;
