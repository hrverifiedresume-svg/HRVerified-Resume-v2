import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.routes';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
