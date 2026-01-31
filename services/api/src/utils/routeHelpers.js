/**
 * Route Helpers
 * Shared utilities for route handlers
 *
 * Integrates with DTOs for Clean Architecture compliance
 */

const { errors } = require("./errors");

/**
 * Map service error codes to HTTP error factories
 */
const ERROR_MAP = {
  NOT_FOUND: (msg) => errors.notFound(msg || "Resource"),
  FORBIDDEN: (msg) => errors.forbidden(msg || "Access denied"),
  UNAUTHORIZED: (msg) => errors.unauthorized(msg || "Authentication required"),
  CONFLICT: (msg) => errors.conflict(msg || "Resource conflict"),
  DUPLICATE: (msg) => errors.duplicate(msg || "Resource"),
  VALIDATION: (msg) => errors.validation(msg || "Validation failed"),
  INVALID_STATE: (msg) => errors.conflict(msg || "Invalid state"),
  INTERNAL: (msg) => errors.internal(msg || "Internal error"),
};

/**
 * Handle service result and throw appropriate HTTP error if not successful
 * @param {Object} result - Service result { success, data?, error?, message? }
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {number} options.successStatus - HTTP status for success (default: 200)
 * @param {string} options.dataKey - Key name for data in response (default: 'data')
 * @returns {Object} Express response
 */
function handleResult(result, res, options = {}) {
  const { successStatus = 200, dataKey = "data" } = options;

  if (result.success) {
    const response = {};
    if (result.data !== undefined) {
      response[dataKey] = result.data;
    }
    if (result.message) {
      response.message = result.message;
    }
    return res.status(successStatus).json(response);
  }

  // Throw HTTP error based on error code
  const errorFactory = ERROR_MAP[result.error];
  if (errorFactory) {
    throw errorFactory(result.message);
  }

  // Fallback to internal error
  throw errors.internal(result.message || "Unknown error");
}

/**
 * Create a standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} options - Response options
 */
function success(res, data, options = {}) {
  const { status = 200, dataKey = "data", message } = options;
  const response = {};

  if (data !== undefined) {
    response[dataKey] = data;
  }
  if (message) {
    response.message = message;
  }

  return res.status(status).json(response);
}

/**
 * Create a standardized list response with pagination metadata
 * @param {Object} res - Express response object
 * @param {Array} items - List items
 * @param {Object} options - Response options
 */
function list(res, items, options = {}) {
  const { dataKey = "items", total, limit, offset } = options;
  const response = {
    [dataKey]: items,
  };

  if (total !== undefined) {
    response.total = total;
    response.limit = limit;
    response.offset = offset;
    response.hasMore = offset + items.length < total;
  }

  return res.json(response);
}

/**
 * Handle service result with DTO transformation
 * @param {Object} result - Service result { success, data?, error?, message? }
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Function} options.dto - DTO class with fromEntity method
 * @param {boolean} options.detail - Use detailed DTO (fromEntityDetail)
 * @param {number} options.successStatus - HTTP status for success (default: 200)
 * @param {string} options.dataKey - Key name for data in response (default: 'data')
 * @returns {Object} Express response
 */
function handleResultWithDTO(result, res, options = {}) {
  const {
    successStatus = 200,
    dataKey = "data",
    dto,
    dtoOptions = {},
  } = options;

  if (result.success) {
    const response = {};
    if (result.data !== undefined) {
      // Apply DTO transformation if provided
      if (dto && typeof dto.fromEntity === "function") {
        response[dataKey] = dto.fromEntity(result.data, dtoOptions);
      } else {
        response[dataKey] = result.data;
      }
    }
    if (result.message) {
      response.message = result.message;
    }
    return res.status(successStatus).json(response);
  }

  // Throw HTTP error based on error code
  const errorFactory = ERROR_MAP[result.error];
  if (errorFactory) {
    throw errorFactory(result.message);
  }

  // Fallback to internal error
  throw errors.internal(result.message || "Unknown error");
}

/**
 * Handle list service result with DTO transformation
 * @param {Object} result - Service result { success, data?, error?, message? }
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Function} options.dto - DTO class with fromEntities method
 * @param {string} options.dataKey - Key name for data in response (default: 'items')
 * @returns {Object} Express response
 */
function handleListWithDTO(result, res, options = {}) {
  const { dataKey = "items", dto, dtoOptions = {} } = options;

  if (result.success) {
    const items = result.data || [];
    const response = {};

    // Apply DTO transformation if provided
    if (dto && typeof dto.fromEntities === "function") {
      response[dataKey] = dto.fromEntities(items, dtoOptions);
    } else {
      response[dataKey] = items;
    }

    return res.json(response);
  }

  // Throw HTTP error based on error code
  const errorFactory = ERROR_MAP[result.error];
  if (errorFactory) {
    throw errorFactory(result.message);
  }

  throw errors.internal(result.message || "Unknown error");
}

module.exports = {
  ERROR_MAP,
  handleResult,
  handleResultWithDTO,
  handleListWithDTO,
  success,
  list,
};
