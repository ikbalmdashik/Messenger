"use client";

import React, { useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";

import API_ENDPOINTS, {
  GroupDetails,
} from "@/app/routes/api";

import { getErrorMessage } from "@/app/lib/apiError";

import UserPicker, {
  PickedUser,
} from "../shared/UserPicker";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: number;
  onCreated: (group: GroupDetails) => void;
}

/**
 * "New group" dialog (opened from the profile
 * menu). The creator becomes the group's admin.
 */
const CreateGroupDialog: React.FC<
  CreateGroupDialogProps
> = ({ open, onOpenChange: setOpen, currentUserId, onCreated }) => {
  const [name, setName] = useState("");
  const [members, setMembers] = useState<PickedUser[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setMembers([]);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give the group a name.");
      return;
    }

    if (members.length === 0) {
      toast.error("Add at least one person.");
      return;
    }

    try {
      setSaving(true);

      const response = await axios.post<GroupDetails>(
        API_ENDPOINTS.CreateGroup,
        {
          name: name.trim(),
          memberIds: members.map((member) => member.userId),
        },
        { withCredentials: true },
      );

      toast.success(`Group "${response.data.name}" created.`);

      setOpen(false);
      reset();

      onCreated(response.data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Couldn't create the group."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          reset();
        }
      }}
    >
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>New group</Dialog.Title>

        <Dialog.Description size="2" color="gray" mb="4">
          You&apos;ll be the group admin and can decide who
          may add people, change the group info or send
          messages.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <label className="flex flex-col gap-1">
            <Text size="1" weight="medium" color="gray">
              Group name
            </Text>

            <TextField.Root
              autoFocus
              value={name}
              maxLength={100}
              placeholder="e.g. Weekend trip"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray">
              Members ({members.length})
            </Text>

            <UserPicker
              selected={members}
              onChange={setMembers}
              excludeUserIds={[currentUserId]}
            />
          </Flex>
        </Flex>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>

          <Button
            onClick={handleCreate}
            loading={saving}
            disabled={!name.trim() || members.length === 0}
          >
            Create group
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreateGroupDialog;
