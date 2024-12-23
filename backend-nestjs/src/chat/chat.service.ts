import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity, ChatsEntityDemo } from './entities/chat.entity';
import { CreateChatDto, CreateChatDtoDemo } from './dto/create-chat.dto';
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private messageRepository: Repository<ChatMessageEntity>,
    @InjectRepository(ChatsEntityDemo)
    private messageRepositoryDemo: Repository<ChatsEntityDemo>,

  ) {}

  async FormatDate(date: Date) {
    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true // Enables AM/PM format
    };

    return (date.toLocaleString('en-GB', options).replace(', ', ' - ')).toString();
  }

  async CreateChat(createChatDto: CreateChatDto) {
    const chat: ChatMessageEntity = new ChatMessageEntity();
    chat.senderId = createChatDto.senderId;
    chat.receiverId = createChatDto.receiverId;
    chat.message = createChatDto.message;
    chat.status = createChatDto.status;
    chat.createdAt = new Date().toLocaleString().replace(', ', ' - ');
    const newMessage = this.messageRepository.create(chat);
    return await this.messageRepository.save(newMessage);
  }

  async CreateChatDemo(createChatDtoDemo: CreateChatDtoDemo) {
    const chat: ChatsEntityDemo = new ChatsEntityDemo();
    chat.userName = createChatDtoDemo.userName;
    chat.message = createChatDtoDemo.message;
    chat.createdAt = createChatDtoDemo.createdAt;
    const newMessage = this.messageRepositoryDemo.create(chat);
    return await this.messageRepositoryDemo.save(newMessage);
  }

  async getMessagesDemo() {
    return await this.messageRepositoryDemo.find({
      order: { id: "DESC" }, // You can reverse it in frontend if needed
      take: 50, // Limit the number of messages retrieved
    });
  }

  async getMessages() {
    return await this.messageRepository.find({
      order: { chatId: "DESC" }, // You can reverse it in frontend if needed
      take: 50, // Limit the number of messages retrieved
    });
  }

  async GetConversation(getConversationDto: Partial<CreateChatDto>) {
    // return await this.messageRepository.find({
    //   where: {
    //     senderId: getConversationDto.senderId,
    //     receiverId: getConversationDto.receiverId
    //   },
    //   order: { chatId: 'ASC' }, // You can reverse it in frontend if needed
    // });

    return await this.messageRepository.createQueryBuilder('chat')
    .where(
      '(chat.senderId = :senderId AND chat.receiverId = :receiverId) OR (chat.senderId = :receiverId AND chat.receiverId = :senderId)',
      getConversationDto
    )
    .orderBy('chat.chatId', 'ASC') // Optional: order by timestamp
    .getMany();
  }
}
