"use client"

import { Spinner } from "@/components/ui/spinner";
import dynamic from "next/dynamic";

const Chat = () => {
    const ChatComponent = dynamic(
        () => import("@/app/components/chat/chat"),
        {
            loading: () => {
                return (
                    <div className="bg-white dark:bg-slate-950 flex items-center justify-center min-h-screen">
                        <Spinner size={50} />
                    </div>
                );
            },
            ssr: false,
        }

    );
    return <ChatComponent />;
};

export default Chat;