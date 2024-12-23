"use client"

import useChats, { Chat, initialChat } from "@/app/hooks/chat/useChats";
import { CreateChat } from "@/app/hooks/chat/useCreateChat";
import { useSocket } from "@/app/hooks/socket/useSocket";
import { User } from "@/app/hooks/user/useAllUsers";
import useCurrentUser, { initialUser } from "@/app/hooks/user/useCurrentUser";
import API_ENDPOINTS from "@/app/routes/api";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Middlebar = ({
    senderId,
    receiverId
}: Readonly<{
    senderId: number | null,
    receiverId: number | null
}>
) => {
    const getReceiverData: User | null = useCurrentUser(Number(receiverId));
    const [receiverData, setReceiverData] = useState<User>(initialUser);

    const getChats: Chat[] | null = useChats(Number(senderId), Number(receiverId));
    const [chats, setChats] = useState<Chat[]>(getChats);

    const [message, setMessage] = useState<string | null>(null);

    const createChat: CreateChat = {
        senderId: senderId,
        receiverId: receiverId,
        message: message,
        status: "sent"
    };

    useEffect(() => {
        setReceiverData(getReceiverData);
        setChats(getChats);
    }, [getChats, getReceiverData]);

    useEffect(() => {
        const socket = io(API_ENDPOINTS.DefaultURL);

        // Join a specific room
        const room = { senderId, receiverId };
        socket.emit('join_room', room);

        socket.on('receive_message', (newMessage: any) => {
            setChats((prevMessages) => [...prevMessages, newMessage]);
            console.log(newMessage);
        });

        return () => {
            socket.close();
        }

    }, [getReceiverData]);

    const SendMessageButton = async () => {
        const socket = io(API_ENDPOINTS.DefaultURL);
        socket.emit('send_message', createChat);

        setMessage('');
    }


    if (receiverData.userId == null) {
        return (
            <>
                <h1 className="text-center">Select an user to begin chat.</h1>
            </>
        );
    } else {
        return (
            <>
                <div className="relative top-[0px] h-[98vh] overflow-auto" style={{ scrollbarWidth: "none" }}>
                    {/* chat header */}
                    <div className="border-b border-black/30 dark:border-white/20 sticky top-0 left-10 h-12 bg-white/10 z-50 backdrop-blur">
                        <div className="absolute left-16 md:left-0.5 px-4 top-[3.5px] leading-tight rounded cursor-pointer duration-300 hover:bg-white/40">
                            <p className="text-center">
                                {
                                    receiverData.fullName

                                }
                            </p>
                            <p className="text-sm text-center">
                                {
                                    receiverData.role
                                }
                            </p>
                        </div>
                    </div>

                    {/* chat body */}
                    {
                        chats.map((chat: Chat) => (
                            <div
                                key={chat.chatId}
                                className="my-2"
                            >
                                <p className="text-center text-sm/10 leading-tight opacity-40 sticky top-14">
                                    {chat.createdAt}
                                </p>
                                <div className={`flex flex-col mt-2 ${chat.senderId == senderId ? "items-end" : "items-start"}`}>
                                    <p
                                        className="w-fit max-w-[80%] border border-black/30 dark:border-white/20 rounded p-3 mx-4 break-words backdrop-blur"
                                    >
                                        {chat.message}
                                    </p>
                                    <p
                                        className="text-sm/10 leading-tight opacity-45 mx-4"
                                    >
                                        {chat.status}
                                    </p>
                                </div>
                            </div>
                        ))
                    }
                    {/* chat footer */}
                    <div className="border-black/30 dark:border-white/20 py-1 px-3 sticky bottom-[0px] z-50 backdrop-blur flex flex-row items-center gap-2">
                        <input
                            type="text"
                            value={message || ''}
                            onChange={(e) => { setMessage(e.target.value); }}
                            placeholder="Message..."
                            className={`md:w-[80%] w-[70%] bg-transparent rounded outline outline-white/20 outline-1 duration-300 focus:outline-4 p-2`}
                        />
                        <button
                            type="button"
                            disabled={message == null || message == ""}
                            className={`md:w-[20%] w-[30%] border border-black/30 dark:border-white/20 py-2 rounded duration-300 ${message?.trim() ? "bg-blue-700" : "bg-transparent"}`}
                            onClick={SendMessageButton}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </>
        );
    }
}

export default Middlebar;
