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
  ArrowDown,
  ArrowLeft,
  BadgeAlert,
  BadgeCheck,
  Ban,
  Check,
  CheckCheck,
  MessageSquare,
  MoreVertical,
  Pencil,
  Reply,
  Send,
  ShieldBan,
  SmilePlus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  AiOutlineInfoCircle,
} from "react-icons/ai";

import {
  AlertDialog,
  Avatar,
  Badge,
  Box,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  Tooltip,
} from "@radix-ui/themes";

import API_ENDPOINTS, {
  BlockStatus,
  GetConversationRequest,
  GetConversationResponse,
  GroupDetails,
  SendMessageRequest,
} from "@/app/routes/api";

import Link from "next/link";
import { toast } from "sonner";

import { getErrorMessage } from "@/app/lib/apiError";
import useConfirm from "../../shared/useConfirm";

/* ============================================================
   TYPES
============================================================ */

export interface MessageReaction {
  userId: number;
  emoji: string;
}

export interface ReplyPreview {
  messageId: number;
  senderId: number;
  message: string;
  isDeleted: boolean;
}

export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  message: string;
  type?: string;
  status: string;
  createdAt: string;
  editedAt?: string | null;
  isDeleted?: boolean;
  replyTo?: ReplyPreview | null;
  reactions?: MessageReaction[];
}

interface PresenceState {
  isOnline: boolean;
  lastSeenAt: string | null;
}

const QUICK_REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
];

/**
 * How long after the last keystroke we tell
 * the other side we stopped typing.
 */
const TYPING_IDLE_MS = 2500;

/**
 * Safety net in case a "stopped typing"
 * event is lost.
 */
const TYPING_DISPLAY_TIMEOUT_MS = 6000;

const formatLastSeen = (
  timestamp: string | null,
) => {
  if (!timestamp) {
    return "Offline";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  const diffMs =
    Date.now() - date.getTime();

  const minutes = Math.floor(
    diffMs / 60000,
  );

  if (minutes < 1) {
    return "Last seen just now";
  }

  if (minutes < 60) {
    return `Last seen ${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `Last seen ${hours} h ago`;
  }

  return `Last seen ${date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    },
  )}`;
};

/**
 * Group reactions as [{ emoji, count, mine }].
 */
const groupReactions = (
  reactions: MessageReaction[] | undefined,
  myId: number,
) => {
  const groups = new Map<
    string,
    {
      emoji: string;
      count: number;
      mine: boolean;
    }
  >();

  for (const reaction of reactions ?? []) {
    const group = groups.get(
      reaction.emoji,
    ) ?? {
      emoji: reaction.emoji,
      count: 0,
      mine: false,
    };

    group.count += 1;

    if (
      Number(reaction.userId) === myId
    ) {
      group.mine = true;
    }

    groups.set(reaction.emoji, group);
  }

  return [...groups.values()];
};

const STATUS_RANK: Record<string, number> = {
  sent: 0,
  delivered: 1,
  seen: 2,
};

/**
 * Only move a status forward
 * (sent -> delivered -> seen).
 */
const upgradeStatus = (
  current: string,
  next: string,
) =>
  (STATUS_RANK[next] ?? 0) >
  (STATUS_RANK[current?.toLowerCase()] ?? 0)
    ? next
    : current;

export interface ConversationUser {
  userId: number;
  isDeactivated?: boolean;
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

  conversationType?: "DIRECT" | "GROUP";

  conversationName?: string | null;

  /**
   * Loaded by this component for GROUP
   * conversations and lifted to the parent.
   */
  group?: GroupDetails | null;

  onGroupChange?: (group: GroupDetails) => void;

  /** The signed-in user's profile is deactivated. */
  selfDeactivated?: boolean;

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

  type:
    message.type === "SYSTEM"
      ? "SYSTEM"
      : "TEXT",

  editedAt:
    message.editedAt ?? null,

  isDeleted: Boolean(
    message.isDeleted,
  ),

  replyTo:
    message.replyTo &&
    Number.isFinite(
      Number(
        message.replyTo.messageId,
      ),
    )
      ? {
          messageId: Number(
            message.replyTo.messageId,
          ),
          senderId: Number(
            message.replyTo.senderId,
          ),
          message:
            message.replyTo.message ?? "",
          isDeleted: Boolean(
            message.replyTo.isDeleted,
          ),
        }
      : null,

  reactions: Array.isArray(
    message.reactions,
  )
    ? message.reactions
    : [],
});

/* ============================================================
   MESSAGE ACTION BUTTON
============================================================ */

const MessageActionButton = ({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <Tooltip content={label}>
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();

        onClick();
      }}
      className={`
        flex
        h-6
        w-6
        cursor-pointer
        items-center
        justify-center
        rounded-full
        text-[var(--gray-a11)]
        transition-colors
        hover:bg-[var(--gray-a4)]
        ${
          danger
            ? "hover:text-rose-500"
            : "hover:text-[var(--gray-a12)]"
        }
      `}
    >
      {children}
    </button>
  </Tooltip>
);

/* ============================================================
   MIDDLEBAR
============================================================ */

const Middlebar: React.FC<
  MiddlebarProps
> = ({
  senderId,
  conversationId,
  conversationUser,
  conversationType = "DIRECT",
  conversationName = null,
  group = null,
  onGroupChange,
  selfDeactivated = false,
  onBack,
  onOpenProfile,
}) => {
  const isGroup =
    conversationType === "GROUP";

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

  const [
    replyingTo,
    setReplyingTo,
  ] = useState<ChatMessage | null>(null);

  const [
    editingMessage,
    setEditingMessage,
  ] = useState<ChatMessage | null>(null);

  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<ChatMessage | null>(null);

  /**
   * Users currently typing here (one for a
   * direct chat, several in a group).
   */
  const [
    typingUserIds,
    setTypingUserIds,
  ] = useState<number[]>([]);

  const partnerTyping =
    typingUserIds.length > 0;

  const [
    presence,
    setPresence,
  ] = useState<PresenceState | null>(null);

  /**
   * Message whose action bar / reaction
   * picker is open (tap support on mobile).
   */
  const [
    activeMessageId,
    setActiveMessageId,
  ] = useState<number | null>(null);

  const [
    reactionPickerFor,
    setReactionPickerFor,
  ] = useState<number | null>(null);

  const [
    highlightedMessageId,
    setHighlightedMessageId,
  ] = useState<number | null>(null);

  const [
    showScrollDown,
    setShowScrollDown,
  ] = useState(false);

  /**
   * DIRECT only: either side blocked.
   */
  const [
    blockStatus,
    setBlockStatus,
  ] = useState<BlockStatus>({
    blockedByMe: false,
    blockedMe: false,
  });

  const [
    confirmDeleteChat,
    setConfirmDeleteChat,
  ] = useState(false);

  const [
    chatActionBusy,
    setChatActionBusy,
  ] = useState(false);

  const { confirm, confirmDialog } =
    useConfirm();

  /**
   * Re-render once a minute so
   * "Last seen X min ago" stays fresh.
   */
  const [, setClock] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setClock((value) => value + 1),
      60000,
    );

    return () => clearInterval(timer);
  }, []);

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

  /**
   * Values read inside socket handlers
   * without re-creating the socket.
   */
  const senderIdRef =
    useRef<number>(Number(senderId));

  const partnerIdRef =
    useRef<number | null>(
      isGroup
        ? null
        : conversationUser?.userId ?? null,
    );

  useEffect(() => {
    senderIdRef.current =
      Number(senderId);
  }, [senderId]);

  useEffect(() => {
    partnerIdRef.current = isGroup
      ? null
      : conversationUser?.userId ?? null;
  }, [conversationUser?.userId, isGroup]);

  /**
   * Outgoing typing state.
   */
  const typingSentRef =
    useRef(false);

  const typingIdleTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /**
   * Incoming typing safety timeouts, per user.
   */
  const typingTimersRef = useRef(
    new Map<
      number,
      ReturnType<typeof setTimeout>
    >(),
  );

  const onGroupChangeRef =
    useRef(onGroupChange);

  useEffect(() => {
    onGroupChangeRef.current =
      onGroupChange;
  }, [onGroupChange]);

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

          console.log(
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
          console.log(
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

        const distanceFromBottom =
          container.scrollHeight -
          container.scrollTop -
          container.clientHeight;

        setShowScrollDown(
          distanceFromBottom > 400,
        );
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

    const stopTypingFor = (
      typingUserId: number,
    ) => {
      const timer =
        typingTimersRef.current.get(
          typingUserId,
        );

      if (timer) {
        clearTimeout(timer);

        typingTimersRef.current.delete(
          typingUserId,
        );
      }

      setTypingUserIds((previous) =>
        previous.includes(typingUserId)
          ? previous.filter(
              (id) => id !== typingUserId,
            )
          : previous,
      );
    };

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

              /**
               * Load the partner's presence.
               */
              const partnerId =
                partnerIdRef.current;

              if (partnerId) {
                socket.emit(
                  "get_presence",
                  {
                    userId: partnerId,
                  },
                  (
                    presenceResponse?: {
                      success?: boolean;
                      userId?: number;
                      isOnline?: boolean;
                      lastSeenAt?: string | null;
                    },
                  ) => {
                    if (
                      presenceResponse?.success &&
                      Number(
                        presenceResponse.userId,
                      ) ===
                        partnerIdRef.current
                    ) {
                      setPresence({
                        isOnline: Boolean(
                          presenceResponse.isOnline,
                        ),
                        lastSeenAt:
                          presenceResponse.lastSeenAt ??
                          null,
                      });
                    }
                  },
                );
              }
            } else {
              console.log(
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

        /**
         * Message from the other side while
         * this conversation is open and visible
         * -> it's read immediately.
         */
        if (
          normalizedMessage.senderId !==
          senderIdRef.current
        ) {
          stopTypingFor(
            normalizedMessage.senderId,
          );

          if (
            typeof document ===
              "undefined" ||
            document.visibilityState ===
              "visible"
          ) {
            socket.emit(
              "mark_conversation_read",
              {
                conversationId:
                  numericConversationId,
              },
            );
          }
        }
      };

    /* ========================================================
       MESSAGE UPDATED (edit / delete / reactions)
    ======================================================== */

    const handleMessageUpdated =
      (
        incomingMessage: ChatMessage,
      ) => {
        if (!incomingMessage) {
          return;
        }

        const updatedMessage =
          normalizeMessage(
            incomingMessage,
          );

        if (
          updatedMessage.conversationId !==
          numericConversationId
        ) {
          return;
        }

        setChats((previous) =>
          previous.map((chat) => {
            if (
              chat.messageId ===
              updatedMessage.messageId
            ) {
              return {
                ...updatedMessage,
                status: upgradeStatus(
                  chat.status,
                  updatedMessage.status,
                ),
              };
            }

            /**
             * Keep reply previews in sync.
             */
            if (
              chat.replyTo?.messageId ===
              updatedMessage.messageId
            ) {
              return {
                ...chat,
                replyTo: {
                  ...chat.replyTo,
                  message:
                    updatedMessage.message.slice(
                      0,
                      200,
                    ),
                  isDeleted: Boolean(
                    updatedMessage.isDeleted,
                  ),
                },
              };
            }

            return chat;
          }),
        );
      };

    /* ========================================================
       READ / DELIVERY RECEIPTS
    ======================================================== */

    const upgradeMyMessages = (
      nextStatus: string,
    ) => {
      setChats((previous) =>
        previous.map((chat) =>
          chat.senderId ===
          senderIdRef.current
            ? {
                ...chat,
                status: upgradeStatus(
                  chat.status,
                  nextStatus,
                ),
              }
            : chat,
        ),
      );
    };

    const handleMessagesSeen = (data: {
      conversationId: number;
      readerId: number;
    }) => {
      if (
        Number(data?.conversationId) !==
          numericConversationId ||
        Number(data?.readerId) ===
          senderIdRef.current
      ) {
        return;
      }

      upgradeMyMessages("seen");
    };

    const handleMessagesDelivered =
      (data: {
        conversationId: number;
        recipientId: number;
      }) => {
        if (
          Number(
            data?.conversationId,
          ) !== numericConversationId ||
          Number(data?.recipientId) ===
            senderIdRef.current
        ) {
          return;
        }

        upgradeMyMessages("delivered");
      };

    /* ========================================================
       TYPING
    ======================================================== */

    const handleTyping = (data: {
      conversationId: number;
      userId: number;
      isTyping: boolean;
    }) => {
      if (
        Number(data?.conversationId) !==
          numericConversationId ||
        Number(data?.userId) ===
          senderIdRef.current
      ) {
        return;
      }

      const typingUserId = Number(
        data.userId,
      );

      if (!data.isTyping) {
        stopTypingFor(typingUserId);
        return;
      }

      const timers =
        typingTimersRef.current;

      const existing =
        timers.get(typingUserId);

      if (existing) {
        clearTimeout(existing);
      }

      timers.set(
        typingUserId,
        setTimeout(() => {
          stopTypingFor(typingUserId);
        }, TYPING_DISPLAY_TIMEOUT_MS),
      );

      setTypingUserIds((previous) =>
        previous.includes(typingUserId)
          ? previous
          : [...previous, typingUserId],
      );
    };

    /* ========================================================
       GROUP UPDATES
    ======================================================== */

    const handleGroupUpdated = (
      data: GroupDetails,
    ) => {
      if (
        Number(data?.conversationId) ===
          numericConversationId &&
        Array.isArray(data?.members)
      ) {
        onGroupChangeRef.current?.(data);
      }
    };

    /* ========================================================
       PRESENCE
    ======================================================== */

    const handlePresenceUpdate =
      (data: {
        userId: number;
        isOnline: boolean;
        lastSeenAt: string | null;
      }) => {
        if (
          Number(data?.userId) !==
          partnerIdRef.current
        ) {
          return;
        }

        setPresence({
          isOnline: Boolean(
            data.isOnline,
          ),
          lastSeenAt:
            data.lastSeenAt ?? null,
        });

        if (!data.isOnline) {
          stopTypingFor(
            Number(data.userId),
          );
        }
      };

    /* ========================================================
       TAB BECOMES VISIBLE -> READ
    ======================================================== */

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
            "visible" &&
          socket.connected &&
          joinedConversationIdRef.current ===
            numericConversationId
        ) {
          socket.emit(
            "mark_conversation_read",
            {
              conversationId:
                numericConversationId,
            },
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /* ========================================================
       CONNECT ERROR
    ======================================================== */

    const handleConnectError =
      (
        error: Error,
      ) => {
        console.log(
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

    socket.on(
      "message_updated",
      handleMessageUpdated,
    );

    socket.on(
      "messages_seen",
      handleMessagesSeen,
    );

    socket.on(
      "messages_delivered",
      handleMessagesDelivered,
    );

    socket.on(
      "typing",
      handleTyping,
    );

    socket.on(
      "presence_update",
      handlePresenceUpdate,
    );

    socket.on(
      "group_updated",
      handleGroupUpdated,
    );

    const handleBlockUpdated = (data: {
      userId: number;
      blockedByMe: boolean;
      blockedMe: boolean;
    }) => {
      if (
        Number(data?.userId) ===
        partnerIdRef.current
      ) {
        setBlockStatus({
          blockedByMe: Boolean(data.blockedByMe),
          blockedMe: Boolean(data.blockedMe),
        });
      }
    };

    socket.on(
      "block_updated",
      handleBlockUpdated,
    );

    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {
      /**
       * Stop "typing..." on the other side
       * before leaving the room.
       */
      if (
        socket.connected &&
        typingSentRef.current
      ) {
        socket.emit("typing", {
          conversationId:
            numericConversationId,
          isTyping: false,
        });
      }

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

      socket.off(
        "message_updated",
        handleMessageUpdated,
      );

      socket.off(
        "messages_seen",
        handleMessagesSeen,
      );

      socket.off(
        "messages_delivered",
        handleMessagesDelivered,
      );

      socket.off(
        "typing",
        handleTyping,
      );

      socket.off(
        "presence_update",
        handlePresenceUpdate,
      );

      socket.off(
        "group_updated",
        handleGroupUpdated,
      );

      socket.off(
        "block_updated",
        handleBlockUpdated,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      for (const timer of typingTimersRef.current.values()) {
        clearTimeout(timer);
      }

      typingTimersRef.current.clear();

      if (
        typingIdleTimerRef.current
      ) {
        clearTimeout(
          typingIdleTimerRef.current,
        );

        typingIdleTimerRef.current =
          null;
      }

      typingSentRef.current = false;

      setTypingUserIds([]);

      setPresence(null);

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
    partnerTyping,
  ]);

  /* ==========================================================
     KEEP OPEN MENUS VISIBLE
  ========================================================== */

  useEffect(() => {
    const id =
      reactionPickerFor ??
      activeMessageId;

    if (id === null) {
      return;
    }

    /**
     * Menus open below the message; for the
     * newest messages scroll so they aren't
     * hidden behind the composer.
     */
    requestAnimationFrame(() => {
      const element =
        document.getElementById(
          reactionPickerFor !== null
            ? `reaction-picker-${id}`
            : `message-actions-${id}`,
        );

      element?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [
    reactionPickerFor,
    activeMessageId,
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

    setReplyingTo(null);

    setEditingMessage(null);

    setPendingDelete(null);

    setActiveMessageId(null);

    setReactionPickerFor(null);

    setShowScrollDown(false);

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
     TYPING (OUTGOING)
  ========================================================== */

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;

      const numericConversationId =
        Number(conversationId);

      if (
        !socket?.connected ||
        !Number.isFinite(
          numericConversationId,
        )
      ) {
        return;
      }

      if (
        typingSentRef.current ===
        isTyping
      ) {
        return;
      }

      typingSentRef.current = isTyping;

      socket.emit("typing", {
        conversationId:
          numericConversationId,
        isTyping,
      });
    },
    [conversationId],
  );

  const stopTyping = useCallback(() => {
    if (typingIdleTimerRef.current) {
      clearTimeout(
        typingIdleTimerRef.current,
      );

      typingIdleTimerRef.current = null;
    }

    emitTyping(false);
  }, [emitTyping]);

  const handleUserTyping = useCallback(
    (value: string) => {
      /**
       * Editing an old message is not
       * "typing a new one".
       */
      if (editingMessage) {
        return;
      }

      if (!value.trim()) {
        stopTyping();

        return;
      }

      emitTyping(true);

      if (typingIdleTimerRef.current) {
        clearTimeout(
          typingIdleTimerRef.current,
        );
      }

      typingIdleTimerRef.current =
        setTimeout(() => {
          typingIdleTimerRef.current =
            null;

          emitTyping(false);
        }, TYPING_IDLE_MS);
    },
    [
      editingMessage,
      emitTyping,
      stopTyping,
    ],
  );

  /* ==========================================================
     MESSAGE ACTIONS
  ========================================================== */

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();

      textarea.style.height = "auto";

      textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        120,
      )}px`;
    });
  };

  const startReply = useCallback(
    (chat: ChatMessage) => {
      setEditingMessage(null);

      setReplyingTo(chat);

      setActiveMessageId(null);

      setReactionPickerFor(null);

      focusComposer();
    },
    [],
  );

  const startEdit = useCallback(
    (chat: ChatMessage) => {
      stopTyping();

      setReplyingTo(null);

      setEditingMessage(chat);

      setMessage(chat.message);

      setActiveMessageId(null);

      setReactionPickerFor(null);

      focusComposer();
    },
    [stopTyping],
  );

  const cancelComposerMode =
    useCallback(() => {
      if (editingMessage) {
        setMessage("");
      }

      setEditingMessage(null);

      setReplyingTo(null);
    }, [editingMessage]);

  const toggleReaction = useCallback(
    (
      messageId: number,
      emoji: string,
    ) => {
      setReactionPickerFor(null);

      setActiveMessageId(null);

      socketRef.current?.emit(
        "toggle_reaction",
        {
          messageId,
          emoji,
        },
        (response?: {
          success?: boolean;
          message?: unknown;
        }) => {
          if (
            response?.success === false
          ) {
            toast.error(
              typeof response.message === "string"
                ? response.message
                : "Couldn't react to that message.",
            );
          }
        },
      );
    },
    [],
  );

  const confirmDelete =
    useCallback(() => {
      const target = pendingDelete;

      setPendingDelete(null);

      if (!target) {
        return;
      }

      socketRef.current?.emit(
        "delete_message",
        {
          messageId: target.messageId,
        },
        (response?: {
          success?: boolean;
          message?: unknown;
        }) => {
          if (
            response?.success === false
          ) {
            toast.error(
              typeof response.message === "string"
                ? response.message
                : "Couldn't unsend that message.",
            );
          }
        },
      );

      if (
        editingMessage?.messageId ===
        target.messageId
      ) {
        setEditingMessage(null);

        setMessage("");
      }

      if (
        replyingTo?.messageId ===
        target.messageId
      ) {
        setReplyingTo(null);
      }
    }, [
      pendingDelete,
      editingMessage,
      replyingTo,
    ]);

  /**
   * Scroll to the original message
   * when a reply quote is clicked.
   */
  const jumpToMessage = useCallback(
    (messageId: number) => {
      const element =
        document.getElementById(
          `message-${messageId}`,
        );

      if (!element) {
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedMessageId(messageId);

      setTimeout(() => {
        setHighlightedMessageId(
          (current) =>
            current === messageId
              ? null
              : current,
        );
      }, 1600);
    },
    [],
  );

  const scrollToBottom =
    useCallback(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, []);

  /**
   * userId -> member, for sender names in groups.
   */
  const membersById = useMemo(
    () =>
      new Map(
        (group?.conversationId ===
        Number(conversationId)
          ? group.members
          : []
        ).map((member) => [
          member.userId,
          member,
        ]),
      ),
    [group, conversationId],
  );

  const getSenderLabel = useCallback(
    (id: number) =>
      id === Number(senderId)
        ? "You"
        : isGroup
          ? membersById.get(id)?.fullName ||
            "Former member"
          : conversationUser?.fullName ||
            "User",
    [
      senderId,
      isGroup,
      membersById,
      conversationUser?.fullName,
    ],
  );

  /**
   * Group permission: may I send messages?
   */
  const myMember = membersById.get(
    Number(senderId),
  );

  const canSendMessages =
    !isGroup ||
    !group ||
    myMember?.role === "ADMIN" ||
    group.permissions.sendMessages === "ALL";

  const typingLabel = useMemo(() => {
    if (typingUserIds.length === 0) {
      return null;
    }

    if (!isGroup) {
      return "typing…";
    }

    const names = typingUserIds.map(
      (id) =>
        membersById
          .get(id)
          ?.fullName.split(" ")[0] ||
        "Someone",
    );

    if (names.length === 1) {
      return `${names[0]} is typing…`;
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing…`;
    }

    return `${names.length} people are typing…`;
  }, [typingUserIds, isGroup, membersById]);

  /* ==========================================================
     BLOCK STATUS (direct chats)
  ========================================================== */

  const partnerUserId = isGroup
    ? null
    : conversationUser?.userId ?? null;

  useEffect(() => {
    setBlockStatus({
      blockedByMe: false,
      blockedMe: false,
    });

    if (!partnerUserId) {
      return;
    }

    let cancelled = false;

    axios
      .post<BlockStatus>(
        API_ENDPOINTS.BlockStatus,
        { userId: partnerUserId },
        { withCredentials: true },
      )
      .then((response) => {
        if (!cancelled && response.data) {
          setBlockStatus(response.data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [partnerUserId, conversationId]);

  const toggleBlock = useCallback(async () => {
    if (!partnerUserId) {
      return;
    }

    const blocking = !blockStatus.blockedByMe;

    const name =
      conversationUser?.fullName ?? "this person";

    const ok = await confirm(
      blocking
        ? {
            title: `Block ${name}?`,
            consequences: [
              "Neither of you can message the other.",
              "They can't add you to groups or see your private details.",
              "Your chat history stays; you can unblock any time.",
            ],
            confirmLabel: "Block",
            danger: true,
          }
        : {
            title: `Unblock ${name}?`,
            consequences: [
              "You can message each other again.",
              "Your privacy settings apply to them as usual.",
            ],
            confirmLabel: "Unblock",
          },
    );

    if (!ok) {
      return;
    }

    try {
      setChatActionBusy(true);

      const response = await axios.post<BlockStatus>(
        blocking
          ? API_ENDPOINTS.BlockUser
          : API_ENDPOINTS.UnblockUser,
        { userId: partnerUserId },
        { withCredentials: true },
      );

      setBlockStatus(response.data);

      toast.success(
        blocking
          ? `${conversationUser?.fullName ?? "User"} is blocked.`
          : `${conversationUser?.fullName ?? "User"} is unblocked.`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          blocking ? "Couldn't block." : "Couldn't unblock.",
        ),
      );
    } finally {
      setChatActionBusy(false);
    }
  }, [
    partnerUserId,
    blockStatus.blockedByMe,
    conversationUser?.fullName,
    confirm,
  ]);

  /**
   * Delete for me: the sidebar's
   * "conversation_deleted" event closes this view.
   */
  const deleteChat = useCallback(async () => {
    const numericConversationId =
      Number(conversationId);

    if (!Number.isFinite(numericConversationId)) {
      return;
    }

    try {
      setChatActionBusy(true);

      await axios.post(
        API_ENDPOINTS.DeleteChat,
        { conversationId: numericConversationId },
        { withCredentials: true },
      );

      setConfirmDeleteChat(false);

      toast.success("Chat deleted.");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Couldn't delete the chat."),
      );
    } finally {
      setChatActionBusy(false);
    }
  }, [conversationId]);

  const isBlocked =
    !isGroup &&
    (blockStatus.blockedByMe ||
      blockStatus.blockedMe);

  /* ==========================================================
     LOAD GROUP DETAILS
  ========================================================== */

  useEffect(() => {
    const numericConversationId =
      Number(conversationId);

    if (
      !isGroup ||
      !Number.isFinite(
        numericConversationId,
      ) ||
      numericConversationId <= 0
    ) {
      return;
    }

    let cancelled = false;

    axios
      .post<GroupDetails>(
        API_ENDPOINTS.GroupDetails,
        {
          conversationId:
            numericConversationId,
        },
        { withCredentials: true },
      )
      .then((response) => {
        if (
          !cancelled &&
          response.data?.members
        ) {
          onGroupChangeRef.current?.(
            response.data,
          );
        }
      })
      .catch((error) => {
        console.log(
          "Failed to load group:",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, isGroup]);

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

      /**
       * EDIT MODE
       */
      if (editingMessage) {
        const target = editingMessage;

        if (
          trimmedMessage !== target.message
        ) {
          socket.emit(
            "edit_message",
            {
              messageId: target.messageId,
              message: trimmedMessage,
            },
            (response?: {
              success?: boolean;
              message?: unknown;
            }) => {
              if (
                response?.success === false
              ) {
                toast.error(
              typeof response.message === "string"
                ? response.message
                : "Couldn't edit that message.",
            );
              }
            },
          );
        }

        setEditingMessage(null);

        setMessage("");

        if (textareaRef.current) {
          textareaRef.current.style.height =
            "auto";
        }

        return;
      }

      stopTyping();

      const payload:
        SendMessageRequest =
        {
          conversationId:
            numericConversationId,

          message:
            trimmedMessage,

          status:
            "sent",

          replyToMessageId:
            replyingTo?.messageId ??
            null,
        };

      setReplyingTo(null);

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
            toast.error(
              typeof response.message === "string"
                ? response.message
                : "Message not sent.",
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
      editingMessage,
      replyingTo,
      stopTyping,
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

          return;
        }

        if (
          event.key === "Escape" &&
          (replyingTo || editingMessage)
        ) {
          event.preventDefault();

          cancelComposerMode();

          return;
        }

        /**
         * Arrow-up on an empty composer edits
         * your last message (like Slack/Discord).
         */
        if (
          event.key === "ArrowUp" &&
          !message &&
          !editingMessage
        ) {
          const myLast = [...chats]
            .reverse()
            .find(
              (chat) =>
                chat.senderId ===
                  Number(senderId) &&
                !chat.isDeleted &&
                chat.type !== "SYSTEM",
            );

          if (myLast) {
            event.preventDefault();

            startEdit(myLast);
          }
        }
      },
      [
        handleSendMessage,
        replyingTo,
        editingMessage,
        cancelComposerMode,
        message,
        chats,
        senderId,
        startEdit,
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

            {isGroup ? (
              <button
                type="button"
                onClick={() => onOpenProfile?.()}
                className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
                aria-label="Group info"
              >
                <Avatar
                  size="2"
                  radius="full"
                  color="indigo"
                  variant="soft"
                  fallback={
                    <Users className="h-4 w-4" />
                  }
                />

                <Box className="min-w-0">
                  <Text
                    size="3"
                    weight="bold"
                    className="
                      block
                      max-w-[180px]
                      truncate
                      text-slate-800
                      dark:text-slate-100
                      sm:max-w-[300px]
                    "
                  >
                    {group?.name ||
                      conversationName ||
                      "Group"}
                  </Text>

                  {typingLabel ? (
                    <Text
                      size="1"
                      className="block truncate font-medium text-sky-500"
                    >
                      {typingLabel}
                    </Text>
                  ) : (
                    <Text
                      size="1"
                      color="gray"
                      className="block truncate"
                    >
                      {group
                        ? `${group.members.length} member${
                            group.members.length === 1
                              ? ""
                              : "s"
                          }`
                        : "Group"}
                    </Text>
                  )}
                </Box>
              </button>
            ) : (
            <>
            <span className="relative inline-flex shrink-0">
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

              {presence?.isOnline && (
                <span
                  aria-label="Online"
                  className="
                    absolute
                    -bottom-0.5
                    -right-0.5
                    h-3
                    w-3
                    rounded-full
                    border-2
                    border-[var(--color-background)]
                    bg-emerald-500
                  "
                />
              )}
            </span>

            <Box className="min-w-0">
              <Flex
                align="center"
                gap="1.5"
              >
                {selectedUser?.publicId ? (
                  <Tooltip content="View profile">
                    <Link
                      href={`/${encodeURIComponent(
                        selectedUser.publicId,
                      )}`}
                      className="
                        mr-2
                        max-w-[180px]
                        truncate
                        text-base
                        font-bold
                        text-slate-800
                        hover:underline
                        dark:text-slate-100
                        sm:max-w-[300px]
                      "
                    >
                      {selectedUser.fullName ||
                        "Conversation"}
                    </Link>
                  </Tooltip>
                ) : (
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
                )}

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

              {partnerTyping ? (
                <Text
                  size="1"
                  className="block truncate font-medium text-sky-500"
                >
                  typing…
                </Text>
              ) : presence ? (
                <Text
                  size="1"
                  className={`block truncate ${
                    presence.isOnline
                      ? "text-emerald-500"
                      : "text-[var(--gray-a10)]"
                  }`}
                >
                  {presence.isOnline
                    ? "Online"
                    : formatLastSeen(
                        presence.lastSeenAt,
                      )}
                  {selectedUser?.publicId && (
                    <span className="text-[var(--gray-a9)]">
                      {" "}
                      · @{selectedUser.publicId}
                    </span>
                  )}
                </Text>
              ) : (
                selectedUser?.publicId && (
                  <Text
                    size="1"
                    color="gray"
                    className="block truncate"
                  >
                    @{selectedUser.publicId}
                  </Text>
                )
              )}
            </Box>
            </>
            )}
          </Flex>

          {/* =================================================
              RIGHT HEADER
          ================================================= */}

          <Flex
            align="center"
            gap="2"
          >
            {/* Connection problems only */}

            {!socketConnected && (
              <Badge
                color={socketError ? "red" : "gray"}
                variant="soft"
                size="1"
              >
                {socketError ? "Offline" : "Connecting…"}
              </Badge>
            )}

            {/* Info (mobile: opens profile / group panel) */}

            {onOpenProfile && (
              <IconButton
                variant="ghost"
                color="gray"
                aria-label={isGroup ? "Group info" : "Profile"}
                onClick={() => onOpenProfile()}
                className="shrink-0 cursor-pointer md:hidden"
              >
                <AiOutlineInfoCircle className="h-5 w-5" />
              </IconButton>
            )}

            {/* Chat actions */}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton
                  variant="ghost"
                  color="gray"
                  aria-label="Chat options"
                  className="shrink-0 cursor-pointer"
                  disabled={chatActionBusy}
                >
                  <MoreVertical className="h-5 w-5" />
                </IconButton>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content align="end">
                {!isGroup && selectedUser?.publicId && (
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/${encodeURIComponent(
                        selectedUser.publicId,
                      )}`}
                    >
                      View profile
                    </Link>
                  </DropdownMenu.Item>
                )}

                {isGroup && onOpenProfile && (
                  <DropdownMenu.Item
                    onSelect={() => onOpenProfile()}
                  >
                    Group info
                  </DropdownMenu.Item>
                )}

                {!isGroup && partnerUserId && (
                  <DropdownMenu.Item
                    color={
                      blockStatus.blockedByMe
                        ? undefined
                        : "red"
                    }
                    onSelect={() => {
                      void toggleBlock();
                    }}
                  >
                    {blockStatus.blockedByMe
                      ? "Unblock"
                      : "Block"}
                  </DropdownMenu.Item>
                )}

                <DropdownMenu.Separator />

                <DropdownMenu.Item
                  color="red"
                  onSelect={() =>
                    setConfirmDeleteChat(true)
                  }
                >
                  Delete chat
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Flex>
      </Box>

      {/* ====================================================
          MESSAGE FEED
      ==================================================== */}

      <div className="relative flex min-h-0 w-full flex-1 flex-col">
      <div
        ref={
          messagesContainerRef
        }
        onClick={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            setActiveMessageId(null);

            setReactionPickerFor(null);
          }
        }}
        className="
          min-h-0
          w-full
          flex-1
          overflow-y-auto
          p-4
          pt-6
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

                /* ------------------------------------------
                   SYSTEM NOTICE ("Alice added Bob")
                ------------------------------------------ */

                if (chat.type === "SYSTEM") {
                  return (
                    <motion.div
                      key={chat.messageId}
                      id={`message-${chat.messageId}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="my-3 flex flex-col items-center gap-1"
                    >
                      {datePart && (
                        <Text
                          size="1"
                          color="gray"
                          className="text-[11px] opacity-70"
                        >
                          {datePart}
                        </Text>
                      )}

                      <Text
                        size="1"
                        className="
                          max-w-[85%]
                          rounded-full
                          bg-[var(--gray-a3)]
                          px-3
                          py-1
                          text-center
                          text-[var(--gray-a11)]
                        "
                      >
                        {chat.message}
                        <span className="ml-1.5 text-[10px] opacity-60">
                          {timePart}
                        </span>
                      </Text>
                    </motion.div>
                  );
                }

                /* ------------------------------------------
                   GROUP: show who sent it (first message
                   of each run from the same person)
                ------------------------------------------ */

                const previousChat =
                  index > 0
                    ? chats[index - 1]
                    : null;

                const showSenderName =
                  isGroup &&
                  !isMine &&
                  (!previousChat ||
                    previousChat.type ===
                      "SYSTEM" ||
                    previousChat.senderId !==
                      chat.senderId);

                const senderMember =
                  membersById.get(
                    Number(chat.senderId),
                  );

                const isDeleted =
                  Boolean(chat.isDeleted);

                const reactionGroups =
                  groupReactions(
                    chat.reactions,
                    Number(senderId),
                  );

                const actionsOpen =
                  activeMessageId ===
                    chat.messageId ||
                  reactionPickerFor ===
                    chat.messageId;

                const isHighlighted =
                  highlightedMessageId ===
                  chat.messageId;

                return (
                  <motion.div
                    key={
                      chat.messageId ||
                      `${chat.conversationId}-${index}`
                    }
                    id={`message-${chat.messageId}`}
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
                            group
                            relative
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
                          {/* ACTION BAR */}

                          {!isDeleted && (
                            <div
                              id={`message-actions-${chat.messageId}`}
                              className={`
                                absolute
                                top-full
                                mt-0.5
                                z-20
                                flex
                                items-center
                                gap-0.5
                                rounded-full
                                border
                                border-[var(--gray-a4)]
                                bg-[var(--color-panel-solid)]
                                px-1
                                py-0.5
                                shadow-md
                                transition-opacity
                                duration-150
                                ${
                                  isMine
                                    ? "right-2"
                                    : "left-2"
                                }
                                ${
                                  actionsOpen
                                    ? "opacity-100"
                                    : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                                }
                              `}
                            >
                              <MessageActionButton
                                label="React"
                                onClick={() =>
                                  setReactionPickerFor(
                                    (current) =>
                                      current ===
                                      chat.messageId
                                        ? null
                                        : chat.messageId,
                                  )
                                }
                              >
                                <SmilePlus className="h-3.5 w-3.5" />
                              </MessageActionButton>

                              <MessageActionButton
                                label="Reply"
                                onClick={() =>
                                  startReply(
                                    chat,
                                  )
                                }
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </MessageActionButton>

                              {isMine && (
                                <>
                                  <MessageActionButton
                                    label="Edit"
                                    onClick={() =>
                                      startEdit(
                                        chat,
                                      )
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </MessageActionButton>

                                  <MessageActionButton
                                    label="Unsend"
                                    danger
                                    onClick={() => {
                                      setActiveMessageId(
                                        null,
                                      );

                                      setPendingDelete(
                                        chat,
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </MessageActionButton>
                                </>
                              )}
                            </div>
                          )}

                          {/* QUICK REACTION PICKER */}

                          <AnimatePresence>
                            {reactionPickerFor ===
                              chat.messageId && (
                              <motion.div
                                id={`reaction-picker-${chat.messageId}`}
                                initial={{
                                  opacity: 0,
                                  y: -6,
                                  scale: 0.9,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.9,
                                }}
                                transition={{
                                  duration: 0.12,
                                }}
                                className={`
                                  absolute
                                  top-full
                                  mt-8
                                  z-30
                                  flex
                                  gap-1
                                  rounded-full
                                  border
                                  border-[var(--gray-a4)]
                                  bg-[var(--color-panel-solid)]
                                  px-2
                                  py-1
                                  shadow-lg
                                  ${
                                    isMine
                                      ? "right-0"
                                      : "left-0"
                                  }
                                `}
                              >
                                {QUICK_REACTIONS.map(
                                  (emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      aria-label={`React ${emoji}`}
                                      onClick={(
                                        event,
                                      ) => {
                                        event.stopPropagation();

                                        toggleReaction(
                                          chat.messageId,
                                          emoji,
                                        );
                                      }}
                                      className="
                                        cursor-pointer
                                        text-lg
                                        leading-none
                                        transition-transform
                                        hover:scale-125
                                      "
                                    >
                                      {emoji}
                                    </button>
                                  ),
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* SENDER NAME (groups) */}

                          {showSenderName && (
                            senderMember ? (
                              <Link
                                href={`/${encodeURIComponent(
                                  senderMember.publicId,
                                )}`}
                                className="mb-0.5 px-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                              >
                                {senderMember.fullName}
                              </Link>
                            ) : (
                              <Text
                                size="1"
                                color="gray"
                                className="mb-0.5 px-1"
                              >
                                Former member
                              </Text>
                            )
                          )}

                          {/* MESSAGE */}

                          <div
                            onClick={() =>
                              setActiveMessageId(
                                (current) =>
                                  current ===
                                  chat.messageId
                                    ? null
                                    : chat.messageId,
                              )
                            }
                            onDoubleClick={() => {
                              if (!isDeleted) {
                                toggleReaction(
                                  chat.messageId,
                                  "❤️",
                                );
                              }
                            }}
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
                              duration-300
                              ${
                                isHighlighted
                                  ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--color-background)]"
                                  : ""
                              }
                              ${
                                isDeleted
                                  ? `
                                    border
                                    border-dashed
                                    border-[var(--gray-a6)]
                                    bg-transparent
                                    text-[var(--gray-a10)]
                                    shadow-none
                                  `
                                  : isMine
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
                            {/* REPLY QUOTE */}

                            {chat.replyTo &&
                              !isDeleted && (
                                <button
                                  type="button"
                                  onClick={(
                                    event,
                                  ) => {
                                    event.stopPropagation();

                                    if (
                                      chat.replyTo
                                    ) {
                                      jumpToMessage(
                                        chat.replyTo
                                          .messageId,
                                      );
                                    }
                                  }}
                                  className={`
                                    mb-1.5
                                    block
                                    w-full
                                    cursor-pointer
                                    rounded-lg
                                    border-l-4
                                    px-2
                                    py-1
                                    text-left
                                    text-xs
                                    ${
                                      isMine
                                        ? "border-white/70 bg-white/15 text-white/90"
                                        : "border-sky-500 bg-black/5 dark:bg-white/5"
                                    }
                                  `}
                                >
                                  <span className="block font-semibold">
                                    {getSenderLabel(
                                      chat.replyTo
                                        .senderId,
                                    )}
                                  </span>

                                  <span className="line-clamp-2 opacity-90">
                                    {chat.replyTo
                                      .isDeleted
                                      ? "Message deleted"
                                      : chat.replyTo
                                          .message}
                                  </span>
                                </button>
                              )}

                            {isDeleted ? (
                              <p
                                className="
                                  flex
                                  items-center
                                  gap-1.5
                                  italic
                                "
                              >
                                <Ban className="h-3.5 w-3.5 shrink-0" />

                                {isMine
                                  ? "You unsent a message"
                                  : "This message was deleted"}
                              </p>
                            ) : (
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
                            )}
                          </div>

                          {/* REACTIONS */}

                          {reactionGroups.length >
                            0 && (
                            <div
                              className={`
                                z-10
                                -mt-2
                                flex
                                flex-wrap
                                gap-1
                                ${
                                  isMine
                                    ? "mr-2 justify-end"
                                    : "ml-2"
                                }
                              `}
                            >
                              {reactionGroups.map(
                                (group) => (
                                  <button
                                    key={
                                      group.emoji
                                    }
                                    type="button"
                                    title={
                                      group.mine
                                        ? "Click to remove your reaction"
                                        : "React with this"
                                    }
                                    onClick={() =>
                                      toggleReaction(
                                        chat.messageId,
                                        group.emoji,
                                      )
                                    }
                                    className={`
                                      flex
                                      cursor-pointer
                                      items-center
                                      gap-0.5
                                      rounded-full
                                      border
                                      bg-[var(--color-panel-solid)]
                                      px-1.5
                                      py-0.5
                                      text-xs
                                      shadow-sm
                                      transition-transform
                                      hover:scale-105
                                      ${
                                        group.mine
                                          ? "border-sky-500/70"
                                          : "border-[var(--gray-a4)]"
                                      }
                                    `}
                                  >
                                    <span>
                                      {
                                        group.emoji
                                      }
                                    </span>

                                    {group.count >
                                      1 && (
                                      <span className="text-[var(--gray-a11)]">
                                        {
                                          group.count
                                        }
                                      </span>
                                    )}
                                  </button>
                                ),
                              )}
                            </div>
                          )}

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
                            {isMine &&
                              !isDeleted && (
                                <Tooltip
                                  content={
                                    chat.status ===
                                    "seen"
                                      ? "Seen"
                                      : chat.status ===
                                          "delivered"
                                        ? "Delivered"
                                        : "Sent"
                                  }
                                >
                                  <span className="inline-flex">
                                    <StatusIcon
                                      status={
                                        chat.status
                                      }
                                    />
                                  </span>
                                </Tooltip>
                              )}

                            {chat.editedAt &&
                              !isDeleted && (
                                <Text
                                  size="1"
                                  color="gray"
                                  className="text-[10px] italic"
                                >
                                  edited
                                </Text>
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

        {/* TYPING INDICATOR */}

        <AnimatePresence>
          {partnerTyping && (
            <motion.div
              key="typing-indicator"
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 8,
              }}
              transition={{
                duration: 0.15,
              }}
              className="mb-2 flex justify-start"
            >
              <div
                aria-label={`${
                  selectedUser?.fullName ||
                  "User"
                } is typing`}
                className="
                  flex
                  items-center
                  gap-1
                  rounded-2xl
                  rounded-bl-xs
                  border
                  border-[var(--gray-a3)]
                  bg-slate-200/80
                  px-3.5
                  py-3
                  dark:bg-slate-800/80
                "
              >
                {[0, 150, 300].map(
                  (delay) => (
                    <span
                      key={delay}
                      className="
                        h-1.5
                        w-1.5
                        animate-bounce
                        rounded-full
                        bg-slate-500
                        dark:bg-slate-400
                      "
                      style={{
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ),
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* SCROLL TO LATEST */}

      <AnimatePresence>
        {showScrollDown && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
            }}
            className="
              pointer-events-none
              absolute
              bottom-4
              right-4
              z-20
            "
          >
            <IconButton
              type="button"
              size="2"
              radius="full"
              variant="solid"
              color="gray"
              aria-label="Scroll to latest message"
              onClick={scrollToBottom}
              className="pointer-events-auto cursor-pointer shadow-lg"
            >
              <ArrowDown className="h-4 w-4" />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
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
        {selfDeactivated ||
        (!isGroup && conversationUser?.isDeactivated) ? (
          <Flex
            align="center"
            justify="center"
            className="rounded bg-[var(--gray-a2)] px-3 py-3"
          >
            <Text size="2" color="gray">
              {selfDeactivated
                ? "Your profile is deactivated. Activate it to send messages."
                : `${conversationUser?.fullName ?? "This person"}'s account is deactivated.`}
            </Text>
          </Flex>
        ) : isBlocked ? (
          <Flex
            align="center"
            justify="center"
            gap="3"
            wrap="wrap"
            className="rounded bg-[var(--gray-a2)] px-3 py-3"
          >
            <ShieldBan className="h-4 w-4 text-[var(--gray-10)]" />

            <Text size="2" color="gray">
              {blockStatus.blockedByMe
                ? `You blocked ${selectedUser?.fullName ?? "this person"}.`
                : "You can't reply to this conversation."}
            </Text>

            {blockStatus.blockedByMe && (
              <Button
                size="1"
                variant="soft"
                onClick={() => void toggleBlock()}
                loading={chatActionBusy}
              >
                Unblock
              </Button>
            )}
          </Flex>
        ) : !canSendMessages ? (
          <Flex
            align="center"
            justify="center"
            className="rounded bg-[var(--gray-a2)] px-3 py-3"
          >
            <Text size="2" color="gray">
              Only admins can send messages in this group.
            </Text>
          </Flex>
        ) : (
        <>
        {(replyingTo ||
          editingMessage) && (
          <Flex
            align="center"
            gap="2"
            className="
              mb-2
              rounded
              border-l-4
              border-sky-500
              bg-[var(--gray-a2)]
              px-3
              py-1.5
            "
          >
            {editingMessage ? (
              <Pencil className="h-4 w-4 shrink-0 text-sky-500" />
            ) : (
              <Reply className="h-4 w-4 shrink-0 text-sky-500" />
            )}

            <Box className="min-w-0 flex-1">
              <Text
                size="1"
                weight="bold"
                className="block text-sky-600 dark:text-sky-400"
              >
                {editingMessage
                  ? "Editing message"
                  : `Replying to ${getSenderLabel(
                      replyingTo
                        ? replyingTo.senderId
                        : 0,
                    )}`}
              </Text>

              <Text
                size="1"
                color="gray"
                className="block truncate"
              >
                {(editingMessage ??
                  replyingTo)?.message ||
                  "Message deleted"}
              </Text>
            </Box>

            <IconButton
              type="button"
              size="1"
              variant="ghost"
              color="gray"
              aria-label="Cancel"
              onClick={cancelComposerMode}
              className="shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </Flex>
        )}

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
          {/* Textarea */}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              setMessage(
                event.target.value,
              );

              handleUserTyping(
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
            onBlur={stopTyping}
            placeholder={
              editingMessage
                ? "Edit your message..."
                : "Write a message..."
            }
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
            {editingMessage ? (
              <Check
                className="
                  h-4
                  w-4
                "
              />
            ) : (
              <Send
                className="
                  h-4
                  w-4
                "
              />
            )}
          </IconButton>
        </Flex>
        </>
        )}
      </Box>

      {confirmDialog}

      {/* ====================================================
          DELETE CHAT (for me)
      ==================================================== */}

      <AlertDialog.Root
        open={confirmDeleteChat}
        onOpenChange={setConfirmDeleteChat}
      >
        <AlertDialog.Content maxWidth="420px">
          <AlertDialog.Title>
            Delete this chat?
          </AlertDialog.Title>

          <AlertDialog.Description size="2">
            The chat is removed from your list and its
            history is cleared for you only.{" "}
            {isGroup
              ? "You stay in the group, and new messages will appear again."
              : "The other person keeps their copy. New messages start a fresh chat."}
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>

            <Button
              color="red"
              onClick={() => void deleteChat()}
              loading={chatActionBusy}
            >
              Delete chat
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* ====================================================
          UNSEND CONFIRMATION
      ==================================================== */}

      <AlertDialog.Root
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>
            Unsend message?
          </AlertDialog.Title>

          <AlertDialog.Description size="2">
            This removes the message for
            everyone in the conversation.
            This can&apos;t be undone.
          </AlertDialog.Description>

          <Flex
            gap="3"
            mt="4"
            justify="end"
          >
            <AlertDialog.Cancel>
              <Button
                variant="soft"
                color="gray"
              >
                Cancel
              </Button>
            </AlertDialog.Cancel>

            <AlertDialog.Action>
              <Button
                color="red"
                onClick={confirmDelete}
              >
                Unsend
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  );
};

export default React.memo(
  Middlebar,
);