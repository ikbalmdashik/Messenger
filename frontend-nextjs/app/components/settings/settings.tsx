"use client";

import React, { useCallback, useEffect, useState } from "react";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";

import {
  ArrowLeft,
  Ban,
  Eye,
  MonitorSmartphone,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

import API_ENDPOINTS, { MyProfile } from "@/app/routes/api";
import Routes from "@/app/routes/routes";

import FullScreenSpinner from "../spinner";

import useVerification from "./useVerification";
import useConfirm, { ConfirmOptions } from "../shared/useConfirm";
import ProfileSection from "./ProfileSection";
import PrivacySection from "./PrivacySection";
import GroupsSection from "./GroupsSection";
import SessionsSection from "./SessionsSection";
import BlockedSection from "./BlockedSection";
import AccountSection from "./AccountSection";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "groups", label: "Groups", icon: Users },
  { id: "sessions", label: "Devices", icon: MonitorSmartphone },
  { id: "blocked", label: "Blocked", icon: Ban },
  { id: "account", label: "Account", icon: ShieldAlert },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTab = (value: string | null): value is TabId =>
  TABS.some((tab) => tab.id === value);

const SettingsComponent: React.FC = () => {
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("profile");
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { verify, verificationModal } = useVerification(profile?.email);
  const { confirm, confirmDialog } = useConfirm();

  /**
   * Every protected change: show what will change,
   * then verify with password / OTP. Resolves with
   * the one-time token, or null if cancelled.
   */
  const protect = useCallback(
    async (options: ConfirmOptions) => {
      if (!(await confirm(options))) {
        return null;
      }

      return verify();
    },
    [confirm, verify],
  );

  /*
   * ?tab=groups deep links (e.g. from the group panel).
   */
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");

    if (isTab(requested)) {
      setTab(requested);
    }
  }, []);

  const selectTab = (next: TabId) => {
    setTab(next);

    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  };

  const load = useCallback(async () => {
    try {
      const response = await axios.post<MyProfile>(
        API_ENDPOINTS.MyProfile,
        {},
        { withCredentials: true },
      );

      setProfile(response.data);
    } catch {
      router.replace(Routes.Login);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !profile) {
    return <FullScreenSpinner />;
  }

  const sectionProps = {
    profile,
    onProfileChange: setProfile,
    protect,
  };

  return (
    <Flex direction="column" className="min-h-[100dvh]">
      {/* HEADER */}

      <Flex
        align="center"
        gap="3"
        px="4"
        className="sticky top-0 z-20 h-14 shrink-0 border-b border-[var(--gray-a4)] bg-[var(--color-background)]"
      >
        <Button variant="ghost" color="gray" asChild>
          <Link href={Routes.Chat}>
            <ArrowLeft size={16} />
            Chats
          </Link>
        </Button>

        <Heading size="4">Settings</Heading>

        <Text size="2" color="gray" className="ml-auto hidden truncate sm:block">
          {profile.fullName} · @{profile.publicId}
        </Text>
      </Flex>

      <Flex
        direction={{ initial: "column", md: "row" }}
        className="mx-auto w-full max-w-5xl flex-1"
      >
        {/* NAVBAR: tabs on mobile, sidebar on desktop */}

        <nav
          aria-label="Settings sections"
          className="
            sticky top-14 z-10 shrink-0 border-b border-[var(--gray-a4)]
            bg-[var(--color-background)]
            md:static md:w-56 md:border-b-0 md:border-r md:py-4
          "
        >
          <ul className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:px-3 md:py-0">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;

              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => selectTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[var(--accent-a4)] font-medium text-[var(--accent-12)]"
                        : "text-[var(--gray-11)] hover:bg-[var(--gray-a3)]"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CONTENT */}

        <Box className="min-w-0 flex-1 p-4 md:p-6">
          {tab === "profile" && <ProfileSection {...sectionProps} />}
          {tab === "privacy" && <PrivacySection {...sectionProps} />}
          {tab === "groups" && <GroupsSection {...sectionProps} />}
          {tab === "sessions" && <SessionsSection protect={protect} />}
          {tab === "blocked" && <BlockedSection />}
          {tab === "account" && <AccountSection {...sectionProps} />}
        </Box>
      </Flex>

      {confirmDialog}
      {verificationModal}
    </Flex>
  );
};

export default SettingsComponent;
