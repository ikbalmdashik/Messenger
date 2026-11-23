import axios from "axios";

import API_ENDPOINTS, { LogoutResult } from "@/app/routes/api";
import Routes from "@/app/routes/routes";

export const AUTH_CHANNEL = "auth_channel";

export const broadcastAuth = (type: "LOGOUT" | "ACCOUNT_SWITCHED") => {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type });
    channel.close();
  } catch {
    // Unsupported: other tabs catch up on next load.
  }
};

/**
 * Log out the active account and go to the sign-in
 * page. Other saved accounts stay signed in and are
 * listed there, but none is opened automatically.
 */
let loggingOut = false;

/**
 * This tab started the logout itself, so it goes to
 * the sign-in page and ignores the live "logged out"
 * event for its own session.
 */
export const isLoggingOut = () => loggingOut;

export const logoutAndRedirect = async () => {
  loggingOut = true;

  try {
    await axios.post<LogoutResult>(
      API_ENDPOINTS.Logout,
      {},
      { withCredentials: true },
    );
  } catch (error) {
    loggingOut = false;
    throw error;
  }

  broadcastAuth("LOGOUT");
  window.location.assign(Routes.Login);
};

/**
 * After deactivating/deleting: this browser's
 * session is gone, send everything to login.
 */
export const signedOutRedirect = () => {
  broadcastAuth("LOGOUT");
  window.location.assign(Routes.Login);
};
