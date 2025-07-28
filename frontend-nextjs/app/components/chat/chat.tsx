"use client"

import { AnimatePresence, motion } from "framer-motion";
import Middlebar from "./middlebar/middlebar";
import ChatSidebar from "./sidebar/sidebar";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

const ChatComponent = () => {
    const [userId, setUserId] = useState<number>(0);
    const [receiverId, setReceiverId] = useState<number | null>(null);
    const [isMiddlebarShow, setIsmiddlebarShow] = useState(true);

    useEffect(() => {
        setUserId(Number(sessionStorage.getItem("loginId")));
    }, [userId]);

    const setId = (sid: number | null, receiverID: number | null) => {
        setReceiverId(receiverID);
        setIsmiddlebarShow(true);
    }

    if (userId != 0) {
        return (
            <>
                <ChatSidebar onSelect={setId} />
                <AnimatePresence>
                    {(isMiddlebarShow) && (
                        <motion.div
                            className="border border-black/30 dark:border-white/20 rounded md:h-[98vh] h-[100vh] md:w-2/4 w-full absolute md:top-[1vh] top-0 md:left-[26%] z-50"
                            initial={{
                                opacity: 0,
                                background: "rgba(0, 0, 0, 0)"
                            }}
                            animate={{
                                opacity: 1,
                                background: "#000000ff"
                            }}
                            exit={{
                                opacity: 0,
                                background: "rgba(0, 0, 0, 0)"
                            }}
                        >
                            <Middlebar senderId={userId} receiverId={receiverId} />
                            <button
                                type="button"
                                className="border-r px-2 absolute h-10 top-1 left-1 md:hidden block z-50"
                                onClick={() => {
                                    setIsmiddlebarShow(false);
                                }}
                            >
                                <ChevronLeft className="w-6 h-6 mr-1" />
                            </button>
                        </motion.div>
                    )

                    }
                </AnimatePresence>
            </>
        );
    } else {
        return (
            <>
                <h1>Login to start Chat.</h1>
            </>
        );
    }
}

export default ChatComponent;