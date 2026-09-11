"use client";

import { useCallback, useState } from "react";
import axios from "axios";

import API_ENDPOINTS from "@/app/routes/api";

export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface CreateChatPayload {
  conversationId: number;
  message: string;
  status: string;
}

export default function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a message through the HTTP API.
   */
  const createChat = useCallback(
    async (payload: CreateChatPayload) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post<ChatMessage>(
          API_ENDPOINTS.CreateChat,
          payload,
          {
            withCredentials: true,
          },
        );

        return response.data;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          "Failed to send message.";

        setError(message);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get messages for a conversation.
   */
  const getConversation = useCallback(
    async (conversationId: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post<ChatMessage[]>(
          API_ENDPOINTS.GetConversation,
          {
            conversationId,
          },
          {
            withCredentials: true,
          },
        );

        return response.data;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          "Failed to get conversation.";

        setError(message);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    createChat,
    getConversation,
    loading,
    error,
  };
}