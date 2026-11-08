require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { apiRateLimit } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const geofenceRoutes = require('./routes/geofences');
const reminderRoutes = require('./routes/reminders');
const locationRoutes = require('./routes/location');

const app = express();

// Security and CORS middleware
app.use(
  helmet({
    contentSecurityPolicy: false // Allows inline scripts in frontend if needed
  })
);
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply general API rate limiting to all /api routes
app.use('/api', apiRateLimit);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/location', locationRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error')
  });
});

module.exports = app;
