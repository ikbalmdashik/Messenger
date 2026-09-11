"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";

import {
  io,
  Socket,
} from "socket.io-client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  ArrowLeft,
  BadgeAlert,
  BadgeCheck,
  Check,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";

import {
  AiOutlineInfoCircle,
} from "react-icons/ai";

import {
  Avatar,
  Badge,
  Box,
  Flex,
  IconButton,
  Text,
  Tooltip,
} from "@radix-ui/themes";

import API_ENDPOINTS, {
  GetConversationRequest,
  GetConversationResponse,
  SendMessageRequest,
} from "@/app/routes/api";

/* ============================================================
   TYPES
============================================================ */

export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface ConversationUser {
  userId: number;
  fullName?: string;
  email?: string;
  publicId?: string;
  isEmailVerified?: boolean;
  profilePicture?: string | null;
  bio?: string | null;
}

interface MiddlebarProps {
  senderId: number | null;

  conversationId: number | null;

  conversationUser: ConversationUser | null;

  onBack?: () => void;

  onOpenProfile?: () => void;
}

/* ============================================================
   PAGINATION
============================================================ */

const PAGE_SIZE = 50;

/* ============================================================
   MESSAGE STATUS ICON
============================================================ */

const StatusIcon = React.memo(
  ({
    status,
  }: {
    status?: string;
  }) => {
    const normalizedStatus =
      status?.toLowerCase();

    if (
      normalizedStatus === "seen"
    ) {
      return (
        <CheckCheck
          className="
            h-3.5
            w-3.5
            shrink-0
            text-sky-400
          "
        />
      );
    }

    if (
      normalizedStatus === "delivered"
    ) {
      return (
        <CheckCheck
          className="
            h-3.5
            w-3.5
            shrink-0
            text-slate-400
          "
        />
      );
    }

    return (
      <Check
        className="
          h-3.5
          w-3.5
          shrink-0
          text-slate-400
        "
      />
    );
  },
);

StatusIcon.displayName =
  "StatusIcon";

/* ============================================================
   DATE FORMATTER
============================================================ */

const formatMessageDate = (
  timestamp?: string,
) => {
  if (!timestamp) {
    return {
      datePart: null,
      timePart: "",
    };
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      datePart: null,
      timePart: timestamp,
    };
  }

  const datePart =
    date.toLocaleDateString(
      "en-GB",
      {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      },
    );

  const timePart =
    date.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      },
    );

  return {
    datePart,
    timePart,
  };
};

/* ============================================================
   MESSAGE NORMALIZER
============================================================ */

const normalizeMessage = (
  message: ChatMessage,
): ChatMessage => ({
  messageId: Number(
    message.messageId,
  ),

  conversationId: Number(
    message.conversationId,
  ),

  senderId: Number(
    message.senderId,
  ),

  message:
    typeof message.message ===
    "string"
      ? message.message
      : "",

  status:
    typeof message.status ===
    "string"
      ? message.status
      : "sent",

  createdAt:
    message.createdAt,
});

/* ============================================================
   MIDDLEBAR
============================================================ */

const Middlebar: React.FC<
  MiddlebarProps
> = ({
  senderId,
  conversationId,
  conversationUser,
  onBack,
  onOpenProfile,
}) => {
  /* ==========================================================
     STATE
  ========================================================== */

  const [
    chats,
    setChats,
  ] = useState<ChatMessage[]>([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingOlder,
    setLoadingOlder,
  ] = useState(false);

  const [
    hasMoreMessages,
    setHasMoreMessages,
  ] = useState(true);

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [
    socketError,
    setSocketError,
  ] = useState(false);

  /* ==========================================================
     REFS
  ========================================================== */

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const socketRef =
    useRef<Socket | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  const conversationRequestIdRef =
    useRef(0);

  const joinedConversationIdRef =
    useRef<number | null>(null);

  /**
   * Prevent multiple "load older"
   * requests while scrolling.
   */
  const loadingOlderRef =
    useRef(false);

  /**
   * Current pagination offset.
   *
   * Example:
   *
   * First request:
   * offset = 0
   * limit = 50
   *
   * Second request:
   * offset = 50
   * limit = 50
   *
   * Third request:
   * offset = 100
   * limit = 50
   */
  const offsetRef =
    useRef(0);

  /* ==========================================================
     SELECTED USER
  ========================================================== */

  const selectedUser =
    conversationUser;

  /* ==========================================================
     VALID CONVERSATION
  ========================================================== */

  const hasSelectedConversation =
    useMemo(() => {
      const id =
        Number(conversationId);

      return (
        Number.isFinite(id) &&
        id > 0
      );
    }, [
      conversationId,
    ]);

  /* ==========================================================
     LOAD INITIAL 50 MESSAGES
  ========================================================== */

  const loadConversation =
    useCallback(
      async (): Promise<void> => {
        const numericConversationId =
          Number(conversationId);

        if (
          !Number.isFinite(
            numericConversationId,
          ) ||
          numericConversationId <= 0
        ) {
          setChats([]);
          setLoading(false);
          setHasMoreMessages(false);
          return;
        }

        const requestId =
          ++conversationRequestIdRef.current;

        try {
          setLoading(true);

          setChats([]);

          /**
           * Reset pagination.
           */
          offsetRef.current = 0;

          setHasMoreMessages(
            true,
          );

          const requestBody:
            GetConversationRequest & {
              limit?: number;
              offset?: number;
            } = {
              conversationId:
                numericConversationId,

              limit: PAGE_SIZE,

              offset: 0,
            };

          const response =
            await axios.post<
              GetConversationResponse
            >(
              API_ENDPOINTS.GetConversation,
              requestBody,
              {
                withCredentials: true,
              },
            );

          if (
            requestId !==
            conversationRequestIdRef.current
          ) {
            return;
          }

          const data =
            Array.isArray(
              response.data,
            )
              ? response.data
              : [];

          const normalizedMessages =
            data
              .map(
                normalizeMessage,
              )
              .filter(
                (chat) =>
                  Number.isFinite(
                    chat.messageId,
                  ) &&
                  Number.isFinite(
                    chat.conversationId,
                  ) &&
                  Number.isFinite(
                    chat.senderId,
                  ) &&
                  chat.conversationId ===
                    numericConversationId,
              );

          /**
           * Oldest -> newest.
           */
          normalizedMessages.sort(
            (a, b) => {
              const aTime =
                new Date(
                  a.createdAt,
                ).getTime();

              const bTime =
                new Date(
                  b.createdAt,
                ).getTime();

              return (
                aTime - bTime
              );
            },
          );

          setChats(
            normalizedMessages,
          );

          /**
           * If fewer than 50 were returned,
           * there are no more older messages.
           */
          setHasMoreMessages(
            normalizedMessages.length >=
              PAGE_SIZE,
          );

          if (
            normalizedMessages.length >=
            PAGE_SIZE
          ) {
            offsetRef.current =
              PAGE_SIZE;
          } else {
            offsetRef.current =
              normalizedMessages.length;
          }
        } catch (error) {
          if (
            requestId !==
            conversationRequestIdRef.current
          ) {
            return;
          }

          console.error(
            "Failed to load conversation:",
            error,
          );

          setChats([]);

          setHasMoreMessages(
            false,
          );
        } finally {
          if (
            requestId ===
            conversationRequestIdRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        conversationId,
      ],
    );

  /* ==========================================================
     LOAD OLDER 50 MESSAGES
  ========================================================== */

  const loadOlderMessages =
    useCallback(
      async (): Promise<void> => {
        const numericConversationId =
          Number(conversationId);

        if (
          !Number.isFinite(
            numericConversationId,
          ) ||
          numericConversationId <= 0
        ) {
          return;
        }

        if (
          !hasMoreMessages
        ) {
          return;
        }

        if (
          loadingOlderRef.current
        ) {
          return;
        }

        const container =
          messagesContainerRef.current;

        if (!container) {
          return;
        }

        loadingOlderRef.current =
          true;

        setLoadingOlder(true);

        /**
         * Save current scroll metrics.
         *
         * When older messages are inserted,
         * we restore the user's position so
         * the screen doesn't jump.
         */
        const previousScrollHeight =
          container.scrollHeight;

        const previousScrollTop =
          container.scrollTop;

        const currentOffset =
          offsetRef.current;

        try {
          const requestBody:
            GetConversationRequest & {
              limit?: number;
              offset?: number;
            } = {
              conversationId:
                numericConversationId,

              limit: PAGE_SIZE,

              offset:
                currentOffset,
            };

          const response =
            await axios.post<
              GetConversationResponse
            >(
              API_ENDPOINTS.GetConversation,
              requestBody,
              {
                withCredentials: true,
              },
            );

          const data =
            Array.isArray(
              response.data,
            )
              ? response.data
              : [];

          const olderMessages =
            data
              .map(
                normalizeMessage,
              )
              .filter(
                (chat) =>
                  Number.isFinite(
                    chat.messageId,
                  ) &&
                  Number.isFinite(
                    chat.conversationId,
                  ) &&
                  Number.isFinite(
                    chat.senderId,
                  ) &&
                  chat.conversationId ===
                    numericConversationId,
              );

          olderMessages.sort(
            (a, b) => {
              const aTime =
                new Date(
                  a.createdAt,
                ).getTime();

              const bTime =
                new Date(
                  b.createdAt,
                ).getTime();

              return (
                aTime - bTime
              );
            },
          );

          /**
           * No more messages.
           */
          if (
            olderMessages.length ===
            0
          ) {
            setHasMoreMessages(
              false,
            );

            return;
          }

          /**
           * Add older messages at
           * the beginning.
           *
           * Remove duplicates by messageId.
           */
          setChats(
            (previous) => {
              const existingIds =
                new Set(
                  previous.map(
                    (item) =>
                      Number(
                        item.messageId,
                      ),
                  ),
                );

              const uniqueOlderMessages =
                olderMessages.filter(
                  (item) =>
                    !existingIds.has(
                      Number(
                        item.messageId,
                      ),
                    ),
                );

              return [
                ...uniqueOlderMessages,
                ...previous,
              ];
            },
          );

          /**
           * Advance pagination.
           */
          offsetRef.current =
            currentOffset +
            olderMessages.length;

          /**
           * If less than 50 came back,
           * we reached the beginning.
           */
          if (
            olderMessages.length <
            PAGE_SIZE
          ) {
            setHasMoreMessages(
              false,
            );
          }

          /**
           * Restore scroll position
           * after React renders the new
           * messages.
           */
          requestAnimationFrame(
            () => {
              const newScrollHeight =
                container.scrollHeight;

              const heightDifference =
                newScrollHeight -
                previousScrollHeight;

              container.scrollTop =
                previousScrollTop +
                heightDifference;
            },
          );
        } catch (error) {
          console.error(
            "Failed to load older messages:",
            error,
          );
        } finally {
          loadingOlderRef.current =
            false;

          setLoadingOlder(false);
        }
      },
      [
        conversationId,
        hasMoreMessages,
      ],
    );

  /* ==========================================================
     LOAD INITIAL CONVERSATION
  ========================================================== */

  useEffect(() => {
    void loadConversation();
  }, [
    loadConversation,
  ]);

  /* ==========================================================
     SCROLL HANDLER
  ========================================================== */

  useEffect(() => {
    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    const handleScroll =
      () => {
        /**
         * When user gets close to the
         * top, load another 50.
         */
        if (
          container.scrollTop <=
          120
        ) {
          void loadOlderMessages();
        }
      };

    container.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, [
    loadOlderMessages,
  ]);

  /* ==========================================================
     SOCKET CONNECTION
  ========================================================== */

  useEffect(() => {
    const numericConversationId =
      Number(conversationId);

    if (
      !Number.isFinite(
        numericConversationId,
      ) ||
      numericConversationId <= 0
    ) {
      if (
        socketRef.current
      ) {
        socketRef.current.disconnect();

        socketRef.current =
          null;
      }

      joinedConversationIdRef.current =
        null;

      setSocketConnected(
        false,
      );

      setSocketError(false);

      return;
    }

    /**
     * Close previous socket.
     */
    if (
      socketRef.current
    ) {
      socketRef.current.disconnect();

      socketRef.current =
        null;
    }

    joinedConversationIdRef.current =
      null;

    setSocketConnected(
      false,
    );

    setSocketError(false);

    const socket =
      io(
        API_ENDPOINTS.DefaultURL,
        {
          withCredentials:
            true,

          transports: [
            "websocket",
            "polling",
          ],

          autoConnect: true,
        },
      );

    socketRef.current =
      socket;

    /* ========================================================
       CONNECT
    ======================================================== */

    const handleConnect =
      () => {
        console.log(
          "Socket connected:",
          socket.id,
        );

        setSocketConnected(
          true,
        );

        setSocketError(
          false,
        );

        socket.emit(
          "join_room",
          {
            conversationId:
              numericConversationId,
          },
          (
            response?: {
              success?: boolean;
              message?: string;
              conversationId?: number;
              room?: string;
            },
          ) => {
            if (
              response?.success
            ) {
              joinedConversationIdRef.current =
                numericConversationId;

              console.log(
                `Joined conversation room: conversation-${numericConversationId}`,
              );

              /**
               * Mark conversation as read
               * because it is currently open.
               */
              socket.emit(
                "mark_conversation_read",
                {
                  conversationId:
                    numericConversationId,
                },
              );
            } else {
              console.error(
                "Failed to join conversation:",
                response,
              );
            }
          },
        );
      };

    /* ========================================================
       RECEIVE MESSAGE
    ======================================================== */

    const handleReceiveMessage =
      (
        incomingMessage: ChatMessage,
      ) => {
        if (
          !incomingMessage
        ) {
          return;
        }

        const normalizedMessage =
          normalizeMessage(
            incomingMessage,
          );

        if (
          normalizedMessage.conversationId !==
          numericConversationId
        ) {
          return;
        }

        if (
          !Number.isFinite(
            normalizedMessage.messageId,
          ) ||
          !Number.isFinite(
            normalizedMessage.senderId,
          )
        ) {
          return;
        }

        setChats(
          (previous) => {
            const alreadyExists =
              previous.some(
                (chat) =>
                  Number(
                    chat.messageId,
                  ) ===
                  Number(
                    normalizedMessage.messageId,
                  ),
              );

            if (
              alreadyExists
            ) {
              return previous;
            }

            const updated = [
              ...previous,
              normalizedMessage,
            ];

            updated.sort(
              (a, b) => {
                const aTime =
                  new Date(
                    a.createdAt,
                  ).getTime();

                const bTime =
                  new Date(
                    b.createdAt,
                  ).getTime();

                return (
                  aTime - bTime
                );
              },
            );

            return updated;
          },
        );
      };

    /* ========================================================
       CONNECT ERROR
    ======================================================== */

    const handleConnectError =
      (
        error: Error,
      ) => {
        console.error(
          "Socket connection error:",
          error,
        );

        setSocketConnected(
          false,
        );

        setSocketError(
          true,
        );
      };

    /* ========================================================
       DISCONNECT
    ======================================================== */

    const handleDisconnect =
      (
        reason: string,
      ) => {
        console.log(
          "Socket disconnected:",
          reason,
        );

        setSocketConnected(
          false,
        );

        joinedConversationIdRef.current =
          null;
      };

    /* ========================================================
       EVENTS
    ======================================================== */

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "receive_message",
      handleReceiveMessage,
    );

    socket.on(
      "connect_error",
      handleConnectError,
    );

    socket.on(
      "disconnect",
      handleDisconnect,
    );

    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {
      if (
        socket.connected &&
        joinedConversationIdRef.current ===
          numericConversationId
      ) {
        socket.emit(
          "leave_room",
          {
            conversationId:
              numericConversationId,
          },
        );
      }

      socket.off(
        "connect",
        handleConnect,
      );

      socket.off(
        "receive_message",
        handleReceiveMessage,
      );

      socket.off(
        "connect_error",
        handleConnectError,
      );

      socket.off(
        "disconnect",
        handleDisconnect,
      );

      socket.disconnect();

      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;
      }

      joinedConversationIdRef.current =
        null;

      setSocketConnected(
        false,
      );
    };
  }, [
    conversationId,
  ]);

  /* ==========================================================
     AUTO SCROLL
  ========================================================== */

  useEffect(() => {
    /**
     * Only automatically scroll to bottom
     * when the initial conversation is loaded
     * or a new message arrives at the bottom.
     *
     * Do NOT do this when older messages are
     * prepended.
     */
    if (
      chats.length === 0 ||
      loading ||
      loadingOlder
    ) {
      return;
    }

    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    /**
     * If the user is already close to
     * the bottom, keep them at bottom.
     */
    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    if (
      distanceFromBottom < 150
    ) {
      bottomRef.current?.scrollIntoView(
        {
          behavior: "smooth",
        },
      );
    }
  }, [
    chats,
    loading,
    loadingOlder,
  ]);

  /* ==========================================================
     INITIAL SCROLL TO BOTTOM
  ========================================================== */

  useEffect(() => {
    if (
      loading ||
      chats.length === 0
    ) {
      return;
    }

    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    /**
     * Initial conversation should
     * open at the newest message.
     */
    container.scrollTop =
      container.scrollHeight;
  }, [
    conversationId,
    loading,
  ]);

  /* ==========================================================
     RESET MESSAGE INPUT
  ========================================================== */

  useEffect(() => {
    setMessage("");

    if (
      textareaRef.current
    ) {
      textareaRef.current.style.height =
        "auto";
    }
  }, [
    conversationId,
  ]);

  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const sendMessage =
    useCallback(() => {
      const trimmedMessage =
        message.trim();

      if (
        !trimmedMessage
      ) {
        return;
      }

      const numericConversationId =
        Number(conversationId);

      if (
        !Number.isFinite(
          numericConversationId,
        ) ||
        numericConversationId <= 0
      ) {
        return;
      }

      const socket =
        socketRef.current;

      if (!socket) {
        console.warn(
          "Socket is not initialized.",
        );

        return;
      }

      if (
        !socket.connected
      ) {
        console.warn(
          "Socket is not connected.",
        );

        return;
      }

      const payload:
        SendMessageRequest =
        {
          conversationId:
            numericConversationId,

          message:
            trimmedMessage,

          status:
            "sent",
        };

      socket.emit(
        "send_message",
        payload,
        (
          response?:
            | ChatMessage
            | {
                success?: boolean;
                message?: string;
              },
        ) => {
          if (
            response &&
            "success" in
              response &&
            response.success ===
              false
          ) {
            console.error(
              "Send message failed:",
              response.message,
            );
          }
        },
      );

      setMessage("");

      if (
        textareaRef.current
      ) {
        textareaRef.current.style.height =
          "auto";
      }
    }, [
      message,
      conversationId,
    ]);

  /* ==========================================================
     SEND BUTTON
  ========================================================== */

  const handleSendMessage =
    useCallback(() => {
      if (
        !message.trim()
      ) {
        return;
      }

      sendMessage();
    }, [
      message,
      sendMessage,
    ]);

  /* ==========================================================
     KEYBOARD
  ========================================================== */

  const handleKeyDown =
    useCallback(
      (
        event:
          React.KeyboardEvent<HTMLTextAreaElement>,
      ) => {
        if (
          event.key ===
            "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          handleSendMessage();
        }
      },
      [
        handleSendMessage,
      ],
    );

  /* ==========================================================
     EMPTY CONVERSATION
  ========================================================== */

  if (
    !hasSelectedConversation
  ) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        className="
          h-full
          w-full
          p-6
          text-center
        "
      >
        <Box
          className="
            mb-3
            rounded-full
            bg-slate-100
            p-4
            dark:bg-slate-800/50
          "
        >
          <MessageSquare
            className="
              h-8
              w-8
              text-sky-500
              opacity-80
            "
          />
        </Box>

        <Text
          size="3"
          weight="bold"
          className="
            text-slate-700
            dark:text-slate-200
          "
        >
          No Conversation Selected
        </Text>

        <Text
          size="2"
          color="gray"
          className="mt-1 max-w-xs"
        >
          Select a conversation from
          the sidebar to view messages.
        </Text>
      </Flex>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        w-full
        flex-col
        overflow-hidden
        backdrop-blur-xl
      "
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <Box
        p="3"
        className="
          shrink-0
          border-b
          border-[var(--gray-a4)]
        "
      >
        <Flex
          align="center"
          justify="between"
        >
          <Flex
            align="center"
            gap="3"
            className="min-w-0"
          >
            {onBack && (
              <IconButton
                variant="ghost"
                color="gray"
                size="2"
                onClick={
                  onBack
                }
                className="
                  shrink-0
                  cursor-pointer
                  md:hidden
                "
              >
                <ArrowLeft
                  className="
                    h-5
                    w-5
                  "
                />
              </IconButton>
            )}

            <Avatar
              size="2"
              radius="full"
              fallback={
                selectedUser?.fullName
                  ? selectedUser.fullName
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"
              }
              src={
                selectedUser?.profilePicture ??
                undefined
              }
              color="sky"
              variant="soft"
            />

            <Box className="min-w-0">
              <Flex
                align="center"
                gap="1.5"
              >
                <Text
                  size="3"
                  mr="2"
                  weight="bold"
                  className="
                    max-w-[180px]
                    truncate
                    text-slate-800
                    dark:text-slate-100
                    sm:max-w-[300px]
                  "
                >
                  {selectedUser?.fullName ||
                    "Conversation"}
                </Text>

                {selectedUser?.isEmailVerified ? (
                  <Tooltip content="This user is verified.">
                    <span className="inline-flex items-center">
                      <BadgeCheck
                        className="
                          h-4
                          w-4
                          shrink-0
                          text-emerald-500
                        "
                      />
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip content="This user is not verified.">
                    <span className="inline-flex items-center">
                      <BadgeAlert
                        className="
                          h-4
                          w-4
                          shrink-0
                          text-rose-500
                        "
                      />
                    </span>
                  </Tooltip>
                )}
              </Flex>

              {selectedUser?.publicId && (
                <Text
                  size="1"
                  color="gray"
                  className="block truncate"
                >
                  @{selectedUser.publicId}
                </Text>
              )}
            </Box>
          </Flex>

          {/* =================================================
              RIGHT HEADER
          ================================================= */}

          <Flex
            align="center"
            gap="2"
          >
            {/* Profile / Info */}

            <IconButton
              variant="ghost"
              color="gray"
              onClick={() =>
                onOpenProfile?.()
              }
              className="
                shrink-0
                cursor-pointer
              "
            >
              <AiOutlineInfoCircle
                className="
                  h-5
                  w-5
                "
              />
            </IconButton>

            {/* Connection status */}

            <Badge
              color={
                socketConnected
                  ? "green"
                  : socketError
                    ? "red"
                    : "gray"
              }
              variant="soft"
              size="1"
            >
              {socketConnected
                ? "Connected"
                : socketError
                  ? "Offline"
                  : "Connecting"}
            </Badge>
          </Flex>
        </Flex>
      </Box>

      {/* ====================================================
          MESSAGE FEED
      ==================================================== */}

      <div
        ref={
          messagesContainerRef
        }
        className="
          min-h-0
          w-full
          flex-1
          overflow-y-auto
          p-4
        "
      >
        {/* Loading older messages */}

        {loadingOlder && (
          <Flex
            align="center"
            justify="center"
            className="
              sticky
              top-0
              z-10
              mb-2
              h-7
            "
          >
            <Text
              size="1"
              color="gray"
              className="
                rounded-full
                bg-[var(--color-background)]
                px-3
                py-1
                shadow-sm
              "
            >
              Loading older messages...
            </Text>
          </Flex>
        )}

        {!hasMoreMessages &&
          chats.length >=
            PAGE_SIZE && (
            <Flex
              align="center"
              justify="center"
              className="mb-3"
            >
              <Text
                size="1"
                color="gray"
              >
                Beginning of conversation
              </Text>
            </Flex>
          )}

        {loading ? (
          <Flex
            align="center"
            justify="center"
            className="h-full"
          >
            <Text
              size="2"
              color="gray"
            >
              Loading messages...
            </Text>
          </Flex>
        ) : chats.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            className="
              h-full
              text-center
            "
          >
            <Box
              className="
                mb-3
                rounded-full
                bg-slate-100
                p-4
                dark:bg-slate-800/50
              "
            >
              <MessageSquare
                className="
                  h-7
                  w-7
                  text-slate-400
                "
              />
            </Box>

            <Text
              size="3"
              weight="medium"
              className="
                text-slate-700
                dark:text-slate-200
              "
            >
              No messages yet
            </Text>

            <Text
              size="2"
              color="gray"
              className="mt-1"
            >
              Send a message to start the
              conversation.
            </Text>
          </Flex>
        ) : (
          <AnimatePresence
            initial={false}
          >
            {chats.map(
              (
                chat,
                index,
              ) => {
                const isMine =
                  Number(
                    chat.senderId,
                  ) ===
                  Number(senderId);

                const {
                  datePart,
                  timePart,
                } =
                  formatMessageDate(
                    chat.createdAt,
                  );

                return (
                  <motion.div
                    key={
                      chat.messageId ||
                      `${chat.conversationId}-${index}`
                    }
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                    className="mb-3"
                  >
                    <Flex
                      direction="column"
                      align="center"
                      gap="1"
                    >
                      {/* DATE */}

                      {datePart && (
                        <Text
                          size="1"
                          color="gray"
                          className="
                            my-1
                            text-[11px]
                            opacity-70
                          "
                        >
                          {datePart}
                        </Text>
                      )}

                      {/* MESSAGE ROW */}

                      <Flex
                        justify={
                          isMine
                            ? "end"
                            : "start"
                        }
                        className="w-full"
                      >
                        <div
                          className={`
                            flex
                            max-w-[80%]
                            flex-col
                            sm:max-w-[70%]
                            ${
                              isMine
                                ? "items-end"
                                : "items-start"
                            }
                          `}
                        >
                          {/* MESSAGE */}

                          <div
                            className={`
                              max-w-full
                              break-words
                              overflow-hidden
                              rounded-2xl
                              px-3.5
                              py-2
                              text-sm
                              shadow-sm
                              transition-all
                              ${
                                isMine
                                  ? `
                                    rounded-br-xs
                                    bg-sky-600
                                    text-white
                                  `
                                  : `
                                    rounded-bl-xs
                                    border
                                    border-[var(--gray-a3)]
                                    bg-slate-200/80
                                    text-slate-900
                                    dark:bg-slate-800/80
                                    dark:text-slate-100
                                  `
                              }
                            `}
                          >
                            <p
                              className="
                                min-w-0
                                whitespace-pre-wrap
                                break-words
                                leading-relaxed
                              "
                            >
                              {chat.message}
                            </p>
                          </div>

                          {/* TIME + STATUS */}

                          <Flex
                            align="center"
                            justify={
                              isMine
                                ? "end"
                                : "start"
                            }
                            gap="1"
                            className="
                              mt-0.5
                              px-1
                            "
                          >
                            {isMine && (
                              <StatusIcon
                                status={
                                  chat.status
                                }
                              />
                            )}

                            <Text
                              size="1"
                              color="gray"
                              className="
                                whitespace-nowrap
                                text-[10px]
                              "
                            >
                              {timePart}
                            </Text>
                          </Flex>
                        </div>
                      </Flex>
                    </Flex>
                  </motion.div>
                );
              },
            )}
          </AnimatePresence>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ====================================================
          MESSAGE COMPOSER
      ==================================================== */}

      <Box
        p="3"
        className="
          shrink-0
          border-t
          border-[var(--gray-a4)]
        "
      >
        <Flex
          align="center"
          gap="2"
          className="
            rounded
            border
            border-[var(--gray-a4)]
            bg-[var(--gray-a2)]
            px-3
            py-2
            transition-colors
            focus-within:border-[var(--accent-a7)]
            focus-within:bg-[var(--gray-a1)]
          "
        >
          {/* Attachment */}

          <IconButton
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            disabled
            className="
              !rounded-lg
              !p-1.5
              shrink-0
              text-[var(--gray-a8)]
            "
          >
            <Paperclip
              className="
                h-4
                w-4
              "
            />
          </IconButton>

          {/* Textarea */}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              setMessage(
                event.target.value,
              );

              event.target.style.height =
                "auto";

              event.target.style.height =
                `${Math.min(
                  event.target
                    .scrollHeight,
                  120,
                )}px`;
            }}
            onKeyDown={
              handleKeyDown
            }
            placeholder="Write a message..."
            rows={1}
            disabled={
              !socketConnected
            }
            className="
              min-h-[20px]
              max-h-[120px]
              min-w-0
              flex-1
              resize-none
              overflow-y-auto
              bg-transparent
              text-sm
              leading-6
              text-[var(--gray-a12)]
              placeholder:text-[var(--gray-a8)]
              outline-none
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          />

          {/* Send */}

          <IconButton
            type="button"
            size="2"
            variant="ghost"
            color="gray"
            onClick={
              handleSendMessage
            }
            disabled={
              !message.trim() ||
              !socketConnected
            }
            className={`
              !rounded-full
              shrink-0
              transition-all
              duration-200
              ${
                message.trim() &&
                socketConnected
                  ? `
                    !text-[var(--gray-a12)]
                    hover:!bg-[var(--gray-a4)]
                    hover:scale-105
                    active:scale-90
                  `
                  : `
                    !text-[var(--gray-a6)]
                    opacity-60
                  `
              }
            `}
          >
            <Send
              className="
                h-4
                w-4
              "
            />
          </IconButton>
        </Flex>
      </Box>
    </div>
  );
};

export default React.memo(
  Middlebar,
);