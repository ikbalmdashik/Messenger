import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '@/auth/auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
  
  @UseGuards(JwtAuthGuard)
  @Post("/createChat")
  async CreateChat(@Body() createChatDto: CreateChatDto) {
    return await this.chatService.CreateChat(createChatDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/messages')
  async getMessages() {
    return await this.chatService.getMessages();
  }

  @UseGuards(JwtAuthGuard)
  @Post("/getConversation")
  async GetConversation(@Body() getConversationDto: Partial<CreateChatDto>) {
    return await this.chatService.GetConversation(getConversationDto);
  }
}
