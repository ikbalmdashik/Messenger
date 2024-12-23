import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";

export interface Chat {
    chatId: number | null,
    senderId: number | null,
    receiverId: number | null,
    message: string | null,
    status: string | null,
    createdAt: string | null;
}

export const initialChat: Chat = {
    chatId: null,
    senderId: null,
    receiverId: null,
    message: null,
    status: null,
    createdAt: null
}

const useChats = (senderId: number, receiverId: number) => {
    const [chats, setChats] = useState<Chat[]>([]);

    // fetch currently login data
    useEffect(() => {
        const userId = sessionStorage.getItem("loginId");

        const FetchChatsById = async (sId: number, rId: number) => {
            try {
                const response = await axios.post(API_ENDPOINTS.GetChats, {
                    senderId: sId,
                    receiverId: rId
                });
                setChats(response.data);
            } catch (error) {
                console.log(error);
            }
        }

        if(userId != null) {
            FetchChatsById(senderId, receiverId);
        }
    }, [senderId, receiverId]);

    return chats ;
}

export default useChats;