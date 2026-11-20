"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";

import {
  Avatar,
  Box,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";

import {
  ExternalLink,
  LogOut,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import API_ENDPOINTS, {
  SavedAccount,
  SavedAccountsResponse,
} from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import { getErrorMessage } from "@/app/lib/apiError";
import { initialsOf } from "@/app/lib/profile";
import { broadcastAuth, logoutAndRedirect } from "@/app/lib/session";

const AUTH_CHANNEL = "auth_channel";
const MAX_ACCOUNTS = 5;

interface ProfileMenuProps {
  onNewGroup: () => void;
}

/**
 * The sidebar's profile button. Everything account
 * related lives behind it: profile, settings, new
 * group, switching accounts and logging out.
 */
const ProfileMenu: React.FC<ProfileMenuProps> = ({ onNewGroup }) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await axios.post<SavedAccountsResponse>(
        API_ENDPOINTS.SavedAccounts,
        {},
        { withCredentials: true },
      );

      setAccounts(response.data?.accounts ?? []);
    } catch (error) {
      console.log("Failed to load accounts:", error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Other tabs: account switched or logged out.
   */
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
    } catch {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ACCOUNT_SWITCHED") {
        window.location.reload();
      }

      if (event.data?.type === "LOGOUT") {
        window.location.assign(Routes.Login);
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel?.removeEventListener("message", handleMessage);
      channel?.close();
    };
  }, []);

  const active = accounts.find((account) => account.isActive) ?? null;
  const others = accounts.filter((account) => !account.isActive);

  const switchTo = async (account: SavedAccount) => {
    if (!account.isSignedIn) {
      // Needs a password: the login page lists it.
      window.location.assign(`${Routes.Login}?addAccount=1`);
      return;
    }

    try {
      setBusyUserId(account.userId);

      await axios.post(
        API_ENDPOINTS.SwitchAccount,
        { userId: account.userId },
        { withCredentials: true },
      );

      broadcastAuth("ACCOUNT_SWITCHED");
      window.location.assign(Routes.Chat);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't switch account."));
      void load();
    } finally {
      setBusyUserId(null);
    }
  };

  const signOutOther = async (account: SavedAccount) => {
    try {
      setBusyUserId(account.userId);

      await axios.post(
        API_ENDPOINTS.RemoveSavedAccount,
        { userId: account.userId },
        { withCredentials: true },
      );

      toast.success(`${account.fullName} was signed out.`);
      void load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't sign out."));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (open) {
          void load();
        }
      }}
    >
      <DropdownMenu.Trigger>
        <IconButton
          variant="ghost"
          radius="full"
          size="3"
          aria-label="Profile and account options"
          className="cursor-pointer"
        >
          <Avatar
            size="2"
            radius="full"
            color="sky"
            variant="soft"
            fallback={initialsOf(active?.fullName)}
          />
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" style={{ minWidth: 270 }}>
        {/* WHO AM I */}

        {active && (
          <Flex align="center" gap="3" px="2" py="2">
            <Avatar
              size="3"
              radius="full"
              color="sky"
              variant="soft"
              fallback={initialsOf(active.fullName)}
            />
            <Box className="min-w-0">
              <Text size="2" weight="bold" className="block truncate">
                {active.fullName}
              </Text>
              <Text size="1" color="gray" className="block truncate">
                @{active.publicId}
              </Text>
            </Box>
          </Flex>
        )}

        <DropdownMenu.Separator />

        {active && (
          <DropdownMenu.Item asChild>
            <Link href={`/${encodeURIComponent(active.publicId)}`}>
              <ExternalLink size={15} />
              View my profile
            </Link>
          </DropdownMenu.Item>
        )}

        <DropdownMenu.Item asChild>
          <Link href={Routes.Settings}>
            <Settings size={15} />
            Settings
          </Link>
        </DropdownMenu.Item>

        <DropdownMenu.Item onSelect={onNewGroup}>
          <Users size={15} />
          New group
        </DropdownMenu.Item>

        {/* OTHER ACCOUNTS */}

        {others.length > 0 && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Label>Switch account</DropdownMenu.Label>

            {others.map((account) => (
              <DropdownMenu.Item
                key={account.userId}
                disabled={busyUserId !== null}
                onSelect={() => void switchTo(account)}
                style={{ height: "auto", paddingTop: 6, paddingBottom: 6 }}
              >
                <Flex align="center" gap="2" width="100%">
                  <Avatar
                    size="1"
                    radius="full"
                    fallback={initialsOf(account.fullName)}
                  />

                  <Box className="min-w-0 flex-1">
                    <Text size="2" className="block truncate">
                      {account.fullName}
                    </Text>
                    <Text size="1" className="block truncate opacity-70">
                      {account.isSignedIn
                        ? `@${account.publicId}`
                        : "Password needed"}
                    </Text>
                  </Box>

                  {account.isSignedIn && (
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label={`Sign out ${account.fullName}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void signOutOther(account);
                      }}
                    >
                      <X size={13} />
                    </IconButton>
                  )}
                </Flex>
              </DropdownMenu.Item>
            ))}
          </>
        )}

        <DropdownMenu.Item
          disabled={accounts.length >= MAX_ACCOUNTS}
          onSelect={() =>
            window.location.assign(`${Routes.Login}?addAccount=1`)
          }
        >
          <UserPlus size={15} />
          Add another account
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          color="red"
          onSelect={() => {
            logoutAndRedirect().catch((error) =>
              toast.error(getErrorMessage(error, "Logout failed.")),
            );
          }}
        >
          <LogOut size={15} />
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ProfileMenu;
