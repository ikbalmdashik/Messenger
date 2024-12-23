import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatMessageEntity, ChatsEntityDemo } from './entities/chat.entity';
import { CreateChatDto, CreateChatDtoDemo } from './dto/create-chat.dto';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
})

export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    console.log(`Client connected: ${socket.id}`);
  }

  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    console.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join_room')
  async HandleJoinRoom(
    @MessageBody() { senderId, receiverId }: { senderId: number; receiverId: number },
    @ConnectedSocket() client: Socket
  ) {
    // Sort senderId and receiverId to ensure a consistent room name
    const sortedIds = [senderId, receiverId].sort(); // Ensures [1, 2] and [2, 1] result in the same array
    const room = `chat-${sortedIds[0]}-to-${sortedIds[1]}`;

    // Join the room
    await client.join(room);
    console.log(`${client.id} joined room: ${room}`);
  }

  // When a user sends a message, it will be sent to a specific room
  @SubscribeMessage('send_message')
  async HandleMessage(
    @MessageBody() createChatDto: CreateChatDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Create a room identifier based on sender and receiver (to ensure the same pair always joins the same room)
    const sortedIds = [createChatDto.senderId, createChatDto.receiverId].sort(); // Ensures [1, 2] and [2, 1] result in the same array
    const room = `chat-${sortedIds[0]}-to-${sortedIds[1]}`;

    const savedMessage = await this.chatService.CreateChat(createChatDto);

    // Emit the message to the room
    this.server.to(room).emit('receive_message', savedMessage);
    return savedMessage;
  }
}