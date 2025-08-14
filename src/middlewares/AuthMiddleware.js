import admin from '../config/firebase.js';
import db from '../config/db.js';

export async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
console.log(decoded.email);

    // Get user from database
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [decoded.email]
    );

    if (!rows.length) {
      return res.status(403).json({ message: 'User not registered' });
    }

    req.user = {
      id: rows[0].id,
      email: decoded.email,

    };

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Invalid token' });
  }
}

export async function isAdmin(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}

export async function isUser(req, res, next) {
  if (req.user.role === 'user' || req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'User access required' });
}