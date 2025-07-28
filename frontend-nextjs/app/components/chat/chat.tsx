// "use client"

// import { AnimatePresence, motion } from "framer-motion";
// import Middlebar from "./middlebar/middlebar";
// import ChatSidebar from "./sidebar/sidebar";
// import { useEffect, useState } from "react";
// import { ChevronLeft } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
// import Routes from "@/app/routes/routes";
// import { useRouter } from "next/navigation";

// const ChatComponent = () => {
//     const [userId, setUserId] = useState<number>(0);
//     const [receiverId, setReceiverId] = useState<number | null>(null);
//     const [isMiddlebarShow, setIsmiddlebarShow] = useState(true);

//     const router = useRouter();

//     useEffect(() => {
//         setUserId(Number(sessionStorage.getItem("loginId")));
//     }, [userId]);

//     const setId = (sid: number | null, receiverID: number | null) => {
//         setReceiverId(receiverID);
//         setIsmiddlebarShow(true);
//     }

//     if (userId != 0) {
//         return (
//             <>
//                 <ChatSidebar onSelect={setId} />
//                 <AnimatePresence>
//                     {(isMiddlebarShow) && (
//                         <motion.div
//                             className="border border-black/30 dark:border-white/20 rounded md:h-[98vh] h-[100vh] md:w-2/4 w-full absolute md:top-[1vh] top-0 md:left-[26%] z-50"
//                             initial={{
//                                 opacity: 0,
//                                 background: "rgba(0, 0, 0, 0)"
//                             }}
//                             animate={{
//                                 opacity: 1,
//                                 background: "#000000ff"
//                             }}
//                             exit={{
//                                 opacity: 0,
//                                 background: "rgba(0, 0, 0, 0)"
//                             }}
//                         >
//                             <Middlebar senderId={userId} receiverId={receiverId} />
//                             <button
//                                 type="button"
//                                 className="border-r px-2 absolute h-10 top-1 left-1 md:hidden block z-50"
//                                 onClick={() => {
//                                     setIsmiddlebarShow(false);
//                                 }}
//                             >
//                                 <ChevronLeft className="w-6 h-6 mr-1" />
//                             </button>
//                         </motion.div>
//                     )

//                     }
//                 </AnimatePresence>
//             </>
//         );
//     } else if (userId == 0) {
//         return (
//             <>
//                 <div className="flex items-center justify-center h-screen px-4">
//                     <Card className="w-full max-w-sm text-center shadow-xl border border-black/30 dark:border-white/20 bg-transparent">
//                         <CardHeader>
//                             <CardTitle className="text-xl text-pink-800">Login Required</CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                             <p className="text-muted-foreground">You need to login to start chatting with others.</p>
//                         </CardContent>
//                         <CardFooter className="flex justify-center">
//                             <Button onClick={() => router.push(Routes.Login)}>
//                                 Go to Login
//                             </Button>
//                         </CardFooter>
//                     </Card>
//                 </div>

//             </>
//         );
//     } else {
//         return (
//             <>

//             </>
//         );
//     }
// }

// export default ChatComponent;


"use client";

import { AnimatePresence, motion } from "framer-motion";
import Middlebar from "./middlebar/middlebar";
import ChatSidebar from "./sidebar/sidebar";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Routes from "@/app/routes/routes";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton"; // Import skeleton

const ChatComponent = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [isMiddlebarShow, setIsmiddlebarShow] = useState(true);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const id = sessionStorage.getItem("loginId");
    setUserId(id ? Number(id) : null);
    setLoading(false);
  }, []);

  const setId = (sid: number | null, receiverID: number | null) => {
    setReceiverId(receiverID);
    setIsmiddlebarShow(true);
  };

  // 1. Show Skeleton while loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <Card className="w-full max-w-sm text-center shadow-xl border border-black/30 dark:border-white/20 bg-transparent p-6">
          <Skeleton className="h-6 w-2/3 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-4 w-full mb-2 bg-white/10" />
          <Skeleton className="h-10 w-1/2 mx-auto mt-6 bg-white/10" />
        </Card>
      </div>
    );
  }

  // 2. Show Chat UI if user is logged in
  if (userId) {
    return (
      <>
        <ChatSidebar onSelect={setId} />
        <AnimatePresence>
          {isMiddlebarShow && (
            <motion.div
              className="border border-black/20 dark:border-white/20 rounded-md md:h-[98vh] h-[100vh] md:w-2/4 w-full absolute md:top-[1vh] top-0 md:left-[26%] z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Middlebar senderId={userId} receiverId={receiverId} />
              <button
                type="button"
                className="aborder-r px-2 absolute h-10 top-1 left-1 md:hidden block z-50"
                onClick={() => setIsmiddlebarShow(false)}
              >
                <ChevronLeft className="w-6 h-6 mr-1" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // 3. Show Login Required Card
  return (
    <div className="flex items-center justify-center h-screen px-4">
      <Card className="w-full max-w-sm text-center shadow-xl border border-black/30 dark:border-white/20 bg-transparent">
        <CardHeader>
          <CardTitle className="text-xl text-pink-800">Login Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to login to start chatting with others.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push(Routes.Login)}>
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ChatComponent;
