"use client"

import useChats, { Chat, initialChat } from "@/app/hooks/chat/useChats";
import { CreateChat } from "@/app/hooks/chat/useCreateChat";
import { useSocket } from "@/app/hooks/socket/useSocket";
import { User } from "@/app/hooks/user/useAllUsers";
import useCurrentUser, { initialUser } from "@/app/hooks/user/useCurrentUser";
import API_ENDPOINTS from "@/app/routes/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, Edit2, MessageCircle, Send, Trash2, UserPlus } from "lucide-react";
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

    const [message, setMessage] = useState<string>("");

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

        // useSocket(API_ENDPOINTS.DefaultURL, room);

        socket.emit('join_room', room);

        socket.on('receive_message', (newMessage: any) => {
            setChats((prevMessages) => [...prevMessages, newMessage]);
            // console.log(newMessage);
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
                {/* <h1 className="text-center">Select an user to begin chat.</h1> */}

                <div className="flex items-center justify-center h-full px-4">
                    <Card className="w-full max-w-md text-center bg-transparent border border-black/30 dark:border-white/20 shadow-md">
                        <CardHeader className="flex flex-col items-center gap-2">
                            <UserPlus className="w-10 h-10 text-muted-foreground" />
                            <CardTitle className="text-lg text-black dark:text-white">No Conversation Selected</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Select a user from the sidebar to begin chatting.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    } else {
        return (
            <>
                <div className="relative h-[98vh] overflow-auto rounded">
                    {/* Scrollable chat area */}
                    <div className="absolute inset-0 overflow-y-auto pt-12 pb-16 px-2 space-y-2">
                        {chats.length > 0 ? (
                            chats.map((chat: Chat) => (
                                <div key={chat.chatId} className="flex flex-col gap-1 relative">
                                    {/* Timestamp as sticky header */}
                                    <div className="sticky top-2 z-10 flex justify-center">
                                        <span className="text-xs px-2 py-1 rounded-md text-muted-foreground backdrop-blur shadow-sm">
                                            {chat.createdAt}
                                        </span>
                                    </div>

                                    {/* Message bubble */}
                                    <div
                                        className={`flex ${chat.senderId === senderId ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <Card
                                            className={`relative group px-4 py-2 rounded-lg max-w-[80%] border-none whitespace-pre-wrap break-words shadow-md ${chat.senderId === senderId
                                                ? "bg-sky-300/50"
                                                : "bg-white/20"
                                                }`}
                                        >
                                            <p>{chat.message}</p>

                                            {/* Status and icon */}
                                            <div className="flex items-center justify-between mt-1 text-xs opacity-70 gap-2">
                                                <span>{chat.status}</span>
                                                {chat.status === "sent" && (
                                                    <CheckCheck
                                                        size={14}
                                                        className={chat.senderId === senderId ? "text-white" : "text-muted-foreground"}
                                                    />
                                                )}
                                            </div>

                                            {/* Tooltip */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30"
                                            >
                                                <div className="flex flex-col bg-zinc-900 text-xs dark:text-white text-black rounded-md shadow-md overflow-hidden border border-black/10 dark:border-white/10">
                                                    <button
                                                        className="px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="px-3 py-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-500 flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>

                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
                                <MessageCircle className="mb-2 h-6 w-6 opacity-40" />
                                <p>No messages yet</p>
                            </div>
                        )}
                    </div>

                    {/* Header overlay */}
                    <div className="absolute top-0 left-0 right-0 h-12 z-50 backdrop-blur-lg bg-white/10 dark:bg-black/10 border-b border-black/30 dark:border-white/20 flex items-center px-4">
                        <div className="leading-tight cursor-pointer duration-300 hover:bg-white/40 rounded px-2 py-1 absolute md:left-4 left-16">
                            <p className="text-center">{receiverData.fullName}</p>
                            <p className="text-sm text-center">{receiverData.role}</p>
                        </div>
                    </div>

                    {/* Footer overlay */}
                    <div className="absolute bottom-0 left-0 right-0 z-50 backdrop-blur bg-white/10 dark:bg-black/10 border-t border-black/30 dark:border-white/20 py-2 px-3 flex flex-row items-center gap-2">
                        {/* Input & Send */}
                        <Input
                            type="text"
                            value={message || ''}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Message..."
                            className="md:w-[90%] w-[80%] border border-black/30 dark:border-white/20"

                        />
                        <Button
                            onClick={SendMessageButton}
                            disabled={!message.trim()}
                            aria-label="Send message"
                            className={`md:w-[10%] w-[20%] border border-black/30 dark:border-white/20 py-2 rounded duration-300 ${message?.trim() ? "bg-blue-700 text-gray-900" : "bg-transparent text-gray-500"}`}
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </>
        );
    }
}

export default Middlebar;