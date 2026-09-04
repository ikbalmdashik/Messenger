"use client";

import { User } from "@/app/hooks/user/useAllUsers";
import useCurrentUser from "@/app/hooks/user/useCurrentUser";
import React, { useMemo } from "react";
import { motion } from "framer-motion";

import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  Card,
  IconButton,
  ScrollArea,
  Separator,
} from "@radix-ui/themes";

import {
  BadgeAlert,
  BadgeCheck,
  Mail,
  Phone,
  Video,
  BellOff,
  FolderCheck,
  UserCheck,
  Info,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

interface RightbarProps {
  receiverId: number | null;
  onBack?: () => void;
}

// Empty State
const EmptyState = React.memo(() => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    className="h-full w-full p-6 text-center"
  >
    <Box className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50 mb-3">
      <Info className="w-7 h-7 text-sky-500 opacity-80" />
    </Box>

    <Text
      size="3"
      weight="bold"
      className="text-slate-700 dark:text-slate-200"
    >
      User Details
    </Text>

    <Text size="2" color="gray" className="mt-1 max-w-xs">
      Select a chat from the sidebar to view profile details and shared media.
    </Text>
  </Flex>
));

EmptyState.displayName = "EmptyState";

// Quick Actions
const ActionButtons = React.memo(() => (
  <Flex justify="between" align="center" className="pt-1">
    <IconButton
      variant="soft"
      color="sky"
      radius="full"
      size="2"
      className="cursor-pointer"
    >
      <Phone className="w-4 h-4" />
    </IconButton>

    <IconButton
      variant="soft"
      color="sky"
      radius="full"
      size="2"
      className="cursor-pointer"
    >
      <Video className="w-4 h-4" />
    </IconButton>

    <IconButton
      variant="soft"
      color="gray"
      radius="full"
      size="2"
      className="cursor-pointer"
    >
      <Mail className="w-4 h-4" />
    </IconButton>

    <IconButton
      variant="soft"
      color="gray"
      radius="full"
      size="2"
      className="cursor-pointer"
    >
      <BellOff className="w-4 h-4" />
    </IconButton>
  </Flex>
));

ActionButtons.displayName = "ActionButtons";

// User Overview
const UserOverview = React.memo(
  ({ userId }: { userId: number | null }) => (
    <Card
      variant="surface"
      className="p-4 rounded-2xl bg-slate-100/40 dark:bg-slate-900/40"
    >
      <Text
        size="2"
        weight="bold"
        className="text-slate-800 dark:text-slate-200 block mb-3"
      >
        User Overview
      </Text>

      <Flex direction="column" gap="2.5">
        <Flex justify="between" align="center">
          <Text size="2" color="gray">
            User ID
          </Text>

          <Text
            size="2"
            weight="medium"
            className="font-mono text-slate-700 dark:text-slate-300"
          >
            #{userId}
          </Text>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="2" color="gray">
            Status
          </Text>

          <Flex align="center" gap="1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />

            <Text
              size="2"
              weight="medium"
              className="text-emerald-500"
            >
              Online
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
);

UserOverview.displayName = "UserOverview";

// Shared Files
const SharedFilesSection = React.memo(() => (
  <Card
    variant="surface"
    className="p-4 rounded-2xl bg-slate-100/40 dark:bg-slate-900/40"
  >
    <Flex align="center" justify="between" className="mb-2">
      <Flex align="center" gap="2">
        <FolderCheck className="w-4 h-4 text-sky-500" />

        <Text
          size="2"
          weight="bold"
          className="text-slate-800 dark:text-slate-200"
        >
          Shared Files
        </Text>
      </Flex>

      <Text
        size="1"
        color="sky"
        className="cursor-pointer hover:underline"
      >
        View All
      </Text>
    </Flex>

    <Flex
      direction="column"
      align="center"
      justify="center"
      className="
        py-6
        text-center
        border
        border-dashed
        border-[var(--gray-a4)]
        rounded-xl
        bg-slate-200/20
        dark:bg-slate-800/20
      "
    >
      <Text size="2" color="gray">
        No shared files yet
      </Text>

      <Text size="1" color="gray" className="opacity-70 mt-0.5">
        Documents sent in chat will appear here
      </Text>
    </Flex>
  </Card>
));

SharedFilesSection.displayName = "SharedFilesSection";

const Rightbar: React.FC<RightbarProps> = ({
  receiverId,
  onBack,
}) => {
  const user: User | null = useCurrentUser(Number(receiverId));

  const initials = useMemo(() => {
    if (!user?.fullName) return "U";

    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.fullName]);

  if (!receiverId || !user) {
    return <EmptyState />;
  }

  return (
    <Flex
      direction="column"
      className="
        h-full
        w-full
        bg-slate-50/50
        dark:bg-slate-950/40
        backdrop-blur-xl
        border-l
        border-[var(--gray-a4)]

        /* Desktop */
        md:static
        md:h-full
        md:w-full
      "
    >
      {/* =====================================================
          MOBILE HEADER (Hidden on desktop via md:hidden)
          ===================================================== */}
      <div className="block md:hidden shrink-0 border-b border-[var(--gray-a4)] backdrop-blur">
        <Flex align="center" gap="2" className="h-14 px-3">
          <IconButton
            variant="ghost"
            color="gray"
            size="2"
            radius="full"
            onClick={() => {
              onBack?.();
            }}
            className="cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </IconButton>

          <Text
            size="3"
            weight="bold"
            className="text-slate-900 dark:text-slate-100"
          >
            User Info
          </Text>
        </Flex>
      </div>

      {/* =====================================================
          CONTENT
          ===================================================== */}
      <ScrollArea
        type="hover"
        scrollbars="vertical"
        className="min-h-0 flex-1"
      >
        <Box p="4" className="space-y-4">

          {/* Main User Profile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card
              variant="surface"
              className="
                p-4
                rounded-2xl
                bg-slate-100/40
                dark:bg-slate-900/40
                backdrop-blur-md
              "
            >
              <Flex
                direction="column"
                align="center"
                justify="center"
                className="text-center py-2"
              >
                <Box className="relative mb-3">
                  <Avatar
                    size="6"
                    radius="full"
                    fallback={initials}
                    color="sky"
                    variant="soft"
                    className="ring-2 ring-sky-500/30"
                  />

                  <span
                    className="
                      absolute
                      bottom-0
                      right-0
                      w-3.5
                      h-3.5
                      bg-emerald-500
                      border-2
                      border-slate-900
                      rounded-full
                    "
                  />
                </Box>

                <Flex
                  align="center"
                  gap="1.5"
                  className="mb-0.5"
                >
                  <Text
                    size="4"
                    weight="bold"
                    className="text-slate-900 dark:text-slate-100"
                  >
                    {user.fullName || "User Profile"}
                  </Text>

                  {user.isEmailVerified ? (
                    <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <BadgeAlert className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  className="truncate max-w-[220px] mb-2"
                >
                  {user.email}
                </Text>

                <Flex gap="2" align="center" className="mt-1">
                  <Badge
                    color={user.isEmailVerified ? "green" : "amber"}
                    variant="soft"
                    size="1"
                  >
                    {user.isEmailVerified
                      ? "Verified Account"
                      : "Unverified"}
                  </Badge>

                  {user.role && (
                    <Badge
                      color="sky"
                      variant="surface"
                      size="1"
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  )}
                </Flex>
              </Flex>

              <Separator size="4" className="my-3 opacity-50" />

              <ActionButtons />
            </Card>
          </motion.div>

          <UserOverview userId={user.userId} />

          <SharedFilesSection />

          {/* Options */}
          <Card
            variant="surface"
            className="
              p-3
              rounded-2xl
              bg-slate-100/40
              dark:bg-slate-900/40
            "
          >
            <Flex direction="column" gap="2">
              <Flex
                align="center"
                gap="2.5"
                className="
                  p-2
                  rounded-lg
                  hover:bg-slate-200/50
                  dark:hover:bg-slate-800/50
                  cursor-pointer
                  transition-colors
                "
              >
                <UserCheck className="w-4 h-4 text-slate-500" />

                <Text
                  size="2"
                  className="text-slate-700 dark:text-slate-300"
                >
                  Contact Information
                </Text>
              </Flex>

              <Flex
                align="center"
                gap="2.5"
                className="
                  p-2
                  rounded-lg
                  hover:bg-rose-500/10
                  cursor-pointer
                  transition-colors
                  text-rose-500
                "
              >
                <ShieldAlert className="w-4 h-4" />

                <Text size="2" weight="medium">
                  Report or Block User
                </Text>
              </Flex>
            </Flex>
          </Card>

        </Box>
      </ScrollArea>
    </Flex>
  );
};

export default React.memo(Rightbar);