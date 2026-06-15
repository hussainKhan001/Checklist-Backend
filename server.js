const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();

// ── Validate required env vars ────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

connectDB();

const app = express();

app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ──────────────────────────────────────────────────────────────────────
// FRONTEND_URL can be comma-separated: "http://localhost:5173,https://app.vercel.app"
// cors `origin` must be a function — passing the raw string sends ALL values in one
// header which browsers reject (Access-Control-Allow-Origin only allows one value).
const allowedOrigins = (process.env.FRONTEND_URL || 'https://checklist-backend-1-6g7s.onrender.com')
  .split(',').map(o => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server requests (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Compression + logging ─────────────────────────────────────────────────────
app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── NoSQL injection sanitization ──────────────────────────────────────────────
app.use(mongoSanitize());

// ── Rate limits ───────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/projects', apiLimiter, require('./routes/projects'));
app.use('/api/floors', apiLimiter, require('./routes/floors'));
app.use('/api/locations', apiLimiter, require('./routes/locations'));
app.use('/api/elements',  apiLimiter, require('./routes/elements'));
app.use('/api/trades', apiLimiter, require('./routes/trades'));
app.use('/api/checkpoints', apiLimiter, require('./routes/checkpoints'));
app.use('/api/inspections', apiLimiter, require('./routes/inspections'));
app.use('/api/uploads', apiLimiter, require('./routes/uploads'));

const authMiddleware = require('./middleware/auth');
app.use('/api/admin', authMiddleware, require('./routes/admin'));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

// ── Server ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
const server = app.listen(PORT, () =>
  console.log(`[SERVER] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`[SERVER] ${signal} received — shutting down`);
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => { console.error('[UNHANDLED REJECTION]', err); shutdown('unhandledRejection'); });
process.on('uncaughtException', (err) => { console.error('[UNCAUGHT EXCEPTION]', err); shutdown('uncaughtException'); });
