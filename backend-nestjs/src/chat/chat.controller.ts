import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { ChatService } from "./chat.service";

import { JwtAuthGuard } from "@/auth/auth.guard";

import { AuthenticatedRequest } from "@/auth/interfaces/authenticated-request.interface";


@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  /**
   * Get all messages of a conversation.
   */
  @UseGuards(JwtAuthGuard)
  @Post("getConversation")
  async GetConversation(
    @Req() request: AuthenticatedRequest,
    @Body("conversationId")
    conversationId: number,
  ) {
    if (
      conversationId === undefined ||
      conversationId === null ||
      !Number.isFinite(Number(conversationId))
    ) {
      throw new BadRequestException(
        "conversationId is required.",
      );
    }

    const userId =
      request.user?.userId;

    if (
      userId === undefined ||
      userId === null
    ) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    return await this.chatService.GetConversation(
      Number(userId),
      Number(conversationId),
    );
  }

  /**
   * Create a chat message.
   */
  @UseGuards(JwtAuthGuard)
  @Post("createChat")
  async CreateChat(
    @Req() request: AuthenticatedRequest,

    @Body("conversationId")
    conversationId: number,

    @Body("message")
    message: string,

    @Body("status")
    status: string,
  ) {
    if (
      conversationId === undefined ||
      conversationId === null ||
      !Number.isFinite(Number(conversationId))
    ) {
      throw new BadRequestException(
        "conversationId is required.",
      );
    }

    const userId =
      request.user?.userId;

    if (
      userId === undefined ||
      userId === null
    ) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    return await this.chatService.CreateChat(
      Number(userId),
      Number(conversationId),
      message,
      status || "sent",
    );
  }

  /**
   * Alias endpoint for getting messages.
   */
  @UseGuards(JwtAuthGuard)
  @Post("messages")
  async GetMessages(
    @Req() request: AuthenticatedRequest,

    @Body("conversationId")
    conversationId: number,
  ) {
    if (
      conversationId === undefined ||
      conversationId === null ||
      !Number.isFinite(Number(conversationId))
    ) {
      throw new BadRequestException(
        "conversationId is required.",
      );
    }

    const userId =
      request.user?.userId;

    if (
      userId === undefined ||
      userId === null
    ) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    return await this.chatService.GetMessages(
      Number(userId),
      Number(conversationId),
    );
  }
}