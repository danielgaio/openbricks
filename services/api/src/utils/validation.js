/**
 * Validation Utilities
 * Centralized input validation using express-validator
 * Follows DRY principle with reusable validation chains
 */

const { body, param, query, validationResult } = require("express-validator");

/**
 * Common validation error messages
 */
const messages = {
  required: (field) => `${field} is required`,
  string: (field) => `${field} must be a string`,
  integer: (field) => `${field} must be an integer`,
  positive: (field) => `${field} must be a positive number`,
  email: "Must be a valid email address",
  minLength: (field, min) => `${field} must be at least ${min} characters`,
  maxLength: (field, max) => `${field} must not exceed ${max} characters`,
  enum: (field, values) => `${field} must be one of: ${values.join(", ")}`,
};

/**
 * Common validation chains - reusable building blocks
 */
const common = {
  /**
   * Validate required string field
   */
  requiredString: (field, { min = 1, max = 255 } = {}) =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(messages.required(field))
      .isString()
      .withMessage(messages.string(field))
      .isLength({ min })
      .withMessage(messages.minLength(field, min))
      .isLength({ max })
      .withMessage(messages.maxLength(field, max)),

  /**
   * Validate optional string field
   */
  optionalString: (field, { max = 1000 } = {}) =>
    body(field)
      .optional({ nullable: true })
      .trim()
      .isString()
      .withMessage(messages.string(field))
      .isLength({ max })
      .withMessage(messages.maxLength(field, max)),

  /**
   * Validate required integer
   */
  requiredInt: (field) =>
    body(field)
      .notEmpty()
      .withMessage(messages.required(field))
      .isInt()
      .withMessage(messages.integer(field))
      .toInt(),

  /**
   * Validate optional integer
   */
  optionalInt: (field) =>
    body(field)
      .optional({ nullable: true })
      .isInt()
      .withMessage(messages.integer(field))
      .toInt(),

  /**
   * Validate positive integer
   */
  positiveInt: (field) =>
    body(field)
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage(messages.positive(field))
      .toInt(),

  /**
   * Validate ID parameter
   */
  idParam: (paramName = "id") =>
    param(paramName)
      .isInt({ min: 1 })
      .withMessage(`Invalid ${paramName}`)
      .toInt(),

  /**
   * Validate enum field
   */
  enumField: (field, allowedValues, required = true) => {
    const chain = body(field)
      .isIn(allowedValues)
      .withMessage(messages.enum(field, allowedValues));
    return required
      ? chain.notEmpty().withMessage(messages.required(field))
      : chain.optional();
  },

  /**
   * Pagination query params
   */
  pagination: () => [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer")
      .toInt(),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100")
      .toInt(),
  ],
};

/**
 * Middleware to handle validation results
 * Extracts errors and returns consistent error response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: formattedErrors,
    });
  }

  next();
};

/**
 * Create validation middleware from validation chains
 * Combines validators with error handling
 *
 * @param {Array} validators - Array of express-validator chains
 * @returns {Array} Middleware array with validators and error handler
 */
const validate = (validators) => [...validators, handleValidationErrors];

/**
 * Sanitize object - remove undefined and null values
 * Useful for building update objects
 */
const sanitizeObject = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null),
  );

module.exports = {
  common,
  messages,
  validate,
  handleValidationErrors,
  sanitizeObject,
  // Re-export express-validator for custom validators
  body,
  param,
  query,
  validationResult,
};
