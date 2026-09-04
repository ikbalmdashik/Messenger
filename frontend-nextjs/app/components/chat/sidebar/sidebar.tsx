"use client";

import useAllUsers, { User } from "@/app/hooks/user/useAllUsers";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState, useMemo } from "react";
import ProfileDialog from "../myProfile/profile";
import { Box, Flex, Text, TextField, Button, Avatar, Badge, ScrollArea } from "@radix-ui/themes";
import { Search, Plus, MessageCircle, UserCheck } from "lucide-react";

type ChatSidebarProps = {
  onSelect: (senderId: number | null, receiverId: number | null) => void;
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelect }) => {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers: User[] = useAllUsers();

  useEffect(() => {
    setUserId(Number(sessionStorage.getItem("loginId")));
  }, []);

  // Filter out current user & apply search query
  const filteredUsers = useMemo(() => {
    return allUsers
      .filter((user) => user.userId !== userId)
      .filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
          user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        );
      });
  }, [allUsers, userId, searchQuery]);

  return (
    <Flex direction="column" className="h-full w-full backdrop-blur-xl">
      {/* Header */}
      <Box p="4" className="border-b border-[var(--gray-a4)]">
        <Flex align="center" justify="between" mb="3">
          <Flex align="center" gap="2">
            <MessageCircle className="w-6 h-6 text-sky-500" />
            <Text size="5" weight="bold" className="tracking-tight">
              Chats
            </Text>
          </Flex>

          <ProfileDialog />
        </Flex>

        {/* Search Bar */}
        <TextField.Root
          placeholder="Search contacts..."
          size="2"
          variant="surface"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg"
        >
          <TextField.Slot>
            <Search className="w-4 h-4 text-slate-400" />
          </TextField.Slot>
        </TextField.Root>
      </Box>

      {/* User List */}
      <Box className="flex-1 overflow-hidden">
        <ScrollArea type="hover" scrollbars="vertical" className="h-full px-2 py-2">
          <AnimatePresence>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user: User) => {
                const isSelected = selectedUserId === user.userId;

                return (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setSelectedUserId(user.userId);
                      onSelect(userId, user.userId);
                    }}
                    className={`group relative my-1 p-2.5 rounded cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-sky-500/10 border-sky-500/30 dark:bg-sky-950/40 dark:border-sky-800"
                        : "border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Flex align="center" gap="3">
                      {/* Avatar with fallback initials */}
                      <Box className="relative">
                        <Avatar
                          size="3"
                          radius="full"
                          fallback={user.fullName ? user.fullName.slice(0, 2).toUpperCase() : "U"}
                          color={isSelected ? "sky" : "gray"}
                          variant="soft"
                        />
                      </Box>

                      {/* User Info */}
                      <Box className="flex-1 min-w-0">
                        <Flex align="center" justify="between" gap="1">
                          <Text
                            size="2"
                            weight="bold"
                            className="truncate text-slate-800 dark:text-slate-100"
                          >
                            {user.fullName || "Unknown User"}
                          </Text>
                          {isSelected && (
                            <Badge color="sky" variant="soft" size="1" radius="full">
                              Active
                            </Badge>
                          )}
                        </Flex>

                        <Text size="1" color="gray" className="truncate block mt-0.5">
                          {user.email}
                        </Text>
                      </Box>
                    </Flex>
                  </motion.div>
                );
              })
            ) : (
              <Flex direction="column" align="center" justify="center" className="py-8 text-center">
                <Text size="2" color="gray">
                  No contacts found
                </Text>
              </Flex>
            )}
          </AnimatePresence>
        </ScrollArea>
      </Box>

      {/* Footer */}
      <Box p="3" className="border-t border-[var(--gray-a4)]">
        <Button variant="soft" color="sky" size="2" className="w-full cursor-pointer">
          <Flex align="center" justify="center" gap="2">
            <Plus className="w-4 h-4" />
            <Text weight="medium">New Chat</Text>
          </Flex>
        </Button>
      </Box>
    </Flex>
  );
};

export default ChatSidebar;