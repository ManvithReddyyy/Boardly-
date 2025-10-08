import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // We'll create backend next

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketIo = io(SOCKET_URL);

    socketIo.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    setSocket(socketIo);

    return () => socketIo.disconnect();
  }, []);

  return { socket, connected };
};
