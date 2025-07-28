import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Chat } from '../chat/useChats';
import { CreateChat } from '../chat/useCreateChat';

let socket: Socket;

export const useSocket = (url: any, roomId: {senderId: number | null, receiverId: number | null}) => {
  const [messages, setMessages] = useState<Chat[]>([]);

  useEffect(() => {
    socket = io(url);
    socket.emit('joinRoom', roomId);
    
    socket.on('newMessage', (message) => {
      setMessages((prev) => [message, ...prev]);
      return socket.disconnect();
    });
  }, [url, roomId]);

  const sendMessage = (createChat: CreateChat) => {
    socket.emit('sendMessage', createChat);
  }

  return { messages, sendMessage };
};
