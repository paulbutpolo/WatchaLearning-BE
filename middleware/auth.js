const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get the token from the request header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  // console.log('Received token:', token);
  // If no token is provided, deny access
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token using your JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Decoded token:', decoded);
    // console.log('Token expiration:', new Date(decoded.exp * 1000));
    // Attach the user ID from the token to the request object
    req.userId = decoded.userId;
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // If the token is invalid, deny access
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;