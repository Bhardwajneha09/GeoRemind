require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const { testConnection } = require('./config/database');
const { scheduleDailyDigest } = require('./services/emailService');
const { JWT_SECRET } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance on app so route handlers can access via req.app.get('io')
app.set('io', io);

// Socket.io connection and authentication handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] New client connected: ${socket.id}`);

  /**
   * Client authentication event.
   * Expects payload: { token: 'jwt...' }
   */
  socket.on('authenticate', (data) => {
    try {
      const token = data && data.token ? data.token : null;

      if (!token) {
        return socket.emit('error', {
          message: 'Token is required for authentication'
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;

      const userRoom = `user:${decoded.id}`;
      socket.join(userRoom);

      console.log(
        `[Socket.io] Socket ${socket.id} authenticated for user ${decoded.id} and joined room ${userRoom}`
      );

      socket.emit('authenticated', {
        userId: decoded.id,
        room: userRoom
      });
    } catch (err) {
      console.warn(
        `[Socket.io] Authentication failed for socket ${socket.id}:`,
        err.message
      );

      socket.emit('error', {
        message: 'Authentication failed: Invalid or expired token'
      });
    }
  });

  /**
   * Client join:room event.
   * Allows authenticated socket to join its own user room.
   */
  socket.on('join:room', (roomName) => {
    if (!socket.userId) {
      return socket.emit('error', {
        message: 'Must authenticate before joining rooms'
      });
    }

    const expectedRoom = `user:${socket.userId}`;

    if (roomName === expectedRoom) {
      socket.join(roomName);

      console.log(
        `[Socket.io] Socket ${socket.id} joined room ${roomName}`
      );

      socket.emit('joined:room', {
        room: roomName
      });
    } else {
      socket.emit('error', {
        message: 'Unauthorized room access'
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(
      `[Socket.io] Socket disconnected: ${socket.id} (Reason: ${reason})`
    );
  });
});

/**
 * Boots the database, schedules cron tasks, and starts HTTP server.
 */
async function startServer() {
  try {
    console.log('--- Initializing Location Reminder Backend ---');

    // Verify database connectivity before starting the server
    const isDatabaseConnected = await testConnection();

    if (!isDatabaseConnected) {
      throw new Error(
        'Database connection failed. Server startup aborted.'
      );
    }

    // Schedule daily morning reminder digest
    scheduleDailyDigest();

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
      console.log(
        `⚙️  Environment: ${process.env.NODE_ENV || 'development'}`
      );
      console.log('📡 Real-time Socket.io initialized');
    });
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  io,
  startServer
};
