export class CreateChatDto {
    senderId: number;
    receiverId: number;
    message: string;
    status: string;
}

export class CreateChatDtoDemo {
    userName: string;
    message: string;
    createdAt: string;
}