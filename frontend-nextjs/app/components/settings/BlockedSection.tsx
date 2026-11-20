"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";

import { Avatar, Box, Button, Flex, Separator, Text } from "@radix-ui/themes";

import API_ENDPOINTS, { BlockedUser } from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";
import { initialsOf } from "@/app/lib/profile";

import { Muted, SettingsCard } from "./ui";

const BlockedSection: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.post<BlockedUser[]>(
        API_ENDPOINTS.BlockedUsers,
        {},
        { withCredentials: true },
      );

      setBlocked(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't load blocked people."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (user: BlockedUser) => {
    try {
      setBusyId(user.userId);

      await axios.post(
        API_ENDPOINTS.UnblockUser,
        { userId: user.userId },
        { withCredentials: true },
      );

      setBlocked((previous) =>
        previous.filter((item) => item.userId !== user.userId),
      );

      toast.success(`${user.fullName} was unblocked.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't unblock."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SettingsCard
      title="Blocked people"
      description="Blocked people can't message you, add you to groups or see your private details. Block someone from their chat or profile."
    >
      {loading ? (
        <Muted>Loading…</Muted>
      ) : blocked.length === 0 ? (
        <Muted>You haven&apos;t blocked anyone.</Muted>
      ) : (
        <Flex direction="column">
          {blocked.map((user, index) => (
            <Box key={user.userId}>
              {index > 0 && <Separator size="4" />}

              <Flex align="center" gap="3" py="3">
                <Avatar
                  size="2"
                  radius="full"
                  fallback={initialsOf(user.fullName)}
                />

                <Box className="min-w-0 flex-1">
                  <Link
                    href={`/${encodeURIComponent(user.publicId)}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {user.fullName}
                  </Link>
                  <Text size="1" color="gray">
                    @{user.publicId}
                  </Text>
                </Box>

                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => unblock(user)}
                  loading={busyId === user.userId}
                >
                  Unblock
                </Button>
              </Flex>
            </Box>
          ))}
        </Flex>
      )}
    </SettingsCard>
  );
};

export default BlockedSection;
