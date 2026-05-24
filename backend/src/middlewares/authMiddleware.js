import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or invalid. Please login.' });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Fetch user from DB to verify they exist and get dynamic state (credits, plan)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account not found. Unauthorized.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] JWT Verification failed:', err.message);
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};

export default verifyToken;
