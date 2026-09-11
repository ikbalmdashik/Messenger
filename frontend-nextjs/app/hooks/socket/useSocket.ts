import { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

import API_ENDPOINTS, {
  ChatMessageResponse,
  SendMessageRequest,
} from "@/app/routes/api";

/* ============================================================
   TYPES
============================================================ */

interface UseSocketOptions {
  conversationId: number | null;
}

interface UseSocketReturn {
  messages: ChatMessageResponse[];
  isConnected: boolean;
  sendMessage: (
    message: string,
    status?: string
  ) => boolean;
  clearMessages: () => void;
}


/* ============================================================
   HOOK
============================================================ */

export const useSocket = ({
  conversationId,
}: UseSocketOptions): UseSocketReturn => {

  const socketRef =
    useRef<Socket | null>(null);


  const [messages, setMessages] =
    useState<ChatMessageResponse[]>([]);


  const [isConnected, setIsConnected] =
    useState(false);


  /* ==========================================================
     CONNECT / DISCONNECT
  ========================================================== */

  useEffect(() => {

    /*
     * No conversation selected.
     *
     * We don't need a socket connection yet.
     */
    if (
      conversationId === null ||
      !Number.isFinite(conversationId)
    ) {

      setMessages([]);
      setIsConnected(false);

      return;
    }


    /*
     * Create Socket.IO connection.
     *
     * withCredentials is important because your JWT is stored
     * inside the HTTP-only access_token cookie.
     */
    const socket =
      io(API_ENDPOINTS.DefaultURL, {
        withCredentials: true,
        transports: [
          "websocket",
          "polling",
        ],
      });


    socketRef.current =
      socket;


    /* ========================================================
       CONNECTED
    ======================================================== */

    socket.on(
      "connect",
      () => {

        setIsConnected(true);


        /*
         * Join the selected conversation.
         *
         * IMPORTANT:
         * We only send conversationId.
         *
         * senderId must NEVER come from the frontend.
         * The backend gets the authenticated user from JWT.
         */
        socket.emit(
          "join_room",
          {
            conversationId,
          }
        );

      }
    );


    /* ========================================================
       DISCONNECTED
    ======================================================== */

    socket.on(
      "disconnect",
      () => {

        setIsConnected(false);

      }
    );


    /* ========================================================
       CONNECTION ERROR
    ======================================================== */

    socket.on(
      "connect_error",
      (error) => {

        console.error(
          "Socket connection error:",
          error
        );

        setIsConnected(false);

      }
    );


    /* ========================================================
       RECEIVE MESSAGE
    ======================================================== */

    socket.on(
      "receive_message",
      (
        incomingMessage: ChatMessageResponse
      ) => {

        /*
         * Safety check:
         *
         * Only accept messages belonging to the currently
         * selected conversation.
         */
        if (
          Number(
            incomingMessage.conversationId
          ) !== Number(conversationId)
        ) {
          return;
        }


        setMessages(
          (previousMessages) => {

            /*
             * Prevent duplicate messages.
             */
            const alreadyExists =
              previousMessages.some(
                (message) =>
                  message.messageId ===
                  incomingMessage.messageId
              );


            if (alreadyExists) {
              return previousMessages;
            }


            return [
              ...previousMessages,
              incomingMessage,
            ];

          }
        );

      }
    );


    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {

      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("receive_message");

      socket.disconnect();

      if (
        socketRef.current === socket
      ) {
        socketRef.current = null;
      }

      setIsConnected(false);

    };

  }, [
    conversationId,
  ]);


  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const sendMessage =
    useCallback(
      (
        message: string,
        status: string = "sent"
      ): boolean => {

        const socket =
          socketRef.current;


        /*
         * Socket isn't available.
         */
        if (!socket) {
          return false;
        }


        /*
         * Socket isn't connected.
         */
        if (!socket.connected) {
          return false;
        }


        /*
         * No conversation selected.
         */
        if (
          conversationId === null ||
          !Number.isFinite(conversationId)
        ) {
          return false;
        }


        const trimmedMessage =
          message.trim();


        /*
         * Don't send empty messages.
         */
        if (!trimmedMessage) {
          return false;
        }


        /*
         * IMPORTANT:
         *
         * Do NOT send:
         *
         * senderId
         * receiverId
         *
         * The backend determines senderId from the
         * authenticated HTTP-only JWT cookie.
         */
        const payload: SendMessageRequest = {
          conversationId,
          message: trimmedMessage,
          status,
        };


        socket.emit(
          "send_message",
          payload
        );


        return true;

      },
      [
        conversationId,
      ]
    );


  /* ==========================================================
     CLEAR MESSAGES
  ========================================================== */

  const clearMessages =
    useCallback(
      () => {

        setMessages([]);

      },
      []
    );


  /* ==========================================================
     RETURN
  ========================================================== */

  return {
    messages,
    isConnected,
    sendMessage,
    clearMessages,
  };

};
