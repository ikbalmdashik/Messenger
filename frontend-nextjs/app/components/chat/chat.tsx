"use client";

import {
  useEffect,
  useState,
  useCallback,
} from "react";

import axios from "axios";

import ChatSidebar from "./sidebar/sidebar";
import Middlebar from "./middlebar/middlebar";
import Rightbar from "./rightbar/rightbar";

import API_ENDPOINTS, {
  GetUserByTokenResponse,
} from "@/app/routes/api";

import FullScreenSpinner from "../spinner";

import {
  Button,
  Flex,
  Text,
  Box,
  Badge,
  Callout,
} from "@radix-ui/themes";

import { useRouter } from "next/navigation";

import Routes from "@/app/routes/routes";

import {
  Mail,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";


/* ============================================================
   TYPES
============================================================ */

export interface ConversationUser {
  userId: number;
  fullName?: string;
  email?: string;
  publicId?: string;
  isEmailVerified?: boolean;
}

export interface SelectedConversation {
  conversationId: number;
  type?: "DIRECT" | "GROUP";
  name?: string | null;
  otherUser?: ConversationUser | null;
}


/* ============================================================
   COMPONENT
============================================================ */

const ChatComponent = () => {

  /* ==========================================================
     AUTHENTICATION
  ========================================================== */

  const [isCheckingAuth, setIsCheckingAuth] =
    useState(true);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [senderId, setSenderId] =
    useState<number | null>(null);


  /* ==========================================================
     EMAIL VERIFICATION
  ========================================================== */

  const [isEmailVerified, setIsEmailVerified] =
    useState<boolean | null>(null);

  const [userEmail, setUserEmail] =
    useState("");

  const [resendLoading, setResendLoading] =
    useState(false);

  const [resendCooldown, setResendCooldown] =
    useState(0);

  const [verificationMessage, setVerificationMessage] =
    useState<{
      type: "success" | "error";
      message: string;
    } | null>(null);


  /* ==========================================================
     SELECTED CONVERSATION
  ========================================================== */

  const [conversationId, setConversationId] =
    useState<number | null>(null);

  const [conversationUser, setConversationUser] =
    useState<ConversationUser | null>(null);


  /* ==========================================================
     MOBILE
  ========================================================== */

  const [showChatMobile, setShowChatMobile] =
    useState(false);

  const [showMobileProfile, setShowMobileProfile] =
    useState(false);


  /* ==========================================================
     DESKTOP PANEL RESIZING
  ========================================================== */

  const [dragging, setDragging] =
    useState<"left" | "right" | null>(null);

  const [sidebarWidth, setSidebarWidth] =
    useState(25);

  const [middleWidth, setMiddleWidth] =
    useState(50);

  const [rightWidth, setRightWidth] =
    useState(25);


  const router = useRouter();


  /* ==========================================================
     GET CURRENT USER
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const getUserData = async () => {
      try {
        setIsCheckingAuth(true);

        const response =
          await axios.post<GetUserByTokenResponse>(
            API_ENDPOINTS.GetUserByToken,
            {},
            {
              withCredentials: true,
            }
          );

        if (!mounted) {
          return;
        }

        const user = response.data;

        /* -----------------------------------------------
           NOT AUTHENTICATED
        ------------------------------------------------ */

        if (
          user?.userId === undefined ||
          user?.userId === null
        ) {
          setSenderId(null);
          setIsAuthenticated(false);
          setIsEmailVerified(null);
          setUserEmail("");

          return;
        }

        /* -----------------------------------------------
           AUTHENTICATED USER ID
        ------------------------------------------------ */

        const authenticatedUserId =
          Number(user.userId);

        if (!Number.isFinite(authenticatedUserId)) {
          setSenderId(null);
          setIsAuthenticated(false);
          setIsEmailVerified(null);
          setUserEmail("");

          return;
        }

        /* -----------------------------------------------
           AUTHENTICATED
        ------------------------------------------------ */

        setSenderId(authenticatedUserId);
        setIsAuthenticated(true);

        /* -----------------------------------------------
           EMAIL
        ------------------------------------------------ */

        setUserEmail(user.email || "");

        /* -----------------------------------------------
           EMAIL VERIFICATION
        ------------------------------------------------ */

        setIsEmailVerified(
          user.isEmailVerified === true
        );

      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "Authentication failed:",
          error
        );

        setSenderId(null);
        setIsAuthenticated(false);
        setIsEmailVerified(null);
        setUserEmail("");

      } finally {
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    getUserData();

    return () => {
      mounted = false;
    };
  }, []);


  /* ==========================================================
     CROSS-TAB EMAIL VERIFICATION SYNC
  ========================================================== */

  useEffect(() => {

    const channel =
      new BroadcastChannel(
        "verify_channel"
      );

    const handleMessage =
      (
        event: MessageEvent
      ) => {

        if (
          event.data?.type ===
          "VERIFIED"
        ) {

          setIsEmailVerified(true);

        }

      };


    channel.addEventListener(
      "message",
      handleMessage
    );


    return () => {

      channel.removeEventListener(
        "message",
        handleMessage
      );

      channel.close();

    };

  }, []);


  /* ==========================================================
     RESEND VERIFICATION EMAIL
  ========================================================== */

  const handleSendVerification =
    useCallback(
      async () => {

        if (
          resendCooldown > 0
        ) {
          return;
        }


        if (!userEmail) {

          setVerificationMessage({
            type: "error",
            message:
              "Email address is missing.",
          });

          return;
        }


        try {

          setResendLoading(true);

          setVerificationMessage(
            null
          );


          await axios.post(
            API_ENDPOINTS.SendEmailVerificationLink,
            {
              email: userEmail,
              type: "VERIFY_EMAIL",
            },
            {
              withCredentials: true,
            }
          );


          setResendCooldown(60);


          setVerificationMessage({
            type: "success",
            message:
              `Verification link successfully sent to ${userEmail}. Please check your inbox.`,
          });

        } catch (error) {

          console.error(
            "Verification email error:",
            error
          );


          setVerificationMessage({
            type: "error",
            message:
              "Failed to send verification link. Please try again.",
          });

        } finally {

          setResendLoading(false);

        }

      },
      [
        resendCooldown,
        userEmail,
      ]
    );


  /* ==========================================================
     RESEND COOLDOWN
  ========================================================== */

  useEffect(() => {

    if (
      resendCooldown <= 0
    ) {
      return;
    }


    const timer =
      setInterval(() => {

        setResendCooldown(
          (previous) =>
            Math.max(
              previous - 1,
              0
            )
        );

      }, 1000);


    return () =>
      clearInterval(timer);

  }, [
    resendCooldown,
  ]);


  /* ==========================================================
     RESIZE PANELS
  ========================================================== */

  useEffect(() => {

    const handleMove =
      (
        event: MouseEvent
      ) => {

        if (!dragging) {
          return;
        }


        const totalWidth =
          window.innerWidth;

        const percent =
          (
            event.clientX /
            totalWidth
          ) * 100;


        /* -----------------------------------------------
           LEFT RESIZER
        ------------------------------------------------ */

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
            100 -
            newSidebar;


          const newMiddle =
            Math.max(
              remaining -
              rightWidth,
              20
            );


          setSidebarWidth(
            newSidebar
          );

          setMiddleWidth(
            newMiddle
          );

        }


        /* -----------------------------------------------
           RIGHT RESIZER
        ------------------------------------------------ */

        if (
          dragging === "right"
        ) {

          const newRight =
            Math.min(
              Math.max(
                100 -
                percent,
                20
              ),
              60
            );


          const remaining =
            100 -
            newRight;


          const newMiddle =
            Math.max(
              remaining -
              sidebarWidth,
              20
            );


          setRightWidth(
            newRight
          );

          setMiddleWidth(
            newMiddle
          );

        }

      };


    const handleStop =
      () => {
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


  /* ==========================================================
     SELECT CONVERSATION
  ========================================================== */

  const handleSelect = (
    selectedConversationId: number,
    selectedUser:
      ConversationUser | null,
  ) => {

    if (
      !Number.isFinite(
        selectedConversationId
      )
    ) {
      return;
    }


    setConversationId(
      selectedConversationId
    );


    setConversationUser(
      selectedUser
    );


    /* -----------------------------------------------
       MOBILE
    ------------------------------------------------ */

    setShowChatMobile(true);

    setShowMobileProfile(false);

  };


  /* ==========================================================
     MOBILE PROFILE
  ========================================================== */

  const handleOpenMobileProfile =
    () => {

      if (
        conversationUser !==
        null
      ) {

        setShowMobileProfile(
          true
        );

      }

    };


  /* ==========================================================
     AUTH LOADING
  ========================================================== */

  if (
    isCheckingAuth
  ) {

    return (
      <FullScreenSpinner />
    );

  }


  /* ==========================================================
     AUTH FAILED
  ========================================================== */

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
            Please log in to access the chat.
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


  /* ==========================================================
     EMAIL NOT VERIFIED
  ========================================================== */

  if (
    isEmailVerified === false
  ) {

    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">

        <Box className="w-full max-w-md">

          {/* ---------------------------------------------
              HEADER
          --------------------------------------------- */}

          <Flex
            align="center"
            justify="center"
            gap="3"
            mb="6"
          >

            <MessageCircle className="w-8 h-8 text-sky-500" />

            <Text
              size="8"
              weight="bold"
              className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent"
            >
              Messenger
            </Text>

          </Flex>


          {/* ---------------------------------------------
              CARD
          --------------------------------------------- */}

          <Box>

            <Flex
              direction="column"
              align="center"
              gap="4"
              className="text-center"
            >

              {/* -----------------------------------------
                  ICON
              ----------------------------------------- */}

              <Box className="relative mt-2">

                <Box className="absolute -inset-1 rounded-full bg-amber-500/20 blur-md animate-pulse" />

                <Flex
                  align="center"
                  justify="center"
                  className="relative w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800"
                >

                  <ShieldAlert className="w-8 h-8 text-amber-500" />

                </Flex>

              </Box>


              {/* -----------------------------------------
                  TITLE
              ----------------------------------------- */}

              <Box className="space-y-1">

                <Badge
                  color="amber"
                  variant="soft"
                  radius="full"
                  size="2"
                >
                  Account Unverified
                </Badge>

                <Text
                  as="p"
                  size="2"
                  color="gray"
                  className="mt-2 max-w-xs mx-auto"
                >
                  Your account requires
                  email verification before
                  you can access Messenger.
                </Text>

              </Box>


              {/* -----------------------------------------
                  NOTIFICATION
              ----------------------------------------- */}

              {verificationMessage && (

                <Callout.Root
                  color={
                    verificationMessage.type ===
                      "success"
                      ? "green"
                      : "red"
                  }
                  size="1"
                  variant="soft"
                  className="w-full"
                >

                  <Callout.Icon>

                    {verificationMessage.type ===
                      "success" ? (

                      <CheckCircle2 className="w-4 h-4" />

                    ) : (

                      <AlertCircle className="w-4 h-4" />

                    )}

                  </Callout.Icon>

                  <Callout.Text size="2">

                    {
                      verificationMessage.message
                    }

                  </Callout.Text>

                </Callout.Root>

              )}


              {/* -----------------------------------------
                  EMAIL
              ----------------------------------------- */}

              <Box className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">

                <Flex
                  align="center"
                  justify="between"
                >

                  <Flex
                    align="center"
                    gap="2"
                    className="overflow-hidden"
                  >

                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />

                    <Text
                      size="2"
                      weight="bold"
                      className="truncate"
                    >
                      {userEmail}
                    </Text>

                  </Flex>

                  <Badge
                    color="amber"
                    variant="surface"
                    size="1"
                  >
                    Pending
                  </Badge>

                </Flex>

              </Box>


              {/* -----------------------------------------
                  SEND VERIFICATION
              ----------------------------------------- */}

              <Button
                type="button"
                onClick={
                  handleSendVerification
                }
                loading={
                  resendLoading
                }
                disabled={
                  resendCooldown > 0 ||
                  resendLoading
                }
                size="2"
                style={{
                  width: "100%",
                }}
              >

                {resendCooldown > 0 ? (

                  <Flex
                    align="center"
                    gap="2"
                    justify="center"
                  >

                    <RefreshCw className="w-4 h-4 animate-spin" />

                    Resend in{" "}
                    {resendCooldown}s

                  </Flex>

                ) : (

                  <Flex
                    align="center"
                    gap="2"
                    justify="center"
                  >

                    <Mail className="w-4 h-4" />

                    Send Verification Link

                  </Flex>

                )}

              </Button>


              {/* -----------------------------------------
                  LOGOUT / DIFFERENT ACCOUNT
              ----------------------------------------- */}

              <Button
                type="button"
                variant="outline"
                color="gray"
                size="2"
                onClick={
                  async () => {

                    try {

                      await axios.post(
                        API_ENDPOINTS.Logout,
                        {},
                        {
                          withCredentials: true,
                        }
                      );

                    } catch (
                    error
                    ) {

                      console.error(
                        "Logout failed:",
                        error
                      );

                    } finally {

                      router.push(
                        Routes.Login
                      );

                    }

                  }
                }
                style={{
                  width: "100%",
                }}
              >

                <Flex
                  align="center"
                  gap="2"
                  justify="center"
                >

                  <ArrowLeft className="w-4 h-4" />

                  Use Different Account

                </Flex>

              </Button>

            </Flex>

          </Box>

        </Box>

      </div>
    );

  }


  /* ==========================================================
     CHAT APPLICATION
  ========================================================== */

  return (
    <div className="h-[100dvh] overflow-hidden transition-colors">

      {/* ====================================================
          MOBILE
      ==================================================== */}

      <div className="md:hidden h-full relative">

        {/* -----------------------------------------------
            SIDEBAR
        ------------------------------------------------ */}

        {!showChatMobile && (

          <ChatSidebar
            senderId={
              senderId
            }
            onSelect={
              handleSelect
            }
          />

        )}


        {/* -----------------------------------------------
            MIDDLEBAR
        ------------------------------------------------ */}

        {showChatMobile &&
          !showMobileProfile && (

            <Middlebar
              senderId={
                senderId
              }
              conversationId={
                conversationId
              }
              conversationUser={
                conversationUser
              }
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


        {/* -----------------------------------------------
            RIGHTBAR
        ------------------------------------------------ */}

        {showChatMobile &&
          showMobileProfile && (

            <Rightbar
              receiverId={
                conversationUser?.userId ??
                null
              }
              onBack={() => {

                setShowMobileProfile(
                  false
                );

              }}
            />

          )}

      </div>


      {/* ====================================================
          DESKTOP
      ==================================================== */}

      <div className="hidden md:flex h-[100dvh] w-full overflow-hidden">

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <div
          className="h-full min-h-0 flex flex-col border-r"
          style={{
            width:
              `${sidebarWidth}%`,
          }}
        >

          <ChatSidebar
            senderId={
              senderId
            }
            onSelect={
              handleSelect
            }
          />

        </div>


        {/* ==================================================
            LEFT RESIZER
        ================================================== */}

        <div
          onMouseDown={() => {
            setDragging(
              "left"
            );
          }}
          className="w-1 shrink-0 cursor-col-resize bg-white/10 transition hover:bg-blue-500"
        />


        {/* ==================================================
            MIDDLEBAR
        ================================================== */}

        <div
          className="h-full min-h-0 flex flex-col"
          style={{
            width:
              `${middleWidth}%`,
          }}
        >

          <Middlebar
            senderId={
              senderId
            }
            conversationId={
              conversationId
            }
            conversationUser={
              conversationUser
            }
          />

        </div>


        {/* ==================================================
            RIGHT RESIZER
        ================================================== */}

        <div
          onMouseDown={() => {
            setDragging(
              "right"
            );
          }}
          className="w-1 shrink-0 cursor-col-resize bg-white/10 transition hover:bg-blue-500"
        />


        {/* ==================================================
            RIGHTBAR
        ================================================== */}

        <div
          className="h-full min-h-0 flex flex-col border-l"
          style={{
            width:
              `${rightWidth}%`,
          }}
        >

          <Rightbar
            receiverId={
              conversationUser?.userId ??
              null
            }
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