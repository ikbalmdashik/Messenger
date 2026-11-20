
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

export interface IsEmailExistResponse extends ApiResponse {
  exists?: boolean;
}

export interface ValidateUserRequest {
  email: string;
  otp: string;
  usedFor: string;
}

export interface ValidateUserResponse extends ApiResponse {
  token?: string;
}

export interface LoginRequest {
  token: string;
}

export interface LoginResponse extends ApiResponse {
  access_token?: string;
}

export type LogoutResponse = ApiResponse;

export interface SendEmailVerificationRequest {
  email: string;
  type: string;
}

export type SendEmailVerificationResponse = ApiResponse;

export interface SendPasswordResetLinkRequest {
  email: string;
}

export type SendPasswordResetLinkResponse = ApiResponse;

export interface SendOtpRequest {
  email?: string;
  phone?: string;
  usedFor: string;
}

export type SendOtpResponse = ApiResponse;

export interface UpdatePasswordRequest {
  token: string;
  password: string;
}

export type UpdatePasswordResponse = ApiResponse;

export interface ValidateLinkRequest {
  token: string;
}

export interface ValidateLinkResponse extends ApiResponse {
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
  isDeactivated?: boolean;

  phone?: string;
  publicId?: string;
  role?: string;

  isEmailVerified?: boolean;

  profilePicture?: string | null;
  bio?: string | null;

  onlineStatus?: string;
}

export interface GetUserByTokenResponse extends UserResponse {
  success?: boolean;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface CreateUserResponse extends ApiResponse {
  userId?: number;
}

export type GetAllUsersResponse = UserResponse[];

export type GetUserByIdResponse = UserResponse;

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  bio?: string;
  profilePicture?: string | null;
}

export interface UpdateUserResponse extends ApiResponse {
  user?: UserResponse;
}

export type DeleteUserResponse = ApiResponse;

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
 * GET USER BY PUBLIC ID
 *
 * Response returned by:
 * GET /auth/getUserByPublicId/:publicId
 */

export interface UserAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  description?: string;
}

export interface UserSocialLink {
  platform: string;
  url: string;
}

export interface UserContact {
  website?: string;
  socials?: UserSocialLink[];
}

export type ProfileVisibility =
  | "EVERYONE"
  | "CONTACTS"
  | "ONLY_ME";

export interface UserPrivacy {
  contact: ProfileVisibility;
  education: ProfileVisibility;
  location: ProfileVisibility;
}

export type GroupInviteLevel =
  | "EVERYONE"
  | "CONTACTS"
  | "NOBODY";

export interface UserGroupSettings {
  defaults: {
    addMembers: "ALL" | "ADMINS";
    editInfo: "ALL" | "ADMINS";
    sendMessages: "ALL" | "ADMINS";
  };
  whoCanAddMe: GroupInviteLevel;
}

export interface ActiveSession {
  sessionId: number;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface BlockedUser {
  userId: number;
  fullName: string;
  publicId: string;
  blockedAt: string;
}

export interface BlockStatus {
  blockedByMe: boolean;
  blockedMe: boolean;
}

export interface MyGroupSummary {
  conversationId: number;
  name: string;
  memberCount: number;
  myRole: "ADMIN" | "MEMBER";
  permissions: {
    addMembers: "ALL" | "ADMINS";
    editInfo: "ALL" | "ADMINS";
    sendMessages: "ALL" | "ADMINS";
  };
  usesDefaults: boolean;
}

export interface MyProfile {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  publicId: string;
  role: string;
  isEmailVerified: boolean;
  address: UserAddress | null;
  education: UserEducation[];
  contact: UserContact | null;
  privacy: UserPrivacy;
  groupSettings: UserGroupSettings;
  isDeactivated: boolean;
}

export interface UpdateMyProfileRequest {
  verificationToken: string;
  fullName?: string;
  phone?: string;
  address?: UserAddress | null;
  education?: UserEducation[];
  contact?: UserContact | null;
  privacy?: UserPrivacy;
}

/**
 * Sections the viewer may not see are null and
 * flagged in `hidden`.
 */
export interface GetUserByPublicIdResponse {
  userId: number;
  fullName: string;
  publicId: string;
  role: string;
  isEmailVerified: boolean;
  isOwner: boolean;
  blockedByMe?: boolean;
  blockedMe?: boolean;
  email: string | null;
  phone: string | null;
  contact: UserContact | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  education: UserEducation[] | null;
  hidden: {
    contact: boolean;
    education: boolean;
    location: boolean;
  };
  privacy?: UserPrivacy;
}

export interface SavedAccount {
  userId: number;
  fullName: string;
  email: string;
  publicId: string;
  isEmailVerified: boolean;
  isActive: boolean;
  /** false: remembered here but needs a password */
  isSignedIn: boolean;
}

export interface SavedAccountsResponse {
  accounts: SavedAccount[];
}

export interface LogoutResult extends ApiResponse {
  switchedTo?: number | null;
}

/**
 * ============================================================
 * GROUP TYPES
 * ============================================================
 */

export type PermissionLevel = "ALL" | "ADMINS";

export interface GroupPermissions {
  addMembers: PermissionLevel;
  editInfo: PermissionLevel;
  sendMessages: PermissionLevel;
}

export type GroupRole = "ADMIN" | "MEMBER";

export interface GroupMember {
  userId: number;
  fullName: string;
  publicId: string;
  isEmailVerified: boolean;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupDetails {
  conversationId: number;
  type: "GROUP";
  name: string;
  description: string | null;
  createdById: number | null;
  createdAt: string;
  permissions: GroupPermissions;
  members: GroupMember[];
}

/**
 * ============================================================
 * CONVERSATION TYPES
 * ============================================================
 */

export type ConversationType = "DIRECT" | "GROUP";

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

export type GetConversationsResponse = ConversationResponse[];

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

  editedAt?: string | null;

  isDeleted?: boolean;

  replyTo?: {
    messageId: number;
    senderId: number;
    message: string;
    isDeleted: boolean;
  } | null;

  reactions?: {
    userId: number;
    emoji: string;
  }[];
}

/**
 * Request for:
 *
 * POST /chat/getConversation
 */

export interface GetConversationRequest {
  conversationId: number;

  limit?: number;

  offset?: number;
}

export type GetConversationResponse = ChatMessageResponse[];

/**
 * Request for:
 *
 * POST /chat/createChat
 */

export interface SendMessageRequest {
  conversationId: number;

  message: string;

  status: string;

  replyToMessageId?: number | null;
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

  replyToMessageId?: number | null;
}

/**
 * Payload received from:
 *
 * socket.on("receive_message", ...)
 */

export type SocketReceiveMessageResponse = ChatMessageResponse;

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


  SendEmailVerificationLink:
    `${defaultURL}/auth/sendEmailVerifyLink`,

  ValidateLink:
    `${defaultURL}/auth/validateLink`,

  SendOtp:
    `${defaultURL}/auth/sendOtp`,


  UpdatePassword:
    `${defaultURL}/auth/resetPassword`,


  /**
   * ----------------------------------------------------------
   * Users
   * ----------------------------------------------------------
   */

  CreateUser:
    `${defaultURL}/auth/createUser`,



  GetUserByToken:
    `${defaultURL}/auth/getUserByToken`,

  GetUserByPublicId:
    `${defaultURL}/auth/getUserByPublicId/`,

  SearchUserByPublicId:
    `${defaultURL}/auth/searchByPublicId`,



  MyProfile:
    `${defaultURL}/auth/myProfile`,

  UpdateMyProfile:
    `${defaultURL}/auth/updateMyProfile`,

  DeleteMyAccount:
    `${defaultURL}/auth/deleteMyAccount`,

  DeactivateMyAccount:
    `${defaultURL}/auth/deactivateMyAccount`,

  ReactivateMyAccount:
    `${defaultURL}/auth/reactivateMyAccount`,

  ForgetAccount:
    `${defaultURL}/auth/forgetAccount`,

  ResetAccount:
    `${defaultURL}/chat/account/reset`,

  Sessions:
    `${defaultURL}/auth/sessions`,

  RevokeSession:
    `${defaultURL}/auth/sessions/revoke`,

  RevokeOtherSessions:
    `${defaultURL}/auth/sessions/revokeOthers`,

  UpdateGroupSettings:
    `${defaultURL}/auth/updateGroupSettings`,

  /**
   * ----------------------------------------------------------
   * Blocking & deleting chats
   * ----------------------------------------------------------
   */

  BlockedUsers:
    `${defaultURL}/chat/blocks`,

  BlockStatus:
    `${defaultURL}/chat/blocks/status`,

  BlockUser:
    `${defaultURL}/chat/blocks/block`,

  UnblockUser:
    `${defaultURL}/chat/blocks/unblock`,

  DeleteChat:
    `${defaultURL}/chat/conversations/delete`,


  MyGroups:
    `${defaultURL}/chat/groups/mine`,

  ApplyGroupDefaults:
    `${defaultURL}/chat/groups/applyDefaults`,

  /**
   * ----------------------------------------------------------
   * Saved accounts (multi-account)
   * ----------------------------------------------------------
   */

  SavedAccounts:
    `${defaultURL}/auth/savedAccounts`,

  SwitchAccount:
    `${defaultURL}/auth/switchAccount`,

  RemoveSavedAccount:
    `${defaultURL}/auth/removeSavedAccount`,

  /**
   * ----------------------------------------------------------
   * Groups
   * ----------------------------------------------------------
   */

  CreateGroup:
    `${defaultURL}/chat/groups`,

  GroupDetails:
    `${defaultURL}/chat/groups/details`,

  UpdateGroup:
    `${defaultURL}/chat/groups/update`,

  UpdateGroupPermissions:
    `${defaultURL}/chat/groups/permissions`,

  AddGroupMembers:
    `${defaultURL}/chat/groups/addMembers`,

  RemoveGroupMember:
    `${defaultURL}/chat/groups/removeMember`,

  SetGroupRole:
    `${defaultURL}/chat/groups/setRole`,

  LeaveGroup:
    `${defaultURL}/chat/groups/leave`,

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

};

export default API_ENDPOINTS;
