/**
 * Response DTOs
 * Standard response structures for API consistency
 *
 * Implements a uniform response envelope pattern
 */

/**
 * Create a paginated response
 * @param {Object} data - Data object with items array
 * @param {Object} pagination - Pagination info
 * @param {Object} options - Additional options
 * @returns {Object} Formatted response
 */
function createPaginatedResponse(data, pagination = {}, options = {}) {
  const {
    total = data.length || 0,
    limit = data.length || 0,
    offset = 0,
    hasMore = offset + limit < total,
  } = pagination;

  return {
    success: true,
    data,
    meta: {
      pagination: {
        total,
        limit,
        offset,
        has_more: hasMore,
        page: Math.floor(offset / (limit || 1)) + 1,
        total_pages: Math.ceil(total / (limit || 1)),
      },
      ...options.meta,
    },
  };
}

/**
 * Create an error response
 * @param {string} error - Error code
 * @param {string} message - Human-readable message
 * @param {Object} details - Additional error details
 * @returns {Object} Error response
 */
function createErrorResponse(error, message, details = {}) {
  return {
    success: false,
    error: {
      code: error,
      message,
      ...details,
    },
  };
}

/**
 * Create a success response
 * @param {Object} data - Response data
 * @param {Object} meta - Optional metadata
 * @returns {Object} Success response
 */
function createSuccessResponse(data, meta = {}) {
  return {
    success: true,
    data,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_CODES = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  VALIDATION: 400,
  CONFLICT: 409,
  INVALID_STATE: 422,
  INTERNAL: 500,
};

/**
 * Get HTTP status code for error code
 * @param {string} errorCode - Error code
 * @returns {number} HTTP status code
 */
function getErrorStatusCode(errorCode) {
  return ERROR_STATUS_CODES[errorCode] || 400;
}

/**
 * Default error messages
 */
const DEFAULT_ERROR_MESSAGES = {
  NOT_FOUND: "The requested resource was not found",
  FORBIDDEN: "You do not have permission to access this resource",
  UNAUTHORIZED: "Authentication required",
  VALIDATION: "The request data is invalid",
  CONFLICT: "The resource already exists or conflicts with existing data",
  INVALID_STATE: "The operation is not allowed in the current state",
  INTERNAL: "An internal error occurred",
};

/**
 * Get default message for error code
 * @param {string} errorCode - Error code
 * @returns {string} Default message
 */
function getDefaultErrorMessage(errorCode) {
  return DEFAULT_ERROR_MESSAGES[errorCode] || "An error occurred";
}

module.exports = {
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
  getErrorStatusCode,
  getDefaultErrorMessage,
  ERROR_STATUS_CODES,
};
