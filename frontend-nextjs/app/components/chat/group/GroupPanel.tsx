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
  Checkbox,
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
  CheckSquare,
  Crown,
  LogOut,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  ShieldOff,
  TimerOff,
  TimerReset,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
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
import { HighlightAction, Section } from "../shared/PanelParts";
import ProfileHoverCard from "../../shared/ProfileHoverCard";
import SuspendDialog from "../shared/SuspendDialog";
import {
  activeUntil,
  formatUntil,
  nextExpiry,
} from "@/app/lib/suspension";

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

  /** Members section expanded (opened by "Add"). */
  const [membersOpen, setMembersOpen] = useState(true);

  /** Filter the member list by name or @publicId. */
  const [memberQuery, setMemberQuery] = useState("");

  useEffect(() => {
    setMemberQuery("");
  }, [group?.conversationId]);

  /**
   * Chosen successor when the last admin leaves.
   */
  const [newAdminId, setNewAdminId] = useState<string>("");

  /** Multi-select of members (admins only). */
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(),
  );

  /** Who the suspend dialog is for. */
  const [suspendTargets, setSuspendTargets] = useState<
    GroupMember[] | null
  >(null);

  /** Re-render when a suspension runs out. */
  const [, setTick] = useState(0);

  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    setEditingInfo(false);
    setAdding(false);
    setNewMembers([]);
    setMembersOpen(true);
    setSelecting(false);
    setSelectedIds(new Set());
    setSuspendTargets(null);
  }, [group?.conversationId]);

  const expiresAt = nextExpiry(
    group?.members.map((member) => member.suspendedUntil) ?? [],
  );

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const timer = window.setTimeout(
      () => setTick((value) => value + 1),
      Math.min(Math.max(expiresAt - Date.now() + 500, 500), 2 ** 31 - 1),
    );

    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  /* Drop selections of members who left. */
  useEffect(() => {
    if (!group) {
      return;
    }

    setSelectedIds((current) => {
      const ids = new Set(group.members.map((member) => member.userId));
      const next = new Set([...current].filter((id) => ids.has(id)));

      return next.size === current.size ? current : next;
    });
  }, [group]);

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

  /**
   * Delete the chat for me (I stay a member). The
   * server's "conversation_deleted" event closes it.
   */
  const deleteChat = async () => {
    const ok = await confirm({
      title: `Delete "${group.name}" chat?`,
      consequences: [
        "All messages are removed for you.",
        "You stay in the group; new messages will show up again.",
        "Other members keep their copies.",
      ],
      confirmLabel: "Delete chat",
      danger: true,
    });

    if (!ok) {
      return;
    }

    try {
      setBusy(true);

      await axios.post(
        API_ENDPOINTS.DeleteChat,
        { conversationId: group.conversationId },
        { withCredentials: true },
      );

      toast.success("Chat deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't delete the chat."));
    } finally {
      setBusy(false);
    }
  };

  const startAdding = () => {
    setMembersOpen(true);
    setAdding(true);
  };

  /**
   * May I remove / suspend this member? Admins can act
   * on members; only the creator can act on admins.
   */
  const canModerate = (member: GroupMember) =>
    isAdmin &&
    member.userId !== currentUserId &&
    !isCreator(member) &&
    (member.role === "MEMBER" || currentUserId === group.createdById);

  const moderatable = group.members.filter(canModerate);

  const normalizedQuery = memberQuery
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  const visibleMembers = normalizedQuery
    ? group.members.filter(
        (member) =>
          member.fullName.toLowerCase().includes(normalizedQuery) ||
          member.publicId.toLowerCase().includes(normalizedQuery),
      )
    : group.members;

  const selectedMembers = moderatable.filter((member) =>
    selectedIds.has(member.userId),
  );

  const selectedSuspended = selectedMembers.filter((member) =>
    activeUntil(member.suspendedUntil),
  );

  const toggleSelected = (userId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }

      return next;
    });
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const peopleLabel = (members: GroupMember[]) =>
    members.length === 1
      ? members[0].fullName
      : `${members.length} members`;

  const removeMembers = async (members: GroupMember[]) => {
    const ok = await mutate(
      API_ENDPOINTS.RemoveGroupMembers,
      { userIds: members.map((member) => member.userId) },
      `${peopleLabel(members)} removed.`,
      {
        title: `Remove ${peopleLabel(members)}?`,
        changes: [
          {
            label: "Members",
            from: String(group.members.length),
            to: String(group.members.length - members.length),
          },
        ],
        consequences: [
          ...members.map(
            (member) =>
              `${member.fullName} leaves "${group.name}" and stops getting its messages.`,
          ),
          "They can be added back later.",
        ],
        confirmLabel: "Remove",
        danger: true,
      },
    );

    if (ok) {
      stopSelecting();
    }
  };

  const suspendMembers = async (minutes: number | null) => {
    if (!suspendTargets || suspendTargets.length === 0) {
      return;
    }

    const ok = await mutate(
      API_ENDPOINTS.SuspendGroupMembers,
      {
        userIds: suspendTargets.map((member) => member.userId),
        durationMinutes: minutes,
      },
      `${peopleLabel(suspendTargets)} suspended.`,
    );

    if (ok) {
      setSuspendTargets(null);
      stopSelecting();
    }
  };

  const unsuspendMembers = async (members: GroupMember[]) => {
    const ok = await mutate(
      API_ENDPOINTS.UnsuspendGroupMembers,
      { userIds: members.map((member) => member.userId) },
      members.length === 1
        ? `${members[0].fullName} can send messages again.`
        : `${members.length} members can send messages again.`,
      {
        title: `Lift suspension of ${peopleLabel(members)}?`,
        consequences: [
          `${members.length === 1 ? "They" : "They all"} can send messages in "${group.name}" right away.`,
        ],
        confirmLabel: "Lift suspension",
      },
    );

    if (ok) {
      stopSelecting();
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

          {/* ==================================================
              HIGHLIGHTED ACTIONS
          ================================================== */}

          <Flex gap="1">
            <HighlightAction
              icon={<UserPlus size={18} />}
              label="Add people"
              disabled={busy || !can("addMembers")}
              title={
                can("addMembers")
                  ? undefined
                  : "Only admins can add members"
              }
              onClick={startAdding}
            />

            <HighlightAction
              icon={<LogOut size={18} />}
              label="Leave"
              danger
              disabled={busy}
              onClick={() => {
                setNewAdminId("");
                setConfirmLeave(true);
              }}
            />

            <HighlightAction
              icon={<Trash2 size={18} />}
              label="Delete chat"
              danger
              disabled={busy}
              onClick={() => void deleteChat()}
            />
          </Flex>

          <Separator size="4" />

          {/* ==================================================
              MEMBERS
          ================================================== */}

          <Section
            icon={<Users size={15} />}
            title={`Members (${group.members.length})`}
            open={membersOpen}
            onOpenChange={setMembersOpen}
          >
          {selecting && (
            <Flex
              align="center"
              justify="between"
              gap="2"
              mb="2"
              className="rounded bg-[var(--accent-a3)] px-2 py-1.5"
            >
              <Text size="2" weight="medium">
                {selectedMembers.length} selected
              </Text>

              <Button
                size="1"
                variant="ghost"
                color="gray"
                onClick={stopSelecting}
              >
                <X size={13} />
                Cancel
              </Button>
            </Flex>
          )}

          {adding && (
            <Card mb="2">
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

          {group.members.length > 1 && (
            <TextField.Root
              size="2"
              mb="2"
              placeholder="Search members"
              aria-label="Search members"
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setMemberQuery("");
                }
              }}
            >
              <TextField.Slot>
                <Search size={14} />
              </TextField.Slot>

              {memberQuery && (
                <TextField.Slot>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label="Clear search"
                    onClick={() => setMemberQuery("")}
                  >
                    <X size={13} />
                  </IconButton>
                </TextField.Slot>
              )}
            </TextField.Root>
          )}

          {visibleMembers.length === 0 && (
            <Text size="2" color="gray" className="block px-2 py-3 text-center">
              No members match &ldquo;{memberQuery.trim()}&rdquo;.
            </Text>
          )}

          <Flex direction="column" gap="1">
            {visibleMembers.map((member) => {
              const isMe = member.userId === currentUserId;

              const canRemove = canModerate(member);

              const suspendedUntil = activeUntil(member.suspendedUntil);

              const selectable = selecting && canRemove;

              const isSelected = selectedIds.has(member.userId);

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
                  onClick={
                    selectable
                      ? () => toggleSelected(member.userId)
                      : undefined
                  }
                  className={`rounded px-2 py-2 hover:bg-[var(--gray-a3)] ${
                    selectable ? "cursor-pointer" : ""
                  } ${isSelected ? "bg-[var(--accent-a3)]" : ""} ${
                    selecting && !canRemove ? "opacity-60" : ""
                  }`}
                >
                  {selecting && (
                    <Checkbox
                      checked={isSelected}
                      disabled={!canRemove}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={() => toggleSelected(member.userId)}
                      aria-label={`Select ${member.fullName}`}
                    />
                  )}

                  <Avatar
                    size="2"
                    radius="full"
                    fallback={initialsOf(member.fullName)}
                  />

                  <Box className="min-w-0 flex-1">
                    <ProfileHoverCard publicId={member.publicId} side="left">
                      <Link
                        href={`/${encodeURIComponent(member.publicId)}`}
                        // inline-block: the hover card only opens
                        // over the name, not the whole row width.
                        className="inline-block max-w-full truncate align-top text-sm font-medium hover:underline"
                      >
                        {member.fullName}
                        {isMe ? " (You)" : ""}
                      </Link>
                    </ProfileHoverCard>

                    <Text size="1" color="gray" className="block truncate">
                      @{member.publicId}
                    </Text>

                    {suspendedUntil && (
                      <Text
                        size="1"
                        color="amber"
                        className="mt-0.5 flex items-center gap-1"
                      >
                        <TimerOff size={11} className="shrink-0" />
                        Suspended {formatUntil(suspendedUntil)}
                      </Text>
                    )}
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

                  {selecting
                    ? canRemove && (
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            <IconButton
                              size="1"
                              variant="ghost"
                              color="gray"
                              aria-label="Actions for selected members"
                              disabled={busy}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal size={16} />
                            </IconButton>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Content
                            align="end"
                            // React bubbles portal clicks to the
                            // row, which would toggle selection
                            // a second time.
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenu.Item
                              onSelect={() => toggleSelected(member.userId)}
                            >
                              <CheckSquare size={14} />
                              {isSelected ? "Unselect" : "Select"}
                            </DropdownMenu.Item>

                            {selectedMembers.length < moderatable.length && (
                              <DropdownMenu.Item
                                onSelect={() =>
                                  setSelectedIds(
                                    new Set(
                                      moderatable.map((item) => item.userId),
                                    ),
                                  )
                                }
                              >
                                <CheckSquare size={14} />
                                Select all ({moderatable.length})
                              </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Separator />

                            <DropdownMenu.Item
                              disabled={selectedMembers.length === 0}
                              onSelect={() => setSuspendTargets(selectedMembers)}
                            >
                              <TimerOff size={14} />
                              Suspend {peopleLabel(selectedMembers)}…
                            </DropdownMenu.Item>

                            {selectedSuspended.length > 0 && (
                              <DropdownMenu.Item
                                onSelect={() =>
                                  void unsuspendMembers(selectedSuspended)
                                }
                              >
                                <TimerReset size={14} />
                                Lift suspension ({selectedSuspended.length})
                              </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Item
                              color="red"
                              disabled={selectedMembers.length === 0}
                              onSelect={() => void removeMembers(selectedMembers)}
                            >
                              <UserMinus size={14} />
                              Remove {peopleLabel(selectedMembers)}
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator />

                            <DropdownMenu.Item onSelect={stopSelecting}>
                              <X size={14} />
                              Cancel selection
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      )
                    : hasActions && (
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

                      <DropdownMenu.Content
                            align="end"
                            // React bubbles portal clicks to the
                            // row, which would toggle selection
                            // a second time.
                            onClick={(event) => event.stopPropagation()}
                          >
                        {canRemove && (
                          <>
                            <DropdownMenu.Item
                              onSelect={() => {
                                setSelecting(true);
                                setSelectedIds(new Set([member.userId]));
                              }}
                            >
                              <CheckSquare size={14} />
                              Select
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator />
                          </>
                        )}

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
                            <Shield size={14} />
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
                            <ShieldOff size={14} />
                            {isMe
                              ? "Step down as admin"
                              : "Dismiss as admin"}
                          </DropdownMenu.Item>
                        )}

                        {canRemove && (
                          <>
                            {(canPromote || canDemote) && <DropdownMenu.Separator />}

                            {suspendedUntil ? (
                              <DropdownMenu.Item
                                onSelect={() =>
                                  void unsuspendMembers([member])
                                }
                              >
                                <TimerReset size={14} />
                                Lift suspension
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item
                                onSelect={() =>
                                  setSuspendTargets([member])
                                }
                              >
                                <TimerOff size={14} />
                                Suspend…
                              </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Item
                              color="red"
                              onSelect={() =>
                                void removeMembers([member])
                              }
                            >
                              <UserMinus size={14} />
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
          </Section>

          {/* ==================================================
              PERMISSIONS
          ================================================== */}

          <Section icon={<Shield size={15} />} title="Who can…">
          <Flex direction="column" gap="2">
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
          </Section>
        </Flex>
      </ScrollArea>

      {confirmDialog}

      <SuspendDialog
        open={suspendTargets !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendTargets(null);
          }
        }}
        targetLabel={suspendTargets ? peopleLabel(suspendTargets) : ""}
        description={
          suspendTargets && suspendTargets.length > 1
            ? `${suspendTargets.map((member) => member.fullName).join(", ")} can still read "${group.name}" but can't send messages until the suspension ends or an admin lifts it.`
            : `They can still read "${group.name}" but can't send messages until the suspension ends or an admin lifts it.`
        }
        busy={busy}
        onConfirm={(minutes) => void suspendMembers(minutes)}
      />

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
