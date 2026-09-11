import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { ConversationService } from "./conversation.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";

import { JwtAuthGuard } from "@/auth/auth.guard";
import { AuthenticatedRequest } from "@/auth/interfaces/authenticated-request.interface";

@Controller("chat")
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Create a new direct conversation or return
   * the existing conversation between two users.
   */
  @UseGuards(JwtAuthGuard)
  @Post("conversations")
  async createConversation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    const userId = request.user?.userId;

    if (
      userId === undefined ||
      userId === null
    ) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    return await this.conversationService.createOrGetDirectConversation(
      Number(userId),
      dto,
    );
  }

  /**
   * Get all conversations of the logged-in user.
   */
  @UseGuards(JwtAuthGuard)
  @Get("conversations")
  async getConversations(
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = request.user?.userId;

    if (
      userId === undefined ||
      userId === null
    ) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    return await this.conversationService.getUserConversations(
      Number(userId),
    );
  }
}