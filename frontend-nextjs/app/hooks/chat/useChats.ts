import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";

export interface Chat {
    chatId: number | null;
    senderId: number | null;
    receiverId: number | null;
    message: string | null;
    status: string | null;
    createdAt: string | null;
}

export const initialChat: Chat = {
    chatId: null,
    senderId: null,
    receiverId: null,
    message: null,
    status: null,
    createdAt: null,
};

const useChats = (
    senderId: number | null,
    receiverId: number | null
) => {
    const [chats, setChats] = useState<Chat[]>([]);

    useEffect(() => {
        // Don't call API until both users are available
        if (senderId === null || receiverId === null) {
            setChats([]);
            return;
        }

        const fetchChatsById = async () => {
            try {
                console.log("Fetching chats:", {
                    senderId,
                    receiverId,
                });

                const response = await axios.post(
                    API_ENDPOINTS.GetChats,
                    {
                        senderId: Number(senderId),
                        receiverId: Number(receiverId),
                    },
                    {
                        withCredentials: true,
                    }
                );

                console.log("Chats response:", response.data);

                if (Array.isArray(response.data)) {
                    setChats(response.data);
                } else {
                    console.error(
                        "GetChats response is not an array:",
                        response.data
                    );
                    setChats([]);
                }
            } catch (error) {
                console.error("Failed to fetch chats:", error);
                setChats([]);
            }
        };

        fetchChatsById();
    }, [senderId, receiverId]);

    return chats;
};

export default useChats;