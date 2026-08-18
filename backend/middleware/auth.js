const { supabaseAdmin } = require('../services/supabase');

// In-memory token cache (5 minutes TTL) to eliminate 400ms DB latency on every prompt
const tokenCache = new Map();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Check in-memory cache first (0ms)
    const cached = tokenCache.get(token);
    if (cached && (Date.now() - cached.timestamp < 300000)) {
      req.user = cached.user;
      req.token = token;
      return next();
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      tokenCache.delete(token);
      return res.status(401).json({ error: 'Unauthorized', message: error ? error.message : 'Invalid token' });
    }

    // Save to cache
    tokenCache.set(token, { user, timestamp: Date.now() });

    // Clean old cache entries if map grows too large
    if (tokenCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of tokenCache.entries()) {
        if (now - v.timestamp > 300000) tokenCache.delete(k);
      }
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = authenticate;
