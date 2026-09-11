"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";

import { io, Socket } from "socket.io-client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  ScrollArea,
  Text,
  TextField,
} from "@radix-ui/themes";

import {
  Loader2,
  MessageCircle,
  Plus,
  Search,
  UserCheck,
} from "lucide-react";

import ProfileDialog from "../myProfile/profile";

import API_ENDPOINTS, {
  ConversationResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  SearchUserByPublicIdRequest,
  SearchUserByPublicIdResponse,
} from "@/app/routes/api";

/* ============================================================
   TYPES
============================================================ */

export interface ConversationUser {
  userId: number;

  fullName?: string;

  email?: string;

  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;

  bio?: string | null;
}

interface ChatSidebarProps {
  senderId: number;

  onSelect: (
    conversationId: number,
    selectedUser: ConversationUser | null,
  ) => void;
}

interface ChatConversation {
  conversationId: number;

  userId: number;

  fullName?: string;

  email?: string;

  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;

  bio?: string | null;

  lastMessage?: string | null;

  lastMessageAt?: string | null;

  lastMessageSenderId?: number;

  unreadCount: number;
}

interface ChatUser {
  userId: number;

  fullName?: string;

  email?: string;

  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;

  bio?: string | null;
}

interface ConversationUpdatedEvent {
  conversationId: number;

  userId: number;

  fullName?: string;

  email?: string;

  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;

  bio?: string | null;

  lastMessage?: string | null;

  lastMessageAt?: string | Date | null;

  lastMessageSenderId?: number;

  unreadCount?: number;
}

interface ConversationReadEvent {
  conversationId: number;

  unreadCount?: number;
}

/* ============================================================
   SOCKET URL
============================================================ */

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333";

/* ============================================================
   COMPONENT
============================================================ */

const ChatSidebar: React.FC<
  ChatSidebarProps
> = ({
  senderId,
  onSelect,
}) => {
  /* ==========================================================
     STATE
  ========================================================== */

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<number | null>(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    conversations,
    setConversations,
  ] = useState<ChatConversation[]>(
    [],
  );

  const [
    searchedUsers,
    setSearchedUsers,
  ] = useState<ChatUser[]>([]);

  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);

  const [
    conversationsLoading,
    setConversationsLoading,
  ] = useState(false);

  /* ==========================================================
     REFS
  ========================================================== */

  const searchRequestIdRef =
    useRef(0);

  const conversationsRequestIdRef =
    useRef(0);

  const socketRef =
    useRef<Socket | null>(null);

  /*
   * Search input ref.
   *
   * Used by the + button to focus
   * the search field.
   */
  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  /* ==========================================================
     SEARCH STATE
  ========================================================== */

  const trimmedSearchQuery =
    useMemo(
      () =>
        searchQuery.trim(),
      [searchQuery],
    );

  const isPublicIdSearch =
    useMemo(
      () =>
        trimmedSearchQuery.startsWith(
          "@",
        ),
      [trimmedSearchQuery],
    );

  const publicIdSearch =
    useMemo(() => {
      if (!isPublicIdSearch) {
        return "";
      }

      return trimmedSearchQuery
        .slice(1)
        .trim();
    }, [
      isPublicIdSearch,
      trimmedSearchQuery,
    ]);

  /* ==========================================================
     FOCUS SEARCH
  ========================================================== */

  const handleFocusSearch =
    useCallback(() => {
      /*
       * Focus immediately.
       */
      searchInputRef.current?.focus();

      /*
       * Also select existing text
       * so typing replaces it naturally.
       */
      searchInputRef.current?.select();
    }, []);

  /* ==========================================================
     LOAD CONVERSATIONS
  ========================================================== */

  const loadConversations =
    useCallback(
      async (): Promise<void> => {
        const requestId =
          ++conversationsRequestIdRef.current;

        try {
          setConversationsLoading(
            true,
          );

          const response =
            await axios.get<
              ConversationResponse[]
            >(
              API_ENDPOINTS.GetConversations,
              {
                withCredentials: true,
              },
            );

          if (
            requestId !==
            conversationsRequestIdRef.current
          ) {
            return;
          }

          const data = Array.isArray(
            response.data,
          )
            ? response.data
            : [];

          const normalized: ChatConversation[] =
            data
              .map(
                (
                  conversation,
                ) => ({
                  conversationId:
                    Number(
                      conversation.conversationId,
                    ),

                  userId:
                    Number(
                      conversation.userId,
                    ),

                  fullName:
                    conversation.fullName,

                  email:
                    conversation.email,

                  publicId:
                    conversation.publicId,

                  isEmailVerified:
                    conversation.isEmailVerified,

                  profilePicture:
                    conversation.profilePicture ??
                    null,

                  bio:
                    conversation.bio ??
                    null,

                  lastMessage:
                    conversation.lastMessage ??
                    null,

                  lastMessageAt:
                    conversation.lastMessageAt ??
                    null,

                  lastMessageSenderId:
                    Number.isFinite(
                      Number(
                        (
                          conversation as ConversationResponse & {
                            lastMessageSenderId?: number;
                          }
                        )
                          .lastMessageSenderId,
                      ),
                    )
                      ? Number(
                          (
                            conversation as ConversationResponse & {
                              lastMessageSenderId?: number;
                            }
                          )
                            .lastMessageSenderId,
                        )
                      : undefined,

                  unreadCount:
                    Number(
                      (
                        conversation as ConversationResponse & {
                          unreadCount?: number;
                        }
                      ).unreadCount ??
                        0,
                    ) || 0,
                }),
              )
              .filter(
                (
                  conversation,
                ) =>
                  Number.isFinite(
                    conversation.conversationId,
                  ) &&
                  Number.isFinite(
                    conversation.userId,
                  ),
              );

          setConversations(
            normalized,
          );
        } catch (error) {
          if (
            requestId !==
            conversationsRequestIdRef.current
          ) {
            return;
          }

          console.log(
            "Failed to load conversations:",
            error,
          );

          setConversations([]);
        } finally {
          if (
            requestId ===
            conversationsRequestIdRef.current
          ) {
            setConversationsLoading(
              false,
            );
          }
        }
      },
      [],
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    const numericSenderId =
      Number(senderId);

    if (
      !Number.isFinite(
        numericSenderId,
      ) ||
      numericSenderId <= 0
    ) {
      setConversations([]);

      return;
    }

    void loadConversations();
  }, [
    senderId,
    loadConversations,
  ]);

  /* ==========================================================
     MARK CONVERSATION AS READ
  ========================================================== */

  const markConversationAsRead =
    useCallback(
      (
        conversationId: number,
      ) => {
        const socket =
          socketRef.current;

        if (!socket) {
          return;
        }

        if (
          !socket.connected
        ) {
          return;
        }

        if (
          !Number.isFinite(
            conversationId,
          ) ||
          conversationId <= 0
        ) {
          return;
        }

        /*
         * Immediately remove unread
         * indicator from the UI.
         */
        setConversations(
          (previous) =>
            previous.map(
              (
                conversation,
              ) =>
                Number(
                  conversation.conversationId,
                ) ===
                conversationId
                  ? {
                      ...conversation,
                      unreadCount: 0,
                    }
                  : conversation,
            ),
        );

        /*
         * Persist read state.
         */
        socket.emit(
          "mark_conversation_read",
          {
            conversationId,
          },
        );
      },
      [],
    );

  /* ==========================================================
     SOCKET.IO
  ========================================================== */

  useEffect(() => {
    const numericSenderId =
      Number(senderId);

    if (
      !Number.isFinite(
        numericSenderId,
      ) ||
      numericSenderId <= 0
    ) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();

      socketRef.current = null;
    }

    const socket = io(
      SOCKET_URL,
      {
        withCredentials: true,

        transports: [
          "websocket",
          "polling",
        ],
      },
    );

    socketRef.current = socket;

    socket.on(
      "connect",
      () => {
        console.log(
          "Sidebar socket connected:",
          socket.id,
        );

        const currentConversationId =
          selectedConversationId;

        if (
          currentConversationId !==
            null &&
          Number.isFinite(
            currentConversationId,
          )
        ) {
          socket.emit(
            "mark_conversation_read",
            {
              conversationId:
                currentConversationId,
            },
          );
        }
      },
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Sidebar socket disconnected:",
          reason,
        );
      },
    );

    socket.on(
      "connect_error",
      (error) => {
        console.log(
          "Sidebar socket connection error:",
          error,
        );
      },
    );

    /* ========================================================
       LIVE CONVERSATION UPDATE
    ======================================================== */

    const handleConversationUpdated = (
      data: ConversationUpdatedEvent,
    ) => {
      const conversationId =
        Number(
          data?.conversationId,
        );

      const userId =
        Number(data?.userId);

      if (
        !Number.isFinite(
          conversationId,
        ) ||
        conversationId <= 0
      ) {
        return;
      }

      if (
        !Number.isFinite(userId) ||
        userId <= 0
      ) {
        return;
      }

      /*
       * Ignore events belonging
       * to the current authenticated user.
       */
      if (
        userId ===
        numericSenderId
      ) {
        return;
      }

      const unreadCount =
        Math.max(
          0,
          Number(
            data.unreadCount ??
              0,
          ) || 0,
        );

      setConversations(
        (previous) => {
          const existingIndex =
            previous.findIndex(
              (
                conversation,
              ) =>
                Number(
                  conversation.conversationId,
                ) ===
                conversationId,
            );

          const existingConversation =
            existingIndex >= 0
              ? previous[
                  existingIndex
                ]
              : undefined;

          const updatedConversation: ChatConversation =
            {
              conversationId,

              userId,

              fullName:
                data.fullName ??
                existingConversation?.fullName ??
                "",

              email:
                data.email ??
                existingConversation?.email ??
                "",

              publicId:
                data.publicId ??
                existingConversation?.publicId ??
                "",

              isEmailVerified:
                data.isEmailVerified ??
                existingConversation?.isEmailVerified ??
                false,

              profilePicture:
                data.profilePicture ??
                existingConversation?.profilePicture ??
                null,

              bio:
                data.bio ??
                existingConversation?.bio ??
                null,

              lastMessage:
                data.lastMessage ??
                existingConversation?.lastMessage ??
                null,

              lastMessageAt:
                data.lastMessageAt
                  ? new Date(
                      data.lastMessageAt,
                    ).toISOString()
                  : existingConversation?.lastMessageAt ??
                    null,

              lastMessageSenderId:
                data.lastMessageSenderId ??
                existingConversation?.lastMessageSenderId,

              unreadCount,
            };

          const withoutOldConversation =
            previous.filter(
              (
                conversation,
              ) =>
                Number(
                  conversation.conversationId,
                ) !==
                conversationId,
            );

          return [
            updatedConversation,
            ...withoutOldConversation,
          ];
        },
      );
    };

    socket.on(
      "conversation_updated",
      handleConversationUpdated,
    );

    /* ========================================================
       CONVERSATION READ
    ======================================================== */

    const handleConversationRead = (
      data: ConversationReadEvent,
    ) => {
      const conversationId =
        Number(
          data?.conversationId,
        );

      if (
        !Number.isFinite(
          conversationId,
        ) ||
        conversationId <= 0
      ) {
        return;
      }

      const unreadCount =
        Math.max(
          0,
          Number(
            data?.unreadCount ??
              0,
          ) || 0,
        );

      setConversations(
        (previous) =>
          previous.map(
            (
              conversation,
            ) =>
              Number(
                conversation.conversationId,
              ) ===
              conversationId
                ? {
                    ...conversation,
                    unreadCount,
                  }
                : conversation,
          ),
      );
    };

    socket.on(
      "conversation_read",
      handleConversationRead,
    );

    return () => {
      socket.off(
        "conversation_updated",
        handleConversationUpdated,
      );

      socket.off(
        "conversation_read",
        handleConversationRead,
      );

      socket.off("connect");

      socket.off("disconnect");

      socket.off(
        "connect_error",
      );

      socket.disconnect();

      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;
      }
    };
  }, [
    senderId,
    selectedConversationId,
  ]);

  /* ==========================================================
     PUBLIC ID SEARCH
  ========================================================== */

  useEffect(() => {
    const requestId =
      ++searchRequestIdRef.current;

    if (!isPublicIdSearch) {
      setSearchedUsers([]);

      setSearchLoading(false);

      return;
    }

    if (
      publicIdSearch.length < 2
    ) {
      setSearchedUsers([]);

      setSearchLoading(false);

      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSearchLoading(true);

            const requestBody: SearchUserByPublicIdRequest =
              {
                publicId:
                  publicIdSearch,
              };

            const response =
              await axios.post<
                SearchUserByPublicIdResponse
              >(
                API_ENDPOINTS.SearchUserByPublicId,
                requestBody,
                {
                  withCredentials: true,
                },
              );

            if (
              requestId !==
              searchRequestIdRef.current
            ) {
              return;
            }

            const responseData =
              response.data as unknown;

            let users: ChatUser[] =
              [];

            if (
              Array.isArray(
                responseData,
              )
            ) {
              users =
                responseData as ChatUser[];
            } else if (
              responseData &&
              typeof responseData ===
                "object" &&
              "users" in
                responseData
            ) {
              const dataWithUsers =
                responseData as {
                  users?: ChatUser[];
                };

              users =
                Array.isArray(
                  dataWithUsers.users,
                )
                  ? dataWithUsers.users
                  : [];
            } else if (
              responseData &&
              typeof responseData ===
                "object"
            ) {
              users = [
                responseData as ChatUser,
              ];
            }

            const filteredUsers =
              users.filter(
                (user) =>
                  Number(
                    user.userId,
                  ) !==
                  Number(senderId),
              );

            setSearchedUsers(
              filteredUsers,
            );
          } catch (error) {
            if (
              requestId !==
              searchRequestIdRef.current
            ) {
              return;
            }

            console.log(
              "Public ID search failed:",
              error,
            );

            setSearchedUsers([]);
          } finally {
            if (
              requestId ===
              searchRequestIdRef.current
            ) {
              setSearchLoading(false);
            }
          }
        },
        300,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isPublicIdSearch,
    publicIdSearch,
    senderId,
  ]);

  /* ==========================================================
     SORT CONVERSATIONS
  ========================================================== */

  const sortByRecentMessage =
    useCallback(
      (
        chats: ChatConversation[],
      ): ChatConversation[] => {
        return [...chats].sort(
          (a, b) => {
            const aTime =
              a.lastMessageAt
                ? new Date(
                    a.lastMessageAt,
                  ).getTime()
                : 0;

            const bTime =
              b.lastMessageAt
                ? new Date(
                    b.lastMessageAt,
                  ).getTime()
                : 0;

            return bTime - aTime;
          },
        );
      },
      [],
    );

  /* ==========================================================
     FILTER EXISTING CONVERSATIONS
  ========================================================== */

  const filteredConversations =
    useMemo(() => {
      if (isPublicIdSearch) {
        return [];
      }

      const query =
        trimmedSearchQuery.toLowerCase();

      if (!query) {
        return sortByRecentMessage(
          conversations,
        );
      }

      const filtered =
        conversations.filter(
          (
            conversation,
          ) => {
            const fullName =
              conversation.fullName
                ?.toLowerCase() ??
              "";

            const email =
              conversation.email
                ?.toLowerCase() ??
              "";

            const publicId =
              conversation.publicId
                ?.toLowerCase() ??
              "";

            const lastMessage =
              conversation.lastMessage
                ?.toLowerCase() ??
              "";

            return (
              fullName.includes(
                query,
              ) ||
              email.includes(
                query,
              ) ||
              publicId.includes(
                query,
              ) ||
              lastMessage.includes(
                query,
              )
            );
          },
        );

      return sortByRecentMessage(
        filtered,
      );
    }, [
      conversations,
      isPublicIdSearch,
      trimmedSearchQuery,
      sortByRecentMessage,
    ]);

  /* ==========================================================
     SELECT EXISTING CONVERSATION
  ========================================================== */

  const handleSelectConversation =
    useCallback(
      (
        conversation: ChatConversation,
      ) => {
        const conversationId =
          Number(
            conversation.conversationId,
          );

        if (
          !Number.isFinite(
            conversationId,
          ) ||
          conversationId <= 0
        ) {
          return;
        }

        const userId =
          Number(
            conversation.userId,
          );

        if (
          !Number.isFinite(
            userId,
          ) ||
          userId <= 0
        ) {
          return;
        }

        const selectedUser: ConversationUser =
          {
            userId,

            fullName:
              conversation.fullName,

            email:
              conversation.email,

            publicId:
              conversation.publicId,

            isEmailVerified:
              conversation.isEmailVerified,

            profilePicture:
              conversation.profilePicture,

            bio:
              conversation.bio,
          };

        setSelectedConversationId(
          conversationId,
        );

        /*
         * Immediately remove unread
         * indicator.
         */
        setConversations(
          (previous) =>
            previous.map(
              (
                item,
              ) =>
                Number(
                  item.conversationId,
                ) ===
                conversationId
                  ? {
                      ...item,
                      unreadCount: 0,
                    }
                  : item,
            ),
        );

        markConversationAsRead(
          conversationId,
        );

        onSelect(
          conversationId,
          selectedUser,
        );
      },
      [
        onSelect,
        markConversationAsRead,
      ],
    );

  /* ==========================================================
     SELECT SEARCH RESULT
  ========================================================== */

  const handleSelectSearchUser =
    useCallback(
      async (
        user: ChatUser,
      ): Promise<void> => {
        const targetUserId =
          Number(user.userId);

        if (
          !Number.isFinite(
            targetUserId,
          ) ||
          targetUserId <= 0
        ) {
          return;
        }

        if (
          targetUserId ===
          Number(senderId)
        ) {
          return;
        }

        try {
          setSearchLoading(true);

          const requestBody: CreateConversationRequest =
            {
              userId:
                targetUserId,
            };

          const response =
            await axios.post<
              CreateConversationResponse
            >(
              API_ENDPOINTS.CreateConversation,
              requestBody,
              {
                withCredentials: true,
              },
            );

          const conversationId =
            Number(
              response.data
                ?.conversationId,
            );

          if (
            !Number.isFinite(
              conversationId,
            ) ||
            conversationId <= 0
          ) {
            return;
          }

          const selectedUser: ConversationUser =
            {
              userId:
                targetUserId,

              fullName:
                user.fullName,

              email:
                user.email,

              publicId:
                user.publicId,

              isEmailVerified:
                user.isEmailVerified,

              profilePicture:
                user.profilePicture,

              bio:
                user.bio,
            };

          setSelectedConversationId(
            conversationId,
          );

          setSearchQuery("");

          setSearchedUsers([]);

          searchRequestIdRef.current++;

          onSelect(
            conversationId,
            selectedUser,
          );
        } catch (error) {
          console.log(
            "Failed to create/get conversation:",
            error,
          );
        } finally {
          setSearchLoading(false);
        }
      },
      [
        senderId,
        onSelect,
      ],
    );

  /* ==========================================================
     CLEAR SEARCH
  ========================================================== */

  const handleClearSearch =
    useCallback(() => {
      setSearchQuery("");

      setSearchedUsers([]);

      setSearchLoading(false);

      searchRequestIdRef.current++;
    }, []);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Flex
      direction="column"
      className="h-full w-full backdrop-blur-xl"
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <Box className="border-b border-gray-200 p-3 dark:border-white/10">
        <Flex
          align="center"
          justify="between"
        >
          <Flex
            align="center"
            gap="3"
          >
            <Box className="relative">
              <Avatar
                size="3"
                radius="full"
                fallback="C"
              />

              <Box className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
            </Box>

            <Box>
              <Text
                size="3"
                weight="bold"
                className="text-gray-900 dark:text-white"
              >
                Chats
              </Text>

              <Text
                size="1"
                className="block text-gray-500 dark:text-gray-400"
              >
                Messages
              </Text>
            </Box>
          </Flex>

          <Flex gap="2">
            {/* ==================================================
                PLUS BUTTON
            ================================================== */}

            <Button
              variant="soft"
              size="2"
              onClick={
                handleFocusSearch
              }
              className="cursor-pointer"
              aria-label="Search people"
            >
              <Plus size={17} />
            </Button>

            <ProfileDialog />
          </Flex>
        </Flex>
      </Box>

      {/* ====================================================
          SEARCH
      ==================================================== */}

      <Box className="px-4 py-3">
        <TextField.Root
          ref={searchInputRef}
          placeholder="Search people..."
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(
              event.target.value,
            )
          }
          size="2"
        >
          <TextField.Slot>
            {searchLoading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Search size={16} />
            )}
          </TextField.Slot>

          {searchQuery && (
            <TextField.Slot side="right">
              <button
                type="button"
                onClick={
                  handleClearSearch
                }
                aria-label="Clear search"
                className="cursor-pointer text-xs text-gray-400 transition hover:text-gray-700 dark:hover:text-white"
              >
                ✕
              </button>
            </TextField.Slot>
          )}
        </TextField.Root>

        {isPublicIdSearch && (
          <Text
            size="1"
            className="mt-1 block px-1 text-gray-400"
          >
            Search by public ID
          </Text>
        )}
      </Box>

      {/* ====================================================
          CONVERSATION LIST
      ==================================================== */}

      <ScrollArea className="min-h-0 flex-1">
        <Box className="px-2 pb-4">
          <AnimatePresence mode="popLayout">
            {/* =================================================
                PUBLIC ID SEARCH
            ================================================= */}

            {isPublicIdSearch ? (
              searchedUsers.length >
              0 ? (
                searchedUsers.map(
                  (user) => (
                    <motion.div
                      key={
                        user.userId
                      }
                      layout
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -10,
                      }}
                      transition={{
                        duration: 0.2,
                      }}
                      onClick={() =>
                        void handleSelectSearchUser(
                          user,
                        )
                      }
                      className="m-2 mb-1 cursor-pointer rounded p-3 transition hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Flex
                        align="center"
                        justify="between"
                        gap="3"
                      >
                        <Flex
                          align="center"
                          gap="3"
                          className="min-w-0 flex-1"
                        >
                          <Avatar
                            size="3"
                            radius="full"
                            fallback={
                              user.fullName
                                ?.charAt(
                                  0,
                                )
                                ?.toUpperCase() ||
                              "U"
                            }
                            src={
                              user.profilePicture ??
                              undefined
                            }
                          />

                          <Box className="min-w-0 flex-1">
                            <Text
                              size="2"
                              weight="medium"
                              className="block truncate text-gray-900 dark:text-white"
                            >
                              {user.fullName ||
                                "Unknown User"}
                            </Text>

                            <Text
                              size="1"
                              className="block truncate text-gray-500 dark:text-gray-400"
                            >
                              @
                              {
                                user.publicId
                              }
                            </Text>
                          </Box>
                        </Flex>

                        {user.isEmailVerified && (
                          <Badge
                            size="1"
                            color="green"
                            variant="soft"
                          >
                            Verified
                          </Badge>
                        )}
                      </Flex>
                    </motion.div>
                  ),
                )
              ) : (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  gap="2"
                  className="py-12 text-center"
                >
                  <Box className="rounded-full bg-gray-100 p-4 dark:bg-white/5">
                    {searchLoading ? (
                      <Loader2
                        size={22}
                        className="animate-spin text-gray-400"
                      />
                    ) : (
                      <Search
                        size={22}
                        className="text-gray-400"
                      />
                    )}
                  </Box>

                  <Text
                    size="2"
                    weight="medium"
                    className="text-gray-900 dark:text-white"
                  >
                    {publicIdSearch.length <
                    2
                      ? "Enter a public ID"
                      : "No users found"}
                  </Text>

                  <Text
                    size="1"
                    className="text-gray-500 dark:text-gray-400"
                  >
                    {publicIdSearch.length <
                    2
                      ? "Try @publicId"
                      : "Try a different public ID"}
                  </Text>
                </Flex>
              )
            ) : filteredConversations.length >
              0 ? (
              filteredConversations.map(
                (
                  conversation,
                ) => {
                  const conversationId =
                    Number(
                      conversation.conversationId,
                    );

                  const isSelected =
                    selectedConversationId ===
                    conversationId;

                  const isUnread =
                    conversation.unreadCount >
                    0;

                  return (
                    <motion.div
                      key={
                        conversationId
                      }
                      layout
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: -10,
                      }}
                      transition={{
                        duration: 0.2,
                      }}
                      onClick={() =>
                        handleSelectConversation(
                          conversation,
                        )
                      }
                      className={`m-2 mb-1 cursor-pointer rounded p-3 transition ${
                        isSelected
                          ? "bg-blue-500/10 dark:bg-blue-500/20"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Flex
                        align="center"
                        justify="between"
                        gap="3"
                      >
                        {/* ====================================
                            LEFT
                        ==================================== */}

                        <Flex
                          align="center"
                          gap="3"
                          className="min-w-0 flex-1"
                        >
                          {/* Avatar */}

                          <Box className="relative shrink-0">
                            <Avatar
                              size="3"
                              radius="full"
                              fallback={
                                conversation.fullName
                                  ?.charAt(
                                    0,
                                  )
                                  ?.toUpperCase() ||
                                "U"
                              }
                              src={
                                conversation.profilePicture ??
                                undefined
                              }
                            />

                            <Box className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
                          </Box>

                          {/* Name + Last Message */}

                          <Box className="min-w-0 flex-1">
                            <Flex
                              align="center"
                              justify="between"
                              gap="2"
                            >
                              <Text
                                size="2"
                                weight={
                                  isUnread
                                    ? "bold"
                                    : "medium"
                                }
                                className={`truncate ${
                                  isUnread
                                    ? "text-gray-950 dark:text-white"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {conversation.fullName ||
                                  "Unknown User"}
                              </Text>

                              {isSelected && (
                                <UserCheck
                                  size={
                                    16
                                  }
                                  className="shrink-0 text-blue-500"
                                />
                              )}
                            </Flex>

                            {conversation.lastMessage ? (
                              <Text
                                size="1"
                                weight={
                                  isUnread
                                    ? "bold"
                                    : "regular"
                                }
                                className={`block truncate ${
                                  isUnread
                                    ? "text-gray-800 dark:text-gray-200"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {
                                  conversation.lastMessage
                                }
                              </Text>
                            ) : (
                              <Text
                                size="1"
                                className="block truncate text-gray-500 dark:text-gray-400"
                              >
                                @
                                {
                                  conversation.publicId
                                }
                              </Text>
                            )}
                          </Box>
                        </Flex>

                        {/* ====================================
                            RIGHT SIDE
                        ==================================== */}

                        <Flex
                          direction="column"
                          align="end"
                          gap="1"
                          className="shrink-0"
                        >
                          {/* ==================================
                              UNREAD COUNT
                          ================================== */}

                          {isUnread && (
                            <Text
                              size="1"
                              weight="bold"
                              className="
                                whitespace-nowrap
                                text-blue-600
                                dark:text-blue-400
                              "
                            >
                              {conversation.unreadCount >
                              99
                                ? "99+ unread"
                                : `${conversation.unreadCount} unread`}
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                    </motion.div>
                  );
                },
              )
            ) : (
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap="2"
                className="py-12 text-center"
              >
                <Box className="rounded-full bg-gray-100 p-4 dark:bg-white/5">
                  {conversationsLoading ? (
                    <Loader2
                      size={22}
                      className="animate-spin text-gray-400"
                    />
                  ) : (
                    <MessageCircle
                      size={22}
                      className="text-gray-400"
                    />
                  )}
                </Box>

                <Text
                  size="2"
                  weight="medium"
                  className="text-gray-900 dark:text-white"
                >
                  {conversationsLoading
                    ? "Loading conversations..."
                    : searchQuery
                      ? "No conversations found"
                      : "No conversations yet"}
                </Text>

                <Text
                  size="1"
                  className="text-gray-500 dark:text-gray-400"
                >
                  {searchQuery
                    ? "Try a different search"
                    : "Search @publicId to start a conversation"}
                </Text>
              </Flex>
            )}
          </AnimatePresence>
        </Box>
      </ScrollArea>
    </Flex>
  );
};

export default ChatSidebar;