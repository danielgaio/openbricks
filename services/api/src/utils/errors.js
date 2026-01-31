/**
 * Centralized Error Handling
 * Provides consistent error responses across the API
 * Implements structured error types for different scenarios
 */

/**
 * Custom API Error class
 * Extends Error with HTTP status code and error code
 */
class ApiError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes from programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Predefined error types for common scenarios
 */
const errors = {
  // 400 Bad Request
  badRequest: (message = "Bad request", details = null) =>
    new ApiError(message, 400, "BAD_REQUEST", details),

  validation: (message = "Validation failed", details = null) =>
    new ApiError(message, 400, "VALIDATION_ERROR", details),

  // 401 Unauthorized
  unauthorized: (message = "Authentication required") =>
    new ApiError(message, 401, "UNAUTHORIZED"),

  invalidToken: (message = "Invalid or expired token") =>
    new ApiError(message, 401, "INVALID_TOKEN"),

  // 403 Forbidden
  forbidden: (message = "Access denied") =>
    new ApiError(message, 403, "FORBIDDEN"),

  insufficientPermissions: (message = "Insufficient permissions") =>
    new ApiError(message, 403, "INSUFFICIENT_PERMISSIONS"),

  // 404 Not Found
  notFound: (resource = "Resource") =>
    new ApiError(`${resource} not found`, 404, "NOT_FOUND"),

  // 409 Conflict
  conflict: (message = "Resource already exists") =>
    new ApiError(message, 409, "CONFLICT"),

  duplicate: (field = "Resource") =>
    new ApiError(`${field} already exists`, 409, "DUPLICATE"),

  // 422 Unprocessable Entity
  unprocessable: (message = "Unable to process request", details = null) =>
    new ApiError(message, 422, "UNPROCESSABLE", details),

  // 429 Too Many Requests
  tooManyRequests: (message = "Too many requests, please try again later") =>
    new ApiError(message, 429, "TOO_MANY_REQUESTS"),

  // 500 Internal Server Error
  internal: (message = "Internal server error") =>
    new ApiError(message, 500, "INTERNAL_ERROR"),

  // 502 Bad Gateway
  badGateway: (service = "upstream service") =>
    new ApiError(`Unable to connect to ${service}`, 502, "BAD_GATEWAY"),

  // 503 Service Unavailable
  serviceUnavailable: (message = "Service temporarily unavailable") =>
    new ApiError(message, 503, "SERVICE_UNAVAILABLE"),
};

/**
 * Async handler wrapper
 * Catches async errors and forwards to error middleware
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Central error handling middleware
 * Formats all errors consistently
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (in production, use structured logging)
  const logger = req.app.get("logger") || console;

  // Handle known API errors
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error("API Error:", {
        code: err.code,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    }

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith("23")) {
    switch (err.code) {
      case "23505": // Unique violation
        return res.status(409).json({
          error: "Resource already exists",
          code: "DUPLICATE",
        });
      case "23503": // Foreign key violation
        return res.status(400).json({
          error: "Referenced resource does not exist",
          code: "INVALID_REFERENCE",
        });
      case "23502": // Not null violation
        return res.status(400).json({
          error: "Required field is missing",
          code: "MISSING_FIELD",
        });
      default:
        logger.error("Database constraint error:", err);
        return res.status(400).json({
          error: "Database constraint violation",
          code: "CONSTRAINT_ERROR",
        });
    }
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token has expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON in request body",
      code: "INVALID_JSON",
    });
  }

  // Log unexpected errors
  logger.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Return generic error for unknown errors (don't leak internal details)
  return res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    code: "INTERNAL_ERROR",
  });
};

/**
 * 404 Not Found handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
  });
};

module.exports = {
  ApiError,
  errors,
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
