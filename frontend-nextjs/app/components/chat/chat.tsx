"use client";

import {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import ChatSidebar from "./sidebar/sidebar";
import Middlebar from "./middlebar/middlebar";
import Rightbar from "../rightbar/rightbar";

import API_ENDPOINTS from "@/app/routes/api";

import FullScreenSpinner from "../spinner";

import {
  Button,
} from "@radix-ui/themes";

import {
  useRouter,
} from "next/navigation";

import Routes from "@/app/routes/routes";

const ChatComponent = () => {
  /* ==============================
     AUTHENTICATION
  ============================== */

  const [
    isCheckingAuth,
    setIsCheckingAuth,
  ] = useState(true);

  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [
    senderId,
    setSenderId,
  ] = useState<number | null>(null);

  /* ==============================
     CHAT
  ============================== */

  const [
    receiverId,
    setReceiverId,
  ] = useState<number | null>(null);

  /* ==============================
     MOBILE
  ============================== */

  const [
    showChatMobile,
    setShowChatMobile,
  ] = useState(false);

  const [
    showMobileProfile,
    setShowMobileProfile,
  ] = useState(false);

  /* ==============================
     DESKTOP PANEL RESIZING
  ============================== */

  const [
    dragging,
    setDragging,
  ] = useState<
    "left" | "right" | null
  >(null);

  const [
    sidebarWidth,
    setSidebarWidth,
  ] = useState(25);

  const [
    middleWidth,
    setMiddleWidth,
  ] = useState(50);

  const [
    rightWidth,
    setRightWidth,
  ] = useState(25);

  const router = useRouter();

  /* ==============================
     GET CURRENT USER
  ============================== */

  useEffect(() => {
    const getUserData = async () => {
      try {
        setIsCheckingAuth(true);

        const response =
          await axios.post(
            API_ENDPOINTS.GetUserByToken,
            {},
            {
              withCredentials: true,
            }
          );

        console.log(
          "Authenticated user:",
          response.data
        );

        const user =
          response.data;

        if (
          user?.userId !== undefined &&
          user?.userId !== null
        ) {
          setSenderId(
            Number(user.userId)
          );

          setIsAuthenticated(true);
        } else {
          setSenderId(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error(
          "Authentication failed:",
          error
        );

        setSenderId(null);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    getUserData();
  }, []);

  /* ==============================
     RESIZE PANELS
  ============================== */

  useEffect(() => {
    const handleMove = (
      event: MouseEvent
    ) => {
      if (!dragging) return;

      const totalWidth =
        window.innerWidth;

      const percent =
        (event.clientX /
          totalWidth) *
        100;

      if (
        dragging === "left"
      ) {
        const newSidebar =
          Math.min(
            Math.max(
              percent,
              20
            ),
            60
          );

        const remaining =
          100 - newSidebar;

        setSidebarWidth(
          newSidebar
        );

        setMiddleWidth(
          Math.max(
            remaining -
              rightWidth,
            20
          )
        );
      }

      if (
        dragging === "right"
      ) {
        const newRight =
          Math.min(
            Math.max(
              100 - percent,
              20
            ),
            60
          );

        const remaining =
          100 - newRight;

        setRightWidth(
          newRight
        );

        setMiddleWidth(
          Math.max(
            remaining -
              sidebarWidth,
            20
          )
        );
      }
    };

    const handleStop = () => {
      setDragging(null);
    };

    window.addEventListener(
      "mousemove",
      handleMove
    );

    window.addEventListener(
      "mouseup",
      handleStop
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMove
      );

      window.removeEventListener(
        "mouseup",
        handleStop
      );
    };
  }, [
    dragging,
    sidebarWidth,
    rightWidth,
  ]);

  /* ==============================
     SELECT USER
  ============================== */

  const handleSelect = (
    rid: number
  ) => {
    setReceiverId(rid);

    setShowChatMobile(true);

    setShowMobileProfile(false);
  };

  /* ==============================
     MOBILE PROFILE
  ============================== */

  const handleOpenMobileProfile =
    () => {
      if (receiverId !== null) {
        setShowMobileProfile(
          true
        );
      }
    };

  /* ==============================
     AUTH LOADING
  ============================== */

  if (isCheckingAuth) {
    return <FullScreenSpinner />;
  }

  /* ==============================
     AUTH FAILED
  ============================== */

  if (
    !isAuthenticated ||
    senderId === null
  ) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Authentication required
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please log in to access
            the chat.
          </p>

          <Button
            mt="2"
            style={{
              width: "100%",
            }}
            className="text-xl"
            onClick={() => {
              router.push(
                Routes.Login
              );
            }}
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  /* ==============================
     CHAT
  ============================== */

  return (
    <div className="h-[100dvh] overflow-hidden transition-colors">

      {/* =================================
          MOBILE
      ================================= */}

      <div className="md:hidden h-full relative">

        {!showChatMobile && (
          <ChatSidebar
            senderId={senderId}
            onSelect={handleSelect}
          />
        )}

        {showChatMobile &&
          !showMobileProfile && (
            <Middlebar
              senderId={senderId}
              receiverId={receiverId}
              onBack={() => {
                setShowChatMobile(
                  false
                );

                setShowMobileProfile(
                  false
                );
              }}
              onOpenProfile={
                handleOpenMobileProfile
              }
            />
          )}

        {showChatMobile &&
          showMobileProfile && (
            <Rightbar
              receiverId={receiverId}
              onBack={() => {
                setShowMobileProfile(
                  false
                );
              }}
            />
          )}
      </div>

      {/* =================================
          DESKTOP
      ================================= */}

      <div className="hidden md:flex h-[100dvh] w-full overflow-hidden">

        {/* SIDEBAR */}

        <div
          className="h-full min-h-0 flex flex-col border-r"
          style={{
            width: `${sidebarWidth}%`,
          }}
        >
          <ChatSidebar
            senderId={senderId}
            onSelect={handleSelect}
          />
        </div>

        {/* LEFT RESIZER */}

        <div
          onMouseDown={() => {
            setDragging("left");
          }}
          className="w-1 cursor-col-resize bg-white/10 transition hover:bg-blue-500"
        />

        {/* MIDDLEBAR */}

        <div
          className="h-full min-h-0 flex flex-col"
          style={{
            width: `${middleWidth}%`,
          }}
        >
          <Middlebar
            senderId={senderId}
            receiverId={receiverId}
          />
        </div>

        {/* RIGHT RESIZER */}

        <div
          onMouseDown={() => {
            setDragging("right");
          }}
          className="w-1 cursor-col-resize bg-white/10 transition hover:bg-blue-500"
        />

        {/* RIGHTBAR */}

        <div
          className="h-full min-h-0 flex flex-col border-l"
          style={{
            width: `${rightWidth}%`,
          }}
        >
          <Rightbar
            receiverId={receiverId}
            onBack={() => {
              setShowMobileProfile(
                false
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;