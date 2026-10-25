import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware: Protects routes by verifying JWT token
 * Checks HttpOnly cookie ('token') first, then Authorization header ('Bearer <token>')
 */
export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to access this resource.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[HealthLens AI] JWT_SECRET is not configured in environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Authentication service configuration error.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret);

    // Verify user still exists in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please sign in again.',
      });
    }

    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please sign in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please sign in again.',
    });
  }
}

export default requireAuth;
