
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

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Allowed website URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://georemind-4xda.onrender.com',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked CORS origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRateLimit);

app.use('/api/auth', authRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/location', locationRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal server error')
  });
});

module.exports = app;
