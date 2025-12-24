/**
 * Authentication Middleware
 * Verifies JWT tokens and enforces authentication on protected routes
 */

const jwt = require("jsonwebtoken");
const axios = require("axios");

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:8001";

/**
 * Middleware to verify JWT token from Authorization header
 * Attaches decoded user information to req.user if valid
 */
async function authenticateToken(req, res, next) {
  try {
    // Optimization: Check if request comes from Gateway with verified user headers
    // This avoids an extra HTTP call to Auth Service
    const gatewayUserId = req.headers["x-user-id"];
    const gatewayUserEmail = req.headers["x-user-email"];
    const gatewayUserRole = req.headers["x-user-role"];

    if (gatewayUserId && gatewayUserEmail && gatewayUserRole) {
      req.user = {
        id: parseInt(gatewayUserId),
        email: gatewayUserEmail,
        role: gatewayUserRole,
      };
      // Still extract token for downstream calls if needed
      const authHeader = req.headers["authorization"];
      if (authHeader) {
        req.token = authHeader.split(" ")[1];
      }
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        message: "No token provided",
      });
    }

    // Verify token with auth service
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/auth/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      // Attach user info to request object
      req.user = response.data.user;
      req.token = token;
      next();
    } catch (error) {
      if (error.response?.status === 401) {
        return res.status(401).json({
          error: "Invalid token",
          message: "Token verification failed",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(500).json({
      error: "Authentication service error",
      message: "Could not verify token",
    });
  }
}

/**
 * Middleware to check if user has required role
 * Must be used after authenticateToken
 *
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User information not found",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `This action requires one of the following roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user owns the resource
 * Compares req.user.id with req.params.userId or resource.owner_id
 *
 * @param {Function} getResourceOwner - Async function that returns owner ID
 */
function requireOwnership(getResourceOwner) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const ownerId = await getResourceOwner(req);

      // Allow admins to access any resource
      if (req.user.role === "admin") {
        return next();
      }

      if (req.user.id !== ownerId) {
        return res.status(403).json({
          error: "Access denied",
          message: "You do not have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      return res.status(500).json({
        error: "Authorization check failed",
      });
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token present
 * Useful for endpoints that behave differently based on auth status
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/auth/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      req.user = response.data.user;
      req.token = token;
    } catch (error) {
      // Ignore errors, just mark as unauthenticated
      req.user = null;
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error.message);
    req.user = null;
    next();
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  optionalAuth,
};
