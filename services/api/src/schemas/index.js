/**
 * Validation Schemas
 * Defines validation rules for all API resources
 * Follows single responsibility - one file per domain concern
 */

const { common, validate, body } = require("../utils/validation");

/**
 * Workspace validation schemas
 */
const workspaces = {
  create: validate([
    common.requiredString("name", { min: 1, max: 100 }),
    common.optionalString("description", { max: 500 }),
  ]),

  update: validate([
    common.idParam("id"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    common.optionalString("description", { max: 500 }),
  ]),

  getById: validate([common.idParam("id")]),
};

/**
 * Notebook validation schemas
 */
const notebooks = {
  create: validate([
    common.requiredString("name", { min: 1, max: 100 }),
    common.optionalInt("workspace_id"),
    body("language")
      .optional()
      .isIn(["python", "sql", "scala", "r"])
      .withMessage("Language must be one of: python, sql, scala, r"),
    common.optionalString("content", { max: 1000000 }), // 1MB max for notebook content
  ]),

  update: validate([
    common.idParam("id"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    common.optionalInt("workspace_id"),
    body("language")
      .optional()
      .isIn(["python", "sql", "scala", "r"])
      .withMessage("Language must be one of: python, sql, scala, r"),
    common.optionalString("content", { max: 1000000 }),
  ]),

  getById: validate([common.idParam("id")]),
};

/**
 * Job validation schemas
 */
const jobs = {
  create: validate([
    common.requiredString("name", { min: 1, max: 100 }),
    common.requiredInt("notebook_id"),
    body("schedule")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Schedule must not exceed 100 characters")
      .matches(
        /^(@(annually|yearly|monthly|weekly|daily|hourly))|(((\d+,)*\d+|(\d+(\/|-)\d+)|\d+|\*)\s*){5,6}$/,
      )
      .withMessage("Schedule must be a valid cron expression or preset"),
  ]),

  update: validate([
    common.idParam("id"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("schedule")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Schedule must not exceed 100 characters"),
    body("status")
      .optional()
      .isIn(["pending", "running", "completed", "failed", "cancelled"])
      .withMessage("Invalid status"),
  ]),

  getById: validate([common.idParam("id")]),
};

/**
 * Cluster validation schemas
 */
const clusters = {
  create: validate([
    common.requiredString("name", { min: 1, max: 100 }),
    body("node_type")
      .optional()
      .isIn(["small", "standard", "large", "xlarge"])
      .withMessage("Node type must be one of: small, standard, large, xlarge"),
    body("num_workers")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Number of workers must be between 1 and 100")
      .toInt(),
    body("driver_memory")
      .optional()
      .matches(/^\d+[gmGM]$/)
      .withMessage("Driver memory must be in format like 2g or 4G"),
    body("executor_memory")
      .optional()
      .matches(/^\d+[gmGM]$/)
      .withMessage("Executor memory must be in format like 2g or 4G"),
    body("spark_version")
      .optional()
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage("Spark version must be in format like 3.5.0"),
  ]),

  update: validate([
    common.idParam("id"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("status")
      .optional()
      .isIn([
        "pending",
        "starting",
        "running",
        "stopping",
        "terminated",
        "error",
      ])
      .withMessage("Invalid status"),
    body("num_workers")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Number of workers must be between 1 and 100")
      .toInt(),
  ]),

  getById: validate([common.idParam("id")]),
};

/**
 * Data tables validation schemas
 */
const tables = {
  create: validate([
    common.requiredString("name", { min: 1, max: 100 }),
    body("database")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Database name must not exceed 100 characters")
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .withMessage("Database name must be a valid identifier"),
    body("format")
      .optional()
      .isIn(["delta", "parquet", "csv", "json", "orc", "avro"])
      .withMessage(
        "Format must be one of: delta, parquet, csv, json, orc, avro",
      ),
    common.optionalString("location", { max: 500 }),
    body("schema_definition")
      .optional()
      .isObject()
      .withMessage("Schema definition must be an object"),
    body("is_public")
      .optional()
      .isBoolean()
      .withMessage("is_public must be a boolean"),
  ]),

  getById: validate([common.idParam("id")]),

  list: validate([
    ...common.pagination(),
    body("database")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Database filter must not exceed 100 characters"),
  ]),
};

/**
 * User profile validation
 */
const users = {
  updateProfile: validate([
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("email")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
  ]),

  changePassword: validate([
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
  ]),
};

module.exports = {
  workspaces,
  notebooks,
  jobs,
  clusters,
  tables,
  users,
};
