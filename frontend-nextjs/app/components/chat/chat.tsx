"use client";

import { useEffect, useRef, useState } from "react";
import ChatSidebar from "./sidebar/sidebar";
import Middlebar from "./middlebar/middlebar";
import { Dialog } from "@radix-ui/themes";
import Rightbar from "../rightbar/rightbar";

const ChatComponent = () => {
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [showChatMobile, setShowChatMobile] = useState(false);

  // Mobile profile drawer
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  const [dragging, setDragging] = useState<"left" | "right" | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(25);
  const [middleWidth, setMiddleWidth] = useState(50);
  const [rightWidth, setRightWidth] = useState(25);

  // --- resizable layout ---
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const [leftWidth, setLeftWidth] = useState(33);

  const startDrag = () => (isDragging.current = true);
  const stopDrag = () => (isDragging.current = false);

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

  const handleSelect = (_: number | null, rid: number | null) => {
    setReceiverId(rid);
    setShowChatMobile(true);

    // Close profile when changing conversation
    setShowMobileProfile(false);
  };

  const handleOpenMobileProfile = () => {
    if (receiverId !== null) {
      setShowMobileProfile(true);
    }
  };

  const senderId =
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem("loginId"))
      : null;

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