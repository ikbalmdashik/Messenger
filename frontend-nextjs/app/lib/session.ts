import axios from "axios";

import API_ENDPOINTS, { LogoutResult } from "@/app/routes/api";
import Routes from "@/app/routes/routes";

const AUTH_CHANNEL = "auth_channel";

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
 * Log out the active account. If another saved
 * account is signed in, the server switches to it
 * and we reload the chat; otherwise go to login.
 */
export const logoutAndRedirect = async () => {
  const response = await axios.post<LogoutResult>(
    API_ENDPOINTS.Logout,
    {},
    { withCredentials: true },
  );

  if (response.data?.switchedTo) {
    broadcastAuth("ACCOUNT_SWITCHED");
    window.location.assign(Routes.Chat);
    return;
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
