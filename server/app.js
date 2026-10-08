const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const walletRoutes = require('./routes/walletRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const maintenanceService = require('./services/maintenanceService');

const checkMaintenance = require('./middleware/maintenanceMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // allows image uploads to be fetched by frontend
}));

// Enable CORS
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}));

// Request compression
app.use(compression());

// Logger middleware
app.use(morgan('dev'));

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse Cookie header and populate req.cookies
app.use(cookieParser());

// Serve uploaded avatars statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/v1/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    database: dbStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Public Maintenance Status route
app.get('/api/v1/maintenance/status', async (req, res) => {
  try {
    const status = await maintenanceService.getStatus();
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance status' });
  }
});

// Apply rate limiter to general API routes
app.use('/api', apiLimiter);

// Apply maintenance mode check to general user API routes
app.use('/api', checkMaintenance);

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/match', matchRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/rewards', rewardRoutes);

// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
