"use client"

import { FullScreenSpinner } from "@/app/components/spinner";
import dynamic from "next/dynamic";

const Chat = () => {
    const ChatComponent = dynamic(
        () => import("@/app/components/chat/chat"),
        {
            loading: () => {
                return (
                    <div className="flex items-center justify-center min-h-screen">
                        <FullScreenSpinner size={"3"}/>
                    </div>
                );
            },
            ssr: false,
        }

    );
    return <ChatComponent />;
};

export default Chat;