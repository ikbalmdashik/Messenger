"use client";

import useAllUsers, { User } from "@/app/hooks/user/useAllUsers";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import ProfileDialog from "../myProfile/profile";
import { Button } from "@/components/ui/button";

type ChatSidebarProps = {
  onSelect: (senderId: number | null, receiverId: number | null) => void;
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelect }) => {
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  const allUsers: User[] = useAllUsers();

  useEffect(() => {
    setUserId(Number(sessionStorage.getItem("loginId")));
  }, []);

  return (
    <>
      {/* Sidebar */}
      {/* <div className="h-full w-full bg-white dark:bg-slate-900 border-r flex flex-col"> */}
      <div className="
            h-full w-full
            backdrop-blur-xl
            bg-white/10 dark:bg-black/20
            border-r border-white/20
            flex flex-col
            ">
        {/* Header */}
        <div className="px-4 py-4 border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold">Chat</h1>
          {/* <button onClick={() => setShowProfile(true)}>Profile</button> */}
          <ProfileDialog />
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto py-2">
          {allUsers.map((user: User) => {
            const isSelected = selectedUserId === user.userId;

            return (
              <motion.div
                key={user.userId}
                onClick={() => {
                  setSelectedUserId(user.userId);
                  onSelect(userId, user.userId);
                }}
                className={`mx-3 my-2 p-3 rounded-xl cursor-pointer transition-all
                    ${isSelected
                    ? "bg-blue-500/20 border border-blue-400/30 backdrop-blur-lg"
                    : "hover:bg-white/10"
                    }`}
              >
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant={"outline"} className="w-full">+ New Chat</Button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
