"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { Badge, Box, Button, Flex, Separator, Text } from "@radix-ui/themes";

import { Monitor, Smartphone } from "lucide-react";

import API_ENDPOINTS, { ActiveSession } from "@/app/routes/api";
import { getErrorMessage } from "@/app/lib/apiError";

import { Muted, SettingsCard } from "./ui";
import { ConfirmOptions } from "../shared/useConfirm";

/**
 * "Chrome on macOS" from a user-agent string.
 * Good enough for a session list; not exhaustive.
 */
const describeDevice = (userAgent: string) => {
  const ua = userAgent || "";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;

  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;

  const isMobile = /Mobile|iPhone|Android/.test(ua);

  const label =
    browser && os
      ? `${browser} on ${os}`
      : browser || os || "Unknown device";

  return { label, isMobile };
};

const formatWhen = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 5) {
    return "Active now";
  }

  if (minutes < 60) {
    return `Active ${minutes} min ago`;
  }

  if (minutes < 24 * 60) {
    return `Active ${Math.floor(minutes / 60)} h ago`;
  }

  return `Active ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
};

interface SessionsSectionProps {
  protect: (options: ConfirmOptions) => Promise<string | null>;
  /** Bumped on live login/logout events. */
  refreshKey?: number;
}

const SessionsSection: React.FC<SessionsSectionProps> = ({
  protect,
  refreshKey = 0,
}) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | "others" | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);

      const response = await axios.post<ActiveSession[]>(
        API_ENDPOINTS.Sessions,
        {},
        { withCredentials: true },
      );

      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't load sessions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates: refresh without the "Loading…" flash.
  useEffect(() => {
    if (refreshKey > 0) {
      void load(true);
    }
  }, [refreshKey, load]);

  const revoke = async (session: ActiveSession) => {
    const verificationToken = await protect({
      title: "Sign out this device?",
      consequences: [
        `${describeDevice(session.deviceInfo).label} (${session.ipAddress}) will be signed out.`,
        "Anyone using it will need to log in again.",
      ],
      confirmLabel: "Continue",
      danger: true,
    });

    if (!verificationToken) {
      return;
    }

    try {
      setBusyId(session.sessionId);

      await axios.post(
        API_ENDPOINTS.RevokeSession,
        { sessionId: session.sessionId, verificationToken },
        { withCredentials: true },
      );

      toast.success("Signed out of that device.");
      void load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't sign out that device."));
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    // Several sessions can share a device and IP:
    // list each once, with a count.
    const counts = new Map<string, number>();

    for (const session of sessions) {
      if (session.isCurrent) continue;

      const label = `${describeDevice(session.deviceInfo).label} (${session.ipAddress})`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const verificationToken = await protect({
      title: "Sign out all other devices?",
      consequences: [
        ...[...counts].map(([label, count]) =>
          count > 1 ? `${label} — ${count} sessions` : label,
        ),
        "This device stays signed in.",
      ],
      confirmLabel: "Continue",
      danger: true,
    });

    if (!verificationToken) {
      return;
    }

    try {
      setBusyId("others");

      await axios.post(
        API_ENDPOINTS.RevokeOtherSessions,
        { verificationToken },
        { withCredentials: true },
      );

      toast.success("Signed out of all other devices.");
      void load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't sign out other devices."));
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions.filter((session) => !session.isCurrent);

  return (
    <SettingsCard
      title="Where you're logged in"
      description="Devices with an active session. Signing a device out asks you to verify it's you."
      action={
        others.length > 0 && (
          <Button
            variant="soft"
            color="red"
            onClick={revokeOthers}
            loading={busyId === "others"}
          >
            Sign out all others
          </Button>
        )
      }
    >
      {loading ? (
        <Muted>Loading…</Muted>
      ) : sessions.length === 0 ? (
        <Muted>No active sessions.</Muted>
      ) : (
        <Flex direction="column">
          {sessions.map((session, index) => {
            const device = describeDevice(session.deviceInfo);
            const Icon = device.isMobile ? Smartphone : Monitor;

            return (
              <Box key={session.sessionId}>
                {index > 0 && <Separator size="4" />}

                <Flex align="center" gap="3" py="3">
                  <Icon size={20} className="shrink-0 text-[var(--gray-10)]" />

                  <Box className="min-w-0 flex-1">
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium" className="truncate">
                        {device.label}
                      </Text>
                      {session.isCurrent && (
                        <Badge color="green" variant="soft">
                          This device
                        </Badge>
                      )}
                    </Flex>

                    <Text size="1" color="gray" as="div" className="truncate">
                      {session.ipAddress} ·{" "}
                      {session.isCurrent
                        ? "Active now"
                        : formatWhen(session.lastActiveAt)}
                      {" · Signed in "}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </Text>
                  </Box>

                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      color="red"
                      onClick={() => revoke(session)}
                      loading={busyId === session.sessionId}
                    >
                      Sign out
                    </Button>
                  )}
                </Flex>
              </Box>
            );
          })}
        </Flex>
      )}
    </SettingsCard>
  );
};

export default SessionsSection;
