import { Request, Response, NextFunction } from 'express';

export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  next();
};

export const validatePhone = (req: Request, res: Response, next: NextFunction) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  next();
};

export default { validateEmail, validatePhone };
