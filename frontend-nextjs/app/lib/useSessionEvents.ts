"use client";

import { useEffect, useRef } from "react";

import { io } from "socket.io-client";
import { toast } from "sonner";

import {
  AUTH_CHANNEL,
  broadcastAuth,
  isLoggingOut,
} from "@/app/lib/session";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

interface SessionEventHandlers {
  /**
   * A login or logout happened for the active
   * account (any device). Refresh session lists.
   */
  onSessionsChanged?: () => void;

  /**
   * A saved (non-active) account on this browser was
   * signed out somewhere. Refresh the saved list.
   */
  onSavedSessionRevoked?: () => void;

  /**
   * React when the active session is signed out
   * (another tab or device). Off on the login page,
   * which has no active session to lose.
   */
  trackActiveSession?: boolean;

  /**
   * The active session was signed out: hide account
   * data and show "Authentication required". The
   * page stays put; its Log In button goes to login.
   * Default: reload, so the page re-checks itself.
   */
  onRevoked?: () => void;
}

/**
 * Live login / logout updates over the server's
 * "/sessions" socket namespace. The server reads the
 * session cookies on connect, so no token is sent.
 */
export const useSessionEvents = ({
  onSessionsChanged,
  onSavedSessionRevoked,
  trackActiveSession = true,
  onRevoked,
}: SessionEventHandlers = {}) => {
  // Latest handlers without reconnecting each render.
  const handlersRef = useRef({
    onSessionsChanged,
    onSavedSessionRevoked,
    onRevoked,
  });

  useEffect(() => {
    handlersRef.current = {
      onSessionsChanged,
      onSavedSessionRevoked,
      onRevoked,
    };
  });

  /*
   * Back / Forward can restore this page from the
   * browser's cache, account data and all, without
   * running any code. Reload so the session is
   * checked again.
   */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    const socket = io(`${SOCKET_URL}/sessions`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    let revoked = false;

    const handleRevoked = () => {
      if (revoked || isLoggingOut()) {
        return;
      }

      revoked = true;

      if (handlersRef.current.onRevoked) {
        handlersRef.current.onRevoked();
      } else {
        window.location.reload();
      }
    };

    socket.on(
      "session_revoked",
      (payload: { sessionId: number | null } | undefined) => {
        if (!trackActiveSession || revoked || isLoggingOut()) {
          return;
        }

        // sessionId null: already invalid when this page
        // connected, which the page has shown itself.
        if (payload?.sessionId != null) {
          toast.info("You've been logged out of this account.");

          // Tabs without this socket follow too.
          broadcastAuth("LOGOUT");
        }

        handleRevoked();
      },
    );

    /*
     * Same browser, other tab: logged out or switched
     * account.
     */
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);

      channel.onmessage = (event: MessageEvent) => {
        if (!trackActiveSession) {
          return;
        }

        if (event.data?.type === "LOGOUT") {
          handleRevoked();
        }

        if (event.data?.type === "ACCOUNT_SWITCHED") {
          window.location.reload();
        }
      };
    } catch {
      // Unsupported: the socket still covers it.
    }

    socket.on("saved_session_revoked", () => {
      handlersRef.current.onSavedSessionRevoked?.();
    });

    socket.on("sessions_changed", () => {
      handlersRef.current.onSessionsChanged?.();
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      channel?.close();
    };
  }, [trackActiveSession]);
};

export default useSessionEvents;
