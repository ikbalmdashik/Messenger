"use client";

import useChats, { Chat } from "@/app/hooks/chat/useChats";
import useCurrentUser from "@/app/hooks/user/useCurrentUser";
import API_ENDPOINTS from "@/app/routes/api";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip } from "lucide-react";
import { AiOutlineInfoCircle } from "react-icons/ai";

import {
  Box,
  Flex,
  Text,
  Avatar,
  Badge,
  TextField,
  IconButton,
  ScrollArea,
} from "@radix-ui/themes";

import {
  BadgeAlert,
  BadgeCheck,
  Check,
  CheckCheck,
  Send,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

interface MiddlebarProps {
  senderId: number | null;
  receiverId: number | null;
  onBack?: () => void;
  onOpenProfile?: () => void;
}

// Sub-component for message status icons
const StatusIcon = React.memo(({ status }: { status?: any }) => {
  if (status?.toLowerCase() === "seen") {
    return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
  }
  if (status?.toLowerCase() === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
  }
  return <Check className="w-3.5 h-3.5 text-slate-400" />;
});
StatusIcon.displayName = "StatusIcon";

// Helper to safely parse date and time string formats
const parseChatTimestamp = (timestamp?: any) => {
  if (!timestamp) return { datePart: null, timePart: "" };
  if (timestamp.includes(" - ")) {
    const [datePart, timePart] = timestamp.split(" - ");
    return { datePart, timePart };
  }
  return { datePart: null, timePart: timestamp };
};

const Middlebar: React.FC<MiddlebarProps> = ({ senderId, receiverId, onBack, onOpenProfile }) => {
  const receiver = useCurrentUser(Number(receiverId));
  const chatsData = useChats(Number(senderId), Number(receiverId));

  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial chat history from hook
  useEffect(() => {
    if (chatsData) setChats(chatsData);
  }, [chatsData]);

  // Manage persistent WebSocket connection
  useEffect(() => {
    if (!senderId || !receiverId) return;

    const socket = io(API_ENDPOINTS.DefaultURL);
    socketRef.current = socket;

    socket.emit("join_room", { senderId, receiverId });

    socket.on("receive_message", (msg: Chat) => {
      setChats((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [senderId, receiverId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Send message using the persistent socket reference
  const sendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      senderId,
      receiverId,
      message: trimmedMessage,
      status: "sent",
      createdAt: new Date().toISOString(),
    });

    setMessage("");
  }, [message, senderId, receiverId]);

  // Handle enter key trigger
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    sendMessage();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Memoized check for valid user session selection
  const hasSelectedUser = useMemo(() => Boolean(receiver?.userId), [receiver?.userId]);

  if (!hasSelectedUser) {
    return (
      <Flex direction="column" align="center" justify="center" className="h-full w-full p-6 text-center">
        <Box className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50 mb-3">
          <MessageSquare className="w-8 h-8 text-sky-500 opacity-80" />
        </Box>
        <Text size="3" weight="bold" className="text-slate-700 dark:text-slate-200">
          No Conversation Selected
        </Text>
        <Text size="2" color="gray" className="mt-1 max-w-xs">
          Select a contact from the sidebar to view message history and send messages.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" className="h-full w-full backdrop-blur-xl">
      {/* Header */}
      <Box p="3" className="border-b border-[var(--gray-a4)]">
        <Flex align="center" justify="between">
          <Flex align="center" gap="3">
            {onBack && (
              <IconButton
                variant="ghost"
                color="gray"
                size="2"
                onClick={onBack}
                className="md:hidden cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </IconButton>
            )}

            <Avatar
              size="2"
              radius="full"
              fallback={receiver?.fullName ? receiver.fullName.slice(0, 2).toUpperCase() : "U"}
              color="sky"
              variant="soft"
            />

            <Box>
              <Flex align="center" gap="1.5">
                <Text size="3" weight="bold" className="text-slate-800 dark:text-slate-100">
                  {receiver?.fullName}
                </Text>
                {receiver?.isEmailVerified ? (
                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <BadgeAlert className="w-4 h-4 text-rose-500" />
                )}
              </Flex>
              {receiver?.role && (
                <Text size="1" color="gray" className="capitalize block">
                  {receiver.role}
                </Text>
              )}
            </Box>
          </Flex>

          <Flex align="center" gap="2">
            <IconButton
              variant="ghost"
              color="gray"
              onClick={() => onOpenProfile?.()}
            >
              <AiOutlineInfoCircle className="h-5 w-5" />
            </IconButton>
          </Flex>

          <Badge color={receiver?.isEmailVerified ? "green" : "amber"} variant="soft" size="1">
            {receiver?.isEmailVerified ? "Verified User" : "Unverified"}
          </Badge>
        </Flex>
      </Box>

      {/* Messages Feed */}
      <Box className="flex-1 overflow-hidden">
        <ScrollArea type="hover" scrollbars="vertical" className="h-full p-4">
          <AnimatePresence initial={false}>
            {chats.map((chat, idx) => {
              const isMine = chat.senderId === senderId;
              const { datePart, timePart } = parseChatTimestamp(chat.createdAt);

              return (
                <motion.div
                  key={chat.chatId || idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mb-3"
                >
                  <Flex direction="column" align="center" gap="1">
                    {/* Centered Date Separator */}
                    {datePart && (
                      <Text size="1" color="gray" className="my-1 text-[11px] opacity-70">
                        {datePart}
                      </Text>
                    )}

                    {/* Message Row */}
                    <Flex justify={isMine ? "end" : "start"} className="w-full">
                      <Box
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl break-words text-sm shadow-sm transition-all ${isMine
                          ? "bg-sky-600 text-white rounded-br-xs"
                          : "bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-[var(--gray-a3)] rounded-bl-xs"
                          }`}
                      >
                        <Text size="2" className="leading-relaxed whitespace-pre-wrap">
                          {chat.message}
                        </Text>
                      </Box>
                    </Flex>

                    {/* Message Timestamp & Delivery Status */}
                    {isMine && (
                      <Flex align="center" gap="1" className="w-full justify-end px-1">
                        <StatusIcon status={chat.status} />
                        <Text size="1" color="gray" className="text-[10px]">
                          {timePart}
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </ScrollArea>
      </Box>

      {/* Message Input Footer */}
      <Box p="3" className="border-t border-[var(--gray-a4)]">
        <Flex
          align="center"
          gap="2"
          className="
      rounded
      border
      border-[var(--gray-a4)]
      bg-[var(--gray-a2)]
      px-3
      py-2
      transition-colors
      focus-within:border-[var(--accent-a7)]
      focus-within:bg-[var(--gray-a1)]
    "
        >
          {/* Attachment */}
          <IconButton
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            className="
        !rounded-lg
        !p-1.5
        shrink-0
        text-[var(--gray-a8)]
        hover:text-[var(--gray-a11)]
      "
          >
            <Paperclip className="h-4 w-4" />
          </IconButton>

          {/* Message */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);

              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            className="
    min-h-[20px]
    max-h-[120px]
    min-w-0
    flex-1
    resize-none
    overflow-y-auto
    bg-transparent
    text-sm
    leading-6
    text-[var(--gray-a12)]
    placeholder:text-[var(--gray-a8)]
    outline-none
  "
          />

          {/* Send */}
          <IconButton
            type="button"
            size="2"
            variant="ghost"
            color="gray"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`
        !rounded-full
        shrink-0
        transition-all
        duration-200
        ${message.trim()
                ? `
              !text-[var(--gray-a12)]
              hover:!bg-[var(--gray-a4)]
              hover:scale-105
              active:scale-90
            `
                : `
              !text-[var(--gray-a6)]
              opacity-60
            `
              }
      `}
          >
            <Send className="h-4 w-4" />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
};

export default React.memo(Middlebar);