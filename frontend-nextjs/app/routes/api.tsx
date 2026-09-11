const defaultURL =
  process.env.NEXT_PUBLIC_DEFAULT_API_URL;

/**
 * ============================================================
 * COMMON API TYPES
 * ============================================================
 */

export interface ApiResponse {
  success: boolean;
  message?: string;
}

/**
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

export interface IsEmailExistRequest {
  email: string;
}

export interface IsEmailExistResponse
  extends ApiResponse {
  exists?: boolean;
}

export interface ValidateUserRequest {
  email: string;
  otp: string;
  usedFor: string;
}

export interface ValidateUserResponse
  extends ApiResponse {
  token?: string;
}

export interface LoginRequest {
  token: string;
}

export interface LoginResponse
  extends ApiResponse {
  access_token?: string;
}

export type LogoutResponse =
  ApiResponse;

export interface SendEmailVerificationRequest {
  email: string;
  type: string;
}

export type SendEmailVerificationResponse =
  ApiResponse;

export interface SendPasswordResetLinkRequest {
  email: string;
}

export type SendPasswordResetLinkResponse =
  ApiResponse;

export interface SendOtpRequest {
  email?: string;
  phone?: string;
  usedFor: string;
}

export type SendOtpResponse =
  ApiResponse;

export interface UpdatePasswordRequest {
  token: string;
  password: string;
}

export type UpdatePasswordResponse =
  ApiResponse;

export interface ValidateLinkRequest {
  token: string;
}

export interface ValidateLinkResponse
  extends ApiResponse {
  action?: string;
}

/**
 * ============================================================
 * USER TYPES
 * ============================================================
 */

export interface UserResponse {
  userId: number;
  fullName: string;
  email: string;

  phone?: string;
  publicId?: string;
  role?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;
  bio?: string | null;

  onlineStatus?: string;
}

export interface GetUserByTokenResponse
  extends UserResponse {
  success?: boolean;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface CreateUserResponse
  extends ApiResponse {
  userId?: number;
}

export type GetAllUsersResponse =
  UserResponse[];

export type GetUserByIdResponse =
  UserResponse;

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  bio?: string;
  profilePicture?: string | null;
}

export interface UpdateUserResponse
  extends ApiResponse {
  user?: UserResponse;
}

export type DeleteUserResponse =
  ApiResponse;

/**
 * ============================================================
 * USER SEARCH
 * ============================================================
 */

export interface SearchUserByPublicIdRequest {
  publicId: string;
}

export interface SearchUserByPublicIdResponse {
  userId: number;
  fullName: string;
  publicId: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;

  bio?: string | null;
}

/**
 * ============================================================
 * CONVERSATION TYPES
 * ============================================================
 */

export type ConversationType =
  | "DIRECT"
  | "GROUP";

/**
 * Basic user information associated with
 * a conversation.
 */
export interface ConversationUser {
  userId: number;
  fullName: string;

  email?: string;
  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;
  bio?: string | null;
}

/**
 * Conversation returned to the frontend.
 *
 * For DIRECT conversations:
 * - userId represents the other participant.
 * - fullName/email/publicId/etc. represent
 *   the other participant.
 *
 * For GROUP conversations:
 * - name represents the group name.
 */
export interface ConversationResponse {
  conversationId: number;

  type: ConversationType;

  name?: string | null;

  userId?: number | null;

  fullName?: string;
  email?: string;
  publicId?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;
  bio?: string | null;

  lastMessage?: string | null;
  lastMessageAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type GetConversationsResponse =
  ConversationResponse[];

/**
 * Create/get a direct conversation.
 */
export interface CreateConversationRequest {
  userId: number;
}

export interface CreateConversationResponse {
  conversationId: number;

  type: ConversationType;

  /**
   * true  = newly created
   * false = existing conversation returned
   */
  isNew: boolean;
}

/**
 * ============================================================
 * CONVERSATION PARTICIPANTS
 * ============================================================
 */

export interface ConversationParticipantResponse {
  id: number;
  conversationId: number;
  userId: number;
}

export interface ConversationParticipantRequest {
  conversationId: number;
}

/**
 * ============================================================
 * CHAT MESSAGE TYPES
 * ============================================================
 */

export interface ChatMessageResponse {
  messageId: number;

  conversationId: number;

  senderId: number;

  message: string;

  status: string;

  createdAt: string;
}

/**
 * Request for:
 *
 * POST /chat/getConversation
 */
export interface GetConversationRequest {
  conversationId: number;
}

export type GetConversationResponse =
  ChatMessageResponse[];

/**
 * Request for:
 *
 * POST /chat/createChat
 */
export interface SendMessageRequest {
  conversationId: number;

  message: string;

  status: string;
}

export interface SendMessageResponse {
  messageId: number;

  conversationId: number;

  senderId: number;

  message: string;

  status: string;

  createdAt: string;
}

/**
 * ============================================================
 * SOCKET.IO TYPES
 * ============================================================
 */

/**
 * Payload for:
 *
 * socket.emit("join_room", payload)
 */
export interface JoinConversationRoomRequest {
  conversationId: number;
}

/**
 * Payload for:
 *
 * socket.emit("leave_room", payload)
 */
export interface LeaveConversationRoomRequest {
  conversationId: number;
}

/**
 * Payload for:
 *
 * socket.emit("send_message", payload)
 *
 * IMPORTANT:
 * senderId is intentionally NOT included.
 *
 * The backend gets senderId from the authenticated
 * Socket.IO session:
 *
 * client.data.userId
 */
export interface SocketSendMessageRequest {
  conversationId: number;

  message: string;

  status: string;
}

/**
 * Payload received from:
 *
 * socket.on("receive_message", ...)
 */
export type SocketReceiveMessageResponse =
  ChatMessageResponse;

/**
 * ============================================================
 * API ENDPOINTS
 * ============================================================
 */

const API_ENDPOINTS = {
  /**
   * ----------------------------------------------------------
   * Base
   * ----------------------------------------------------------
   */

  DefaultURL: defaultURL,

  /**
   * ----------------------------------------------------------
   * Authentication
   * ----------------------------------------------------------
   */

  IsEmailExist:
    `${defaultURL}/auth/isEmailExist`,

  ValidateUser:
    `${defaultURL}/auth/validateUser`,

  Login:
    `${defaultURL}/auth/login`,

  Logout:
    `${defaultURL}/auth/logout`,

  SendPasswordResetLink:
    `${defaultURL}/auth/sendPasswordResetLink`,

  SendEmailVerificationLink:
    `${defaultURL}/auth/sendEmailVerifyLink`,

  ValidateLink:
    `${defaultURL}/auth/validateLink`,

  SendOtp:
    `${defaultURL}/auth/sendOtp`,

  VerifyOtp:
    `${defaultURL}/auth/`,

  UpdatePassword:
    `${defaultURL}/auth/resetPassword`,

  ResetPassword:
    `${defaultURL}/`,

  /**
   * ----------------------------------------------------------
   * Users
   * ----------------------------------------------------------
   */

  CreateUser:
    `${defaultURL}/auth/createUser`,

  GetAllUsers:
    `${defaultURL}/auth/getAllUsers`,

  GetUserById:
    `${defaultURL}/auth/getUser/`,

  GetUserByToken:
    `${defaultURL}/auth/getUserByToken`,

  SearchUserByPublicId:
    `${defaultURL}/auth/searchByPublicId`,

  UpdateUser:
    `${defaultURL}/auth/updateUser`,

  DeleteUser:
    `${defaultURL}/auth/deleteUser`,

  /**
   * ----------------------------------------------------------
   * Conversations
   * ----------------------------------------------------------
   *
   * GET:
   *   /chat/conversations
   *
   * Returns conversations belonging to the
   * authenticated user.
   */

  GetConversations:
    `${defaultURL}/chat/conversations`,

  /**
   * ----------------------------------------------------------
   *
   * POST:
   *   /chat/conversations
   *
   * Body:
   *   {
   *     userId: number
   *   }
   *
   * Creates a direct conversation or returns
   * the existing one.
   */

  CreateConversation:
    `${defaultURL}/chat/conversations`,

  /**
   * ----------------------------------------------------------
   *
   * POST:
   *   /chat/getConversation
   *
   * Body:
   *   {
   *     conversationId: number
   *   }
   *
   * Returns messages belonging to the conversation.
   */

  GetConversation:
    `${defaultURL}/chat/getConversation`,

  /**
   * ----------------------------------------------------------
   * Messages
   * ----------------------------------------------------------
   *
   * HTTP fallback/legacy message creation endpoint.
   *
   * Socket.IO should normally be used for realtime
   * message sending.
   */

  CreateChat:
    `${defaultURL}/chat/createChat`,
};

export default API_ENDPOINTS;