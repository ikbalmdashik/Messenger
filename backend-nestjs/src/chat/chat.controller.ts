import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto, CreateChatDtoDemo } from './dto/create-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
  

  @Post("/createChat")
  async CreateChat(@Body() createChatDto: CreateChatDto) {
    return await this.chatService.CreateChat(createChatDto);
  }

  @Get('/messages')
  async getMessages() {
    return await this.chatService.getMessages();
  }

  @Post("/messagesDemo")
  async CreateChatDmo(@Body() createChatDtoDemo: CreateChatDtoDemo) {
    return await this.chatService.CreateChatDemo(createChatDtoDemo);
  }

  @Get('/messagesDemo')
  async getMessagesDemo() {
    return await this.chatService.getMessagesDemo();
  }

  @Post("/getConversation")
  async GetConversation(@Body() getConversationDto: Partial<CreateChatDto>) {
    return await this.chatService.GetConversation(getConversationDto);
  }
}
