"use client"

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

interface Message {
  id: number;
  userName: string;
  message: string;
  createdAt: string;
}

const SendChat = () => {
  const [userName, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Connect to WebSocket server
  useEffect(() => {
    const socket = io('http://localhost:3333');

    // Listen for new messages from the server
    socket.on('newMessage', (newMessage: Message) => {
      setMessages((prevMessages) => [newMessage, ...prevMessages]); // Add the new message to the top
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch initial chat messages when component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await axios.get('http://localhost:3333/chat/messagesDemo');
      setMessages(data); // Load the fetched messages into state
    };
    fetchMessages();
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName || !message) return; // Ensure both fields are filled

    // Send new message to the server
    const socket = io('http://localhost:3333');
    socket.emit('sendMessage', { userName: userName, message: message, createdAt: "date will be here" });

    // Clear message field
    setMessage('');
  };

  return (
    <div className='border  rounded p-2'>
      <h1 className='border-b text-xl text-center pb-2 mb-2'>Live Chat</h1>

      {/* Form to submit new messages */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUsername(e.target.value)}
          required
          className='bg-transparent border w-[94%] rounded p-2 m-2 text-center'
        /> <br />
        <input
          type="text"
          placeholder="Your Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className='bg-transparent border w-[94%] rounded p-2 m-2 text-center'
        /> <br />
        <button
            type="submit"
            className='border rounded w-[94%] m-2 py-2'
        >
            Send
        </button>
      </form>

      {/* Display messages after the form */}
      <div className='border-t mt-4'>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className='border m-2 p-2 rounded'>
              <p className='text-sm text-white/40'>
                {msg.userName}
                <small className='text-white/20 absolute right-8 '>
                {new Date(msg.createdAt).toLocaleString()}
                </small>
              </p>
              
            <p>
                {msg.message}
            </p>
            </div>
          ))
        ) : (
          <p>No messages yet!</p>
        )}
      </div>
    </div>
  );
};

export default SendChat;
