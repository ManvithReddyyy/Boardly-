const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration - ALLOW BOTH PORTS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

// Store active boards and users
const boards = new Map();

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join a board
  socket.on('join-board', ({ boardId, userId, username }) => {
    socket.join(boardId);
    
    // Store user info
    if (!boards.has(boardId)) {
      boards.set(boardId, new Map());
    }
    boards.get(boardId).set(socket.id, { userId, username });

    console.log(`👤 ${username} joined board: ${boardId}`);

    // Notify others in the room
    socket.to(boardId).emit('user-joined', { userId, username });

    // Send current users in board
    const usersInBoard = Array.from(boards.get(boardId).values());
    socket.emit('users-in-board', usersInBoard);
  });

  // Handle drawing
  socket.on('draw', (data) => {
    socket.to(data.boardId).emit('draw', data);
  });

    // Handle clear canvas
  socket.on('clear-canvas', (data) => {
    socket.to(data.boardId).emit('clear-canvas');
  });

  // Handle text
socket.on('add-text', (data) => {
  socket.to(data.boardId).emit('add-text', data);
});



  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    
    // Remove user from all boards
    boards.forEach((users, boardId) => {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);
        
        // Notify others
        io.to(boardId).emit('user-left', { userId: user.userId, username: user.username });
        
        // Clean up empty boards
        if (users.size === 0) {
          boards.delete(boardId);
        }
      }
    });
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Boardly API Server',
    status: 'running',
    activeBoards: boards.size
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Boardly server running on http://localhost:${PORT}`);
});
