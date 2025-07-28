"use client"

import useAllUsers, { User } from "@/app/hooks/user/useAllUsers";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import Profile from "../myProfile/profile";
import ProfileDialog from "../myProfile/profile";

type ChatSidebarProps = {
    onSelect: (senderId: number | null, receiverId: number | null) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelect }) => {
    const [userId, setUserId] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [showProfile, setShowProfile] = useState<boolean>(false);

    const allUsers: User[] = useAllUsers();

    useEffect(() => {
        setUserId(Number(sessionStorage.getItem("loginId")));
    }, [userId]);

    // Function to handle selecting a user
    const handleSelectUser = (id: number | null) => {
        setSelectedUserId(id); // Update the selected userId state
    };

    return (
        <>
            <AnimatePresence>
                {showProfile && (
                    <>
                        {/* Blurred backdrop */}
                        <motion.div
                            className="fixed inset-0 bg-black/30 backdrop-blur z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfile(false)}
                        >
                            <Profile />
                        </motion.div>

                    </>
                )}
            </AnimatePresence>

            <div className="border border-black/30 dark:border-white/20 rounded md:h-[98vh] h-[100vh] md:w-1/4 w-full relative md:top-[1vh] md:left-[1vh] ">
                <div className="border-b border-black/30 dark:border-white/20 sticky top-0 z-50">
                    <h1 className="text-3xl font-bold m-2 italic">Chat</h1>
                    <div
                        className="absolute top-[-8px] right-2 p-2"
                    >
                        <ProfileDialog />
                    </div>

                </div>
                <div className="w-full absolute">
                    {
                        allUsers.map((user: User) => (
                            <label
                                key={user.userId}
                                // onClick={() => {handleSelectUser(user.userId)}}
                                onClick={() => { onSelect(userId, user.userId) }}
                                className={`m-2 outline outline-1 dark:outline-white/20 outline-black/30 grid col-span-1 cursor-pointer rounded transition duration-300 dark:hover:bg-white/20 hover:bg-black/30 
                                    ${selectedUserId === user.userId
                                        ? "bg-black/30 dark:bg-white/20"  // bg-white/20 when selected
                                        : "bg-transparent"  // default state
                                    }`}
                            >
                                <input
                                    type="radio"
                                    value={Number(`${user.userId}`)}
                                    checked={selectedUserId === user.userId} // Bind radio selection to state
                                    onChange={() => handleSelectUser(user.userId)} // Handle selection
                                    // onChange={()=> { onSelect(userId, user.userId) }}
                                    className="hidden" // Hide the radio input
                                />
                                <p className="text-center cursor-pointer py-4">{user.fullName}</p>
                            </label>
                        ))
                    }
                </div>
            </div>
        </>
    );
}

export default ChatSidebar;