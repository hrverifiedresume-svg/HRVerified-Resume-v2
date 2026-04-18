import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Verify token
    const decoded = authService.verifyToken(token);

    // Attach user to request
    (req as any).user = decoded;

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;
