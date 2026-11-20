"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  Text,
  Tooltip,
} from "@radix-ui/themes";

import { ChevronDown, ChevronUp, UsersRound, X } from "lucide-react";

import API_ENDPOINTS, {
  SavedAccount,
  SavedAccountsResponse,
} from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import { getErrorMessage } from "@/app/lib/apiError";
import { initialsOf } from "@/app/lib/profile";

interface SavedAccountsProps {
  /**
   * Account remembered here but signed out:
   * continue with the password / OTP step.
   */
  onNeedsPassword: (email: string) => void;
  onError: (message: string) => void;
}

/**
 * "Saved accounts" on the login page: every account
 * that has logged in on this browser.
 */
const SavedAccounts: React.FC<SavedAccountsProps> = ({
  onNeedsPassword,
  onError,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await axios.post<SavedAccountsResponse>(
        API_ENDPOINTS.SavedAccounts,
        {},
        { withCredentials: true },
      );

      const list = response.data?.accounts ?? [];

      setAccounts(list);

      // Open by default when there is something to pick.
      setOpen((current) => current || list.length > 0);
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (account: SavedAccount) => {
    if (!account.isSignedIn) {
      onNeedsPassword(account.email);
      return;
    }

    try {
      setBusyId(account.userId);

      await axios.post(
        API_ENDPOINTS.SwitchAccount,
        { userId: account.userId },
        { withCredentials: true },
      );

      window.location.assign(Routes.Chat);
    } catch (error) {
      onError(getErrorMessage(error, "Couldn't open that account."));
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const forget = async (account: SavedAccount) => {
    try {
      setBusyId(account.userId);

      await axios.post(
        API_ENDPOINTS.ForgetAccount,
        { userId: account.userId },
        { withCredentials: true },
      );

      void load();
    } catch (error) {
      onError(getErrorMessage(error, "Couldn't remove that account."));
    } finally {
      setBusyId(null);
    }
  };

  if (accounts.length === 0) {
    return null;
  }

  return (
    <Card mt="4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-2 text-left"
        aria-expanded={open}
      >
        <UsersRound size={16} className="text-[var(--gray-10)]" />
        <Text size="2" weight="medium" className="flex-1">
          Saved accounts ({accounts.length})
        </Text>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <Flex direction="column" mt="3" gap="1">
          {accounts.map((account) => (
            <Flex
              key={account.userId}
              align="center"
              gap="3"
              className="rounded-md px-2 py-2 hover:bg-[var(--gray-a3)]"
            >
              <button
                type="button"
                onClick={() => void choose(account)}
                disabled={busyId !== null}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <Avatar
                  size="2"
                  radius="full"
                  fallback={initialsOf(account.fullName)}
                />

                <Box className="min-w-0 flex-1">
                  <Text size="2" weight="medium" className="block truncate">
                    {account.fullName}
                  </Text>
                  <Text size="1" color="gray" className="block truncate">
                    {account.email}
                  </Text>
                </Box>

                {account.isSignedIn ? (
                  <Badge color="green" variant="soft">
                    {account.isActive ? "Active" : "Signed in"}
                  </Badge>
                ) : (
                  <Badge color="gray" variant="soft">
                    Password needed
                  </Badge>
                )}
              </button>

              {!account.isActive && (
                <Tooltip content="Remove from this device">
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label={`Remove ${account.fullName}`}
                    disabled={busyId !== null}
                    onClick={() => void forget(account)}
                  >
                    <X size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Flex>
          ))}

          <Text size="1" color="gray" mt="1">
            Signed-in accounts open right away. Others ask for your
            password.
          </Text>

          <Button
            variant="ghost"
            size="1"
            mt="1"
            onClick={() => setOpen(false)}
          >
            Use another account
          </Button>
        </Flex>
      )}
    </Card>
  );
};

export default SavedAccounts;
