"use client";

import useChats, { Chat } from "@/app/hooks/chat/useChats";
import useCurrentUser from "@/app/hooks/user/useCurrentUser";
import API_ENDPOINTS from "@/app/routes/api";
import { Button } from "@/components/ui/button";
import { IoChevronBackOutline, IoSend } from "react-icons/io5";
import { Input } from "@/components/ui/input";
import { Check, CheckCheck, Send, SendIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const Middlebar = ({
  senderId,
  receiverId,
  onBack,
}: {
  senderId: number | null;
  receiverId: number | null;
  onBack?: () => void;
}) => {
  const receiver = useCurrentUser(Number(receiverId));
  const chatsData = useChats(Number(senderId), Number(receiverId));

  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chats
  useEffect(() => {
    if (chatsData) setChats(chatsData);
  }, [chatsData]);

  // Socket connection
  useEffect(() => {
    const socket = io(API_ENDPOINTS.DefaultURL);

    socket.emit("join_room", { senderId, receiverId });

    socket.on("receive_message", (msg: Chat) => {
      setChats((prev) => [...prev, msg]);
    });

    return () => { socket.disconnect() };
  }, [senderId, receiverId]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const socket = io(API_ENDPOINTS.DefaultURL);

    socket.emit("send_message", {
      senderId,
      receiverId,
      message,
      status: "sent",
      createdAt: new Date(),
    });

    setMessage("");
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "seen") return <CheckCheck size={14} className="text-blue-500" />;
    if (status === "delivered") return <CheckCheck size={14} />;
    return <Check size={14} />;
  };

  if (!receiver?.userId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a user to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full backdrop-blur-xl bg-white/10 dark:bg-black/20 border-l border-white/20 overflow-hidden">

      {/* Header */}
      <div className="h-14 flex items-center px-4 gap-3 border-b border-white/20 backdrop-blur-xl bg-white/10">
        {onBack && (
          <button onClick={onBack} className="md:hidden text-sm">
            <IoChevronBackOutline size={30} />
          </button>
        )}
        <div>
          <p className="font-semibold">{receiver.fullName}</p>
          <p className="text-xs opacity-60">{receiver.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {chats.map((chat) => {
            const isMine = chat.senderId === senderId;

            return (
              <motion.div
                key={chat.chatId}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex w-full"
              >
                <div className="flex flex-col w-full items-center gap-1">
                  {/* Date above bubble, centered */}
                  <div className="text-[11px] text-white/60 mb-1">
                    {chat.createdAt?.split(" - ")[0]}
                  </div>

                  {/* Message bubble wrapper for alignment */}
                  <div
                    className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                          max-w-[75%] px-4 py-2 rounded-2xl
                          break-words whitespace-pre-wrap
                          backdrop-blur-xl border shadow-lg
                          ${isMine
                          ? "bg-blue-500/20 border-blue-400/30 text-white"
                          : "bg-white/10 border-white/20 text-white"
                        }
                      `}
                    >
                      <p className="text-sm">{chat.message}</p>
                    </div>
                  </div>

                  {/* Status with tick + time */}
                  {isMine && (
                    <div className="flex w-full justify-end items-center gap-1 text-[11px] text-white/60 mt-1">
                      <StatusIcon status="Seen" />
                      <span>{chat.createdAt?.split(" - ")[1]}</span>
                    </div>
                  )}
                </div>
              </motion.div>

            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="h-16 flex items-center px-3 border-t border-white/20 backdrop-blur-xl bg-white/10">
        <div className="relative w-full">
          {/* Input */}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="pr-12 h-10 bg-transparent border-white/20 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          {/* Send Button Inside */}
          <button
            onClick={sendMessage}
            disabled={message.trim().length === 0}
            className={`
                absolute right-1 top-1/2 -translate-y-1/2 bg-transparent
                h-8 w-8 flex items-center justify-center
                rounded-sm transition-all duration-200
                ${message.trim().length === 0
                ? "bg-transparent text-white/40 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              }
      `}
          >
            <IoSend size={20} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Middlebar;
