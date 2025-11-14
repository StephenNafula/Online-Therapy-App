const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function auth(required=true){
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (required) return res.status(401).json({ message: 'No token' });
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      console.error('JWT error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
}

function requireRole(role){
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== role && req.user.role !== 'admin') return res.status(403).json({ message: 'Insufficient role' });
    next();
  }
}

module.exports = { auth, requireRole };
