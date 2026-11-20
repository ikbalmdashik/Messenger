import axios from "axios";

/**
 * Pull a readable message out of a NestJS error
 * response, falling back to `fallback`.
 */
export const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
};

/**
 * Lets the public profile page ask the chat page
 * to open a conversation once it has loaded.
 */
export const PENDING_CONVERSATION_KEY =
  "messenger:openConversationId";
