"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  Badge,
  Box,
  Button,
  Flex,
  Select,
  Separator,
  Text,
} from "@radix-ui/themes";

import { ChevronDown, ChevronUp, Users } from "lucide-react";

import API_ENDPOINTS, {
  GroupInviteLevel,
  GroupPermissions,
  MyGroupSummary,
  MyProfile,
  PermissionLevel,
  UserGroupSettings,
} from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";

import { Muted, SettingRow, SettingsCard } from "./ui";
import { changed, ChangeItem, ConfirmOptions } from "../shared/useConfirm";

const levelLabel = (level: PermissionLevel) =>
  level === "ALL" ? "All members" : "Only admins";

const permissionChanges = (
  from: GroupPermissions,
  to: GroupPermissions,
): ChangeItem[] =>
  PERMISSION_ROWS.flatMap((row) =>
    changed(row.label, levelLabel(from[row.key]), levelLabel(to[row.key])),
  );

const PERMISSION_ROWS: {
  key: keyof GroupPermissions;
  label: string;
}[] = [
  { key: "sendMessages", label: "Send messages" },
  { key: "addMembers", label: "Add members" },
  { key: "editInfo", label: "Edit group name & description" },
];

const INVITE_OPTIONS: { value: GroupInviteLevel; label: string }[] = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "CONTACTS", label: "People I chat with" },
  { value: "NOBODY", label: "Nobody" },
];

const LevelSelect = ({
  value,
  onChange,
  disabled,
}: {
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
  disabled?: boolean;
}) => (
  <Select.Root
    value={value}
    onValueChange={(next) => onChange(next as PermissionLevel)}
    disabled={disabled}
  >
    <Select.Trigger className="w-40" />
    <Select.Content>
      <Select.Item value="ALL">All members</Select.Item>
      <Select.Item value="ADMINS">Only admins</Select.Item>
    </Select.Content>
  </Select.Root>
);

const samePermissions = (a: GroupPermissions, b: GroupPermissions) =>
  PERMISSION_ROWS.every((row) => a[row.key] === b[row.key]);

interface GroupsSectionProps {
  profile: MyProfile;
  onProfileChange: (profile: MyProfile) => void;
  protect: (options: ConfirmOptions) => Promise<string | null>;
}

const GroupsSection: React.FC<GroupsSectionProps> = ({
  profile,
  onProfileChange,
  protect,
}) => {
  /* ----------------------------------------------------------
     Defaults
  ---------------------------------------------------------- */

  const [settings, setSettings] = useState<UserGroupSettings>(
    profile.groupSettings,
  );
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    setSettings(profile.groupSettings);
  }, [profile.groupSettings]);

  const defaultsChanged =
    settings.whoCanAddMe !== profile.groupSettings.whoCanAddMe ||
    !samePermissions(settings.defaults, profile.groupSettings.defaults);

  const saveDefaults = async () => {
    const inviteLabel = (value: GroupInviteLevel) =>
      INVITE_OPTIONS.find((option) => option.value === value)?.label ?? value;

    const verificationToken = await protect({
      title: "Save group settings?",
      description: "Defaults apply to groups you create from now on.",
      changes: [
        ...changed(
          "Who can add me to groups",
          inviteLabel(profile.groupSettings.whoCanAddMe),
          inviteLabel(settings.whoCanAddMe),
        ),
        ...permissionChanges(
          profile.groupSettings.defaults,
          settings.defaults,
        ).map((change) => ({
          ...change,
          label: `New groups · ${change.label}`,
        })),
      ],
      confirmLabel: "Continue",
    });

    if (!verificationToken) {
      return;
    }

    try {
      setSavingDefaults(true);

      const response = await axios.post<UserGroupSettings>(
        API_ENDPOINTS.UpdateGroupSettings,
        {
          verificationToken,
          defaults: settings.defaults,
          whoCanAddMe: settings.whoCanAddMe,
        },
        { withCredentials: true },
      );

      onProfileChange({ ...profile, groupSettings: response.data });
      toast.success("Group settings saved.");

      void loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't save group settings."));
    } finally {
      setSavingDefaults(false);
    }
  };

  /* ----------------------------------------------------------
     My groups
  ---------------------------------------------------------- */

  const [groups, setGroups] = useState<MyGroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  const [draft, setDraft] = useState<GroupPermissions | null>(null);
  const [busyGroupId, setBusyGroupId] = useState<number | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);

      const response = await axios.post<MyGroupSummary[]>(
        API_ENDPOINTS.MyGroups,
        {},
        { withCredentials: true },
      );

      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't load your groups."));
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const toggleGroup = (group: MyGroupSummary) => {
    if (openGroupId === group.conversationId) {
      setOpenGroupId(null);
      setDraft(null);
      return;
    }

    setOpenGroupId(group.conversationId);
    setDraft({ ...group.permissions });
  };

  const saveGroup = async (
    group: MyGroupSummary,
    mode: "custom" | "defaults",
  ) => {
    const target =
      mode === "defaults"
        ? profile.groupSettings.defaults
        : draft ?? group.permissions;

    const verificationToken = await protect({
      title:
        mode === "defaults"
          ? `Use your defaults in "${group.name}"?`
          : `Change permissions in "${group.name}"?`,
      description: "Every member will see the new settings.",
      changes: permissionChanges(group.permissions, target),
      confirmLabel: "Continue",
    });

    if (!verificationToken) {
      return;
    }

    try {
      setBusyGroupId(group.conversationId);

      if (mode === "defaults") {
        await axios.post(
          API_ENDPOINTS.ApplyGroupDefaults,
          { conversationId: group.conversationId, verificationToken },
          { withCredentials: true },
        );
      } else {
        await axios.post(
          API_ENDPOINTS.UpdateGroupPermissions,
          {
            conversationId: group.conversationId,
            permissions: draft,
            verificationToken,
          },
          { withCredentials: true },
        );
      }

      toast.success(`"${group.name}" updated.`);

      setOpenGroupId(null);
      setDraft(null);

      void loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't update the group."));
    } finally {
      setBusyGroupId(null);
    }
  };

  return (
    <Flex direction="column" gap="4">
      <SettingsCard
        title="Group defaults"
        description="Applied to new groups you create. Changes ask you to verify it's you."
      >
        <SettingRow
          label="Who can add me to groups"
          hint="Blocked people can never add you"
        >
          <Select.Root
            value={settings.whoCanAddMe}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                whoCanAddMe: value as GroupInviteLevel,
              })
            }
          >
            <Select.Trigger className="w-40" />
            <Select.Content>
              {INVITE_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </SettingRow>

        <Separator size="4" my="2" />

        <Text size="1" weight="bold" color="gray" as="div" mb="1">
          IN GROUPS I CREATE, WHO CAN…
        </Text>

        {PERMISSION_ROWS.map((row) => (
          <SettingRow key={row.key} label={row.label}>
            <LevelSelect
              value={settings.defaults[row.key]}
              onChange={(value) =>
                setSettings({
                  ...settings,
                  defaults: { ...settings.defaults, [row.key]: value },
                })
              }
            />
          </SettingRow>
        ))}

        <Flex justify="end" gap="2" mt="3">
          {defaultsChanged && (
            <Button
              variant="soft"
              color="gray"
              onClick={() => setSettings(profile.groupSettings)}
              disabled={savingDefaults}
            >
              Reset
            </Button>
          )}
          <Button
            onClick={saveDefaults}
            disabled={!defaultsChanged}
            loading={savingDefaults}
          >
            Save
          </Button>
        </Flex>
      </SettingsCard>

      <SettingsCard
        title="My groups"
        description="Groups you admin can use your defaults or custom permissions."
      >
        {loadingGroups ? (
          <Muted>Loading…</Muted>
        ) : groups.length === 0 ? (
          <Muted>You&apos;re not in any groups yet.</Muted>
        ) : (
          <Flex direction="column">
            {groups.map((group, index) => {
              const isOpen = openGroupId === group.conversationId;
              const isAdmin = group.myRole === "ADMIN";
              const busy = busyGroupId === group.conversationId;

              return (
                <Box key={group.conversationId}>
                  {index > 0 && <Separator size="4" />}

                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="flex w-full cursor-pointer items-center gap-3 py-3 text-left"
                  >
                    <Users size={16} className="shrink-0 text-[var(--gray-10)]" />

                    <Box className="min-w-0 flex-1">
                      <Text size="2" weight="medium" className="block truncate">
                        {group.name}
                      </Text>
                      <Text size="1" color="gray">
                        {group.memberCount} members
                        {isAdmin ? " · You're an admin" : ""}
                      </Text>
                    </Box>

                    <Badge
                      variant="soft"
                      color={group.usesDefaults ? "gray" : "blue"}
                    >
                      {group.usesDefaults ? "Default" : "Custom"}
                    </Badge>

                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isOpen && draft && (
                    <Box pb="3" pl="6">
                      {PERMISSION_ROWS.map((row) => (
                        <SettingRow key={row.key} label={row.label}>
                          <LevelSelect
                            value={draft[row.key]}
                            disabled={!isAdmin || busy}
                            onChange={(value) =>
                              setDraft({ ...draft, [row.key]: value })
                            }
                          />
                        </SettingRow>
                      ))}

                      {isAdmin ? (
                        <Flex justify="end" gap="2" mt="2" wrap="wrap">
                          <Button
                            variant="soft"
                            color="gray"
                            disabled={busy || group.usesDefaults}
                            onClick={() => saveGroup(group, "defaults")}
                          >
                            Use my defaults
                          </Button>
                          <Button
                            loading={busy}
                            disabled={samePermissions(draft, group.permissions)}
                            onClick={() => saveGroup(group, "custom")}
                          >
                            Save custom
                          </Button>
                        </Flex>
                      ) : (
                        <Text size="1" color="gray" as="p" mt="1">
                          Only admins can change this group&apos;s settings.
                        </Text>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Flex>
        )}
      </SettingsCard>
    </Flex>
  );
};

export default GroupsSection;
