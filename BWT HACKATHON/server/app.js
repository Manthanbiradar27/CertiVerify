const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/org');
const recipientRoutes = require('./routes/recipients');
const certificateRoutes = require('./routes/certificates');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// ── Security middleware ───────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow PDF downloads
  })
);

// CORS — restrict to known frontend origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin (server-to-server, Postman, tests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true, // Required for HttpOnly cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing — enforce size limit to prevent large payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// Logging — skip in test environment
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── General rate limit (overridden by stricter per-route limiters) ────────
app.use('/api', apiLimiter);

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) =>
  res.status(200).json({
    success: true,
    message: 'CertiVerify API is running',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    health: '/api/health',
  })
);

app.get('/api/health', (req, res) =>
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` })
);

// ── Central error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
