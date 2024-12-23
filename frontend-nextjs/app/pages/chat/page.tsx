import ChatComponent from "@/app/components/chat/chat";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chats"
}

const Chat = () => {
    return (
        <>
            <ChatComponent />
        </>
    );
}

export default Chat;