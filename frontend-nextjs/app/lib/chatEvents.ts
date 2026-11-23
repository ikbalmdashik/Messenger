/**
 * In-page events between chat panels.
 *
 * BLOCK_UPDATED_EVENT: the middlebar's socket heard a
 * block change; detail: { userId }. The rightbar
 * re-reads that profile.
 */
export const BLOCK_UPDATED_EVENT = "chat:block-updated";

/**
 * SUSPENSION_UPDATED_EVENT: a direct-chat suspension
 * changed; detail: { conversationId }. Panels re-read
 * the suspension status.
 */
export const SUSPENSION_UPDATED_EVENT = "chat:suspension-updated";
