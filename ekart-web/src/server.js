require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/orders');

// ── Verify required env vars at startup ────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const app = express();

// ── Security Headers (Helmet) ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],   // inline scripts for demo UI
      scriptSrcAttr: ["'unsafe-inline'"],             // inline event handlers (onclick)
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — origin from env var, never wildcard in production ───────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing — size limit prevents oversized payloads ──────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Sanitise MongoDB operators in request body / query / params ────────────
app.use(mongoSanitize());

// ── HTTP request logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── General API rate limiter (applied to all /api routes) ──────────────────
app.use('/api', apiLimiter);

// ── Serve static frontend ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── Serve SPA for all non-API routes ──────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ success: false, error: 'Route not found.' });
  }
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong.'
    : err.message;
  res.status(status).json({ success: false, error: message });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`eKart server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
});

module.exports = app;
