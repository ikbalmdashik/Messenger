"use client";

import useAllUsers, {
  User,
} from "@/app/hooks/user/useAllUsers";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import React, {
  useMemo,
  useState,
} from "react";

import ProfileDialog from "../myProfile/profile";

import {
  Box,
  Flex,
  Text,
  TextField,
  Button,
  Avatar,
  Badge,
  ScrollArea,
} from "@radix-ui/themes";

import {
  Search,
  Plus,
  MessageCircle,
  UserCheck,
} from "lucide-react";

interface ChatSidebarProps {
  senderId: number | null;
  onSelect: (receiverId: number) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  senderId,
  onSelect,
}) => {
  const [selectedUserId, setSelectedUserId] =
    useState<number | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const allUsers: User[] = useAllUsers();

  /*
   * Filter users
   *
   * - Remove currently logged-in user
   * - Apply search
   */
  const filteredUsers = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    return allUsers
      .filter((user) => {
        if (senderId === null) {
          return true;
        }

        return (
          Number(user.userId) !==
          Number(senderId)
        );
      })
      .filter((user) => {
        if (!query) {
          return true;
        }

        return (
          user.fullName
            ?.toLowerCase()
            .includes(query) ||
          user.email
            ?.toLowerCase()
            .includes(query)
        );
      });
  }, [
    allUsers,
    senderId,
    searchQuery,
  ]);

  /*
   * Select user
   */
  const handleSelectUser = (
    receiverId: number
  ) => {
    if (senderId === null) {
      console.warn(
        "Cannot select chat because senderId is null"
      );

      return;
    }

    setSelectedUserId(receiverId);

    onSelect(receiverId);
  };

  return (
    <Flex
      direction="column"
      className="h-full w-full backdrop-blur-xl"
    >
      {/* ==============================
          HEADER
      ============================== */}

      <Box className="border-b border-gray-200 dark:border-white/10 p-4">
        <Flex
          align="center"
          justify="between"
        >
          <Flex
            align="center"
            gap="3"
          >
            <Box className="relative">
              <Avatar
                size="3"
                radius="full"
                fallback="C"
              />

              <Box className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
            </Box>

            <Box>
              <Text
                size="3"
                weight="bold"
                className="text-gray-900 dark:text-white"
              >
                Chats
              </Text>

              <Text
                size="1"
                className="block text-gray-500 dark:text-gray-400"
              >
                Messages
              </Text>
            </Box>
          </Flex>

          <Flex gap="2">
            <Button
              variant="soft"
              size="2"
              className="cursor-pointer"
            >
              <Plus size={17} />
            </Button>

            <ProfileDialog />
          </Flex>
        </Flex>
      </Box>

      {/* ==============================
          SEARCH
      ============================== */}

      <Box className="px-4 py-3">
        <TextField.Root
          placeholder="Search people..."
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(
              event.target.value
            )
          }
          size="2"
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      {/* ==============================
          USER LIST
      ============================== */}

      <ScrollArea className="flex-1 min-h-0">
        <Box className="px-2 pb-4">
          <AnimatePresence mode="popLayout">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(
                (user: User) => {
                  const numericUserId =
                    Number(user.userId);

                  const isSelected =
                    selectedUserId ===
                    numericUserId;

                  return (
                    <motion.div
                      key={user.userId}
                      layout
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -10,
                      }}
                      transition={{
                        duration: 0.2,
                      }}
                      onClick={() =>
                        handleSelectUser(
                          numericUserId
                        )
                      }
                      className={`mb-1 cursor-pointer rounded p-3 m-2 transition ${
                        isSelected
                          ? "bg-blue-500/10 dark:bg-blue-500/20"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Flex
                        align="center"
                        justify="between"
                        gap="3"
                      >
                        <Flex
                          align="center"
                          gap="3"
                          className="min-w-0 flex-1"
                        >
                          {/* Avatar */}

                          <Box className="relative shrink-0">
                            <Avatar
                              size="3"
                              radius="full"
                              fallback={
                                user.fullName
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                "U"
                              }
                            />

                            <Box className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                          </Box>

                          {/* User information */}

                          <Box className="min-w-0 flex-1">
                            <Flex
                              align="center"
                              justify="between"
                              gap="2"
                            >
                              <Text
                                size="2"
                                weight="medium"
                                className="truncate text-gray-900 dark:text-white"
                              >
                                {user.fullName ||
                                  "Unknown User"}
                              </Text>

                              {isSelected && (
                                <UserCheck
                                  size={16}
                                  className="shrink-0 text-blue-500"
                                />
                              )}
                            </Flex>

                            <Text
                              size="1"
                              className="block truncate text-gray-500 dark:text-gray-400"
                            >
                              {user.publicId ||
                                ""}
                            </Text>
                          </Box>
                        </Flex>

                        {user.isEmailVerified && (
                          <Badge
                            size="1"
                            color="green"
                            variant="soft"
                          >
                            <MessageCircle
                              size={12}
                            />
                          </Badge>
                        )}
                      </Flex>
                    </motion.div>
                  );
                }
              )
            ) : (
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap="2"
                className="py-12 text-center"
              >
                <Box className="rounded-full bg-gray-100 p-4 dark:bg-white/5">
                  <Search
                    size={22}
                    className="text-gray-400"
                  />
                </Box>

                <Text
                  size="2"
                  weight="medium"
                  className="text-gray-900 dark:text-white"
                >
                  No contacts found
                </Text>

                <Text
                  size="1"
                  className="text-gray-500 dark:text-gray-400"
                >
                  Try a different search
                </Text>
              </Flex>
            )}
          </AnimatePresence>
        </Box>
      </ScrollArea>

      {/* ==============================
          FOOTER
      ============================== */}

      {/* <Box className="border-t border-gray-200 dark:border-white/10 p-3">
        <Button
          variant="soft"
          className="w-full cursor-pointer"
          onClick={() => {
            setSearchQuery("");
          }}
        >
          <Plus size={16} />
          New Chat
        </Button>
      </Box> */}
    </Flex>
  );
};

export default ChatSidebar;