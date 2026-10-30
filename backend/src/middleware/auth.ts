import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_secret' : undefined);
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server misconfiguration: missing JWT_SECRET' });
  }

  jwt.verify(token, jwtSecret, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};
export default authenticateToken;
