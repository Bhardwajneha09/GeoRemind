
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = require('./app');
const { testConnection } = require('./config/database');
const { scheduleDailyDigest } = require('./services/emailService');
const { JWT_SECRET } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Socket.IO configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : true;

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make Socket.IO available to routes
app.set('io', io);

// Socket connection
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Authenticate socket using JWT
  socket.on('authenticate', (data) => {
    try {
      const token = data && data.token;

      if (!token) {
        return socket.emit('error', {
          message: 'Token is required'
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      socket.userId = decoded.id;

      const room = `user:${decoded.id}`;
      socket.join(room);

      console.log('User authenticated:', decoded.id);

      socket.emit('authenticated', {
        userId: decoded.id,
        room: room
      });

    } catch (error) {
      console.log('Socket authentication failed:', error.message);

      socket.emit('error', {
        message: 'Invalid or expired token'
      });
    }
  });

  // Join authenticated user's room
  socket.on('join:room', (roomName) => {
    if (!socket.userId) {
      return socket.emit('error', {
        message: 'Please authenticate first'
      });
    }

    const expectedRoom = `user:${socket.userId}`;

    if (roomName === expectedRoom) {
      socket.join(roomName);

      socket.emit('joined:room', {
        room: roomName
      });
    } else {
      socket.emit('error', {
        message: 'Unauthorized room access'
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server
async function startServer() {
  try {
    console.log('Starting GeoRemind backend...');

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is missing');
    }

    // Check database connection
    const connected = await testConnection();

    if (!connected) {
      throw new Error('Database connection failed');
    }

    console.log('Database connected successfully');

    // Start daily email reminders
    scheduleDailyDigest();

    // Listen on Render's assigned port
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`GeoRemind server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Socket.IO is ready');
    });

  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start only when this file is executed directly
if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  io,
  startServer
};
