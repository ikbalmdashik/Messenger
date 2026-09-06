"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

import ChatSidebar from "./sidebar/sidebar";
import Middlebar from "./middlebar/middlebar";
import Rightbar from "../rightbar/rightbar";
import API_ENDPOINTS from "@/app/routes/api";
import FullScreenSpinner from "../spinner";
import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import Routes from "@/app/routes/routes";
// import Unauthorized from "../unauthorized/unauthorized";

const ChatComponent = () => {
  // =====================================================
  // AUTHENTICATION STATE
  // =====================================================

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // =====================================================
  // CHAT STATE
  // =====================================================

  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [showChatMobile, setShowChatMobile] = useState(false);

  const [showMobileProfile, setShowMobileProfile] = useState(false);

  const [dragging, setDragging] = useState<"left" | "right" | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(25);
  const [middleWidth, setMiddleWidth] = useState(50);
  const [rightWidth, setRightWidth] = useState(25);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [leftWidth, setLeftWidth] = useState(33);

  const router = useRouter()

  // =====================================================
  // CHECK AUTHENTICATION
  // =====================================================

  useEffect(() => {
    const getUserData = async () => {
      try {
        setIsCheckingAuth(true);

        const response = await axios.post(
          API_ENDPOINTS.GetUserByToken,
          {},
          {
            withCredentials: true,
          }
        );

        // API returned successfully
        if (response.data) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.log("Authentication failed:", error);

        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    getUserData();
  }, []);

  // =====================================================
  // RESIZABLE LAYOUT
  // =====================================================

  const startDrag = () => {
    isDragging.current = true;
  };

  const stopDrag = () => {
    isDragging.current = false;
  };

  const onDrag = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const total = containerRef.current.offsetWidth;
    const newLeft = (e.clientX / total) * 100;

    if (newLeft < 20 || newLeft > 60) return;

    setLeftWidth(newLeft);
    setMiddleWidth(100 - newLeft);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;

      const total = window.innerWidth;
      const percent = (e.clientX / total) * 100;

      if (dragging === "left") {
        const newSidebar = Math.min(Math.max(percent, 20), 60);
        const remaining = 100 - newSidebar;

        setSidebarWidth(newSidebar);
        setMiddleWidth(remaining - rightWidth);
      }

      if (dragging === "right") {
        const newRight = Math.min(Math.max(100 - percent, 20), 60);
        const remaining = 100 - newRight;

        setRightWidth(newRight);
        setMiddleWidth(remaining - sidebarWidth);
      }
    };

    const stop = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [dragging, sidebarWidth, rightWidth]);

  // =====================================================
  // SELECT CHAT
  // =====================================================

  const handleSelect = (_: number | null, rid: number | null) => {
    setReceiverId(rid);
    setShowChatMobile(true);

    setShowMobileProfile(false);
  };

  // =====================================================
  // OPEN MOBILE PROFILE
  // =====================================================

  const handleOpenMobileProfile = () => {
    if (receiverId !== null) {
      setShowMobileProfile(true);
    }
  };

  // =====================================================
  // SENDER ID
  // =====================================================

  const senderId =
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem("loginId"))
      : null;

  // =====================================================
  // AUTH CHECK LOADING
  // =====================================================

  if (isCheckingAuth) {
    return (
      <FullScreenSpinner />
    );
  }

  // =====================================================
  // NOT AUTHENTICATED
  // =====================================================

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Authentication required
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please log in to access the chat.
          </p>
          <Button
            mt={"2"}
            style={{ width: "100%" }}
            className="text-xl"
            onClick={() => { router.push(Routes.Login) }}
          >Log In</Button>
        </div>
      </div>
    );

    // Or:
    // return <Unauthorized />;
  }

  // =====================================================
  // AUTHENTICATED → SHOW CHAT
  // =====================================================

  return (
    <div className="h-[100dvh] overflow-hidden transition-colors">
      {/* =====================================================
          MOBILE VIEW
      ===================================================== */}
      <div className="md:hidden h-full">

        {!showChatMobile && (
          <ChatSidebar onSelect={handleSelect} />
        )}

        {showChatMobile && (
          <Middlebar
            senderId={senderId}
            receiverId={receiverId}
            onBack={() => {
              setShowChatMobile(false);
              setShowMobileProfile(false);
            }}
            onOpenProfile={handleOpenMobileProfile}
          />
        )}

        {/* Mobile User Info */}
        <div className="md:hidden h-full relative">

          {/* Contact list */}
          {!showChatMobile && (
            <ChatSidebar
              onSelect={handleSelect}
            />
          )}

          {/* Chat */}
          {showChatMobile && !showMobileProfile && (
            <Middlebar
              senderId={senderId}
              receiverId={receiverId}
              onBack={() => {
                setShowChatMobile(false);
                setShowMobileProfile(false);
              }}
              onOpenProfile={() => {
                setShowMobileProfile(true);
              }}
            />
          )}

          {/* User information */}
          {showChatMobile && showMobileProfile && (
            <Rightbar
              receiverId={receiverId}
              onBack={() => {
                setShowMobileProfile(false);
              }}
            />
          )}

        </div>
      </div>

      {/* =====================================================
          DESKTOP VIEW
      ===================================================== */}
      <div className="hidden md:flex h-[100dvh] w-full overflow-hidden">

        {/* Sidebar */}
        <div
          className="h-full min-h-0 flex flex-col border-r"
          style={{ width: `${sidebarWidth}%` }}
        >
          <ChatSidebar onSelect={handleSelect} />
        </div>

        {/* Resizer 1 */}
        <div
          onMouseDown={() => setDragging("left")}
          className="
            w-1
            cursor-col-resize
            bg-white/10
            transition
            hover:bg-blue-500
          "
        />

        {/* Middle */}
        <div
          className="h-full min-h-0 flex flex-col"
          style={{ width: `${middleWidth}%` }}
        >
          <Middlebar
            senderId={senderId}
            receiverId={receiverId}
          />
        </div>

        {/* Resizer 2 */}
        <div
          onMouseDown={() => setDragging("right")}
          className="
            w-1
            cursor-col-resize
            bg-white/10
            transition
            hover:bg-blue-500
          "
        />

        {/* Rightbar */}
        <div
          className="h-full min-h-0 flex flex-col border-l"
          style={{ width: `${rightWidth}%` }}
        >
          <Rightbar
            receiverId={receiverId}
            onBack={() => setShowMobileProfile(false)}
          />
        </div>

      </div>
    </div>
  );
};

export default ChatComponent;