export class CreateChatDto {
  conversationId: number;
  message: string;
  status: string;
  replyToMessageId?: number | null;
}
