const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-me";

/**
 * Middleware to validate JWT tokens at the Gateway level.
 * If valid, it attaches user info to headers for downstream services.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Attach user info to request object for local use
    req.user = user;

    // Attach user info to headers for downstream services
    // Downstream services should trust these headers coming from the Gateway
    req.headers["X-User-Id"] = user.user_id;
    req.headers["X-User-Email"] = user.email;
    req.headers["X-User-Role"] = user.role;

    next();
  });
};

module.exports = { authenticateToken };
