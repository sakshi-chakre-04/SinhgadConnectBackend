// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// in development mode, use morgan for logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS Configuration
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

// Configure CORS with specific options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list or it's a development environment
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the above options
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Disable the default CORS policy from helmet
  contentSecurityPolicy: false // Temporarily disable CSP for development
}));

// Apply rate limiting only to API routes
app.use('/api/', limiter);

// Add a simple middleware to handle preflight requests
app.use((req, res, next) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Sinhgad Connect Backend is running!',
    version: '1.0.0',
    status: 'active'
  });
});

// API Routes (we'll add these next)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});