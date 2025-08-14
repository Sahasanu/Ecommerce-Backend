import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupTables } from './src/config/setupTables.js';
import { verifyToken, isAdmin, isUser } from './src/middlewares/AuthMiddleware.js';
import adminRoutes from './src/routes/adminRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';

dotenv.config();
const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/admin', verifyToken, isAdmin, adminRoutes);
app.use('/user', verifyToken, isUser, clientRoutes);
app.use('/', publicRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  setupTables();
  console.log(`✅ Server running on http://localhost:${PORT}`);
});