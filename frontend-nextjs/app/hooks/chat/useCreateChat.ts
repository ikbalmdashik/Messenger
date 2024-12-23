import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";

export interface CreateChat {
    senderId: number | null;
    receiverId: number | null;
    message: string | null;
    status: string | null;
}

export const initialCreateChat: CreateChat = {
    senderId: null,
    receiverId: null,
    message: null,
    status: null
}

const useCreateChat = (createChat: CreateChat) => {
    axios.post(API_ENDPOINTS.CreateChat, {
        senderId: createChat.senderId,
        receiverId: createChat.receiverId,
        message: createChat.message,
        status: createChat.status
    });
}

export default useCreateChat;