/**
 * Table Service
 * Business logic for data catalog management
 */

const { BaseService } = require("./BaseService");

// Supported table formats
const SUPPORTED_FORMATS = ["delta", "parquet", "iceberg", "hudi", "csv", "json"];

/**
 * TableService handles all data catalog business logic
 */
class TableService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.tables = repositories.tables;
  }

  /**
   * List tables for a user
   * Public tables visible to all, private to owners/admins
   * @param {Object|null} user - Current user (optional for public tables)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Result with tables
   */
  async list(user, options = {}) {
    const { database, limit, offset } = options;

    const tables = await this.tables.findForUser(user, { database, limit, offset });
    return { success: true, data: tables };
  }

  /**
   * List all databases
   * @returns {Promise<Object>} Result with database names
   */
  async listDatabases() {
    const databases = await this.tables.listDatabases();
    return { success: true, data: databases };
  }

  /**
   * Get table by ID
   * @param {number} id - Table ID
   * @param {Object|null} user - Current user (optional for public tables)
   * @returns {Promise<Object>} Table
   */
  async getById(id, user) {
    const table = await this.tables.findById(id);

    if (!table) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Check access for private tables
    if (!table.is_public) {
      if (!user) {
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required for private tables" };
      }
      if (!this.canAccess(table, user)) {
        return { success: false, error: "FORBIDDEN" };
      }
    }

    return { success: true, data: table };
  }

  /**
   * Create a new table in the catalog
   * @param {Object} data - Table data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created table
   */
  async create(data, user) {
    const {
      name,
      database = "default",
      format = "delta",
      location,
      schema_definition,
      is_public = false,
    } = data;

    // Validate table format
    if (!SUPPORTED_FORMATS.includes(format)) {
      return {
        success: false,
        error: "VALIDATION",
        message: `Unsupported format. Valid formats: ${SUPPORTED_FORMATS.join(", ")}`,
      };
    }

    // Check for duplicate
    const existing = await this.tables.findByDatabaseAndName(database, name);
    if (existing) {
      return {
        success: false,
        error: "DUPLICATE",
        message: `Table ${database}.${name} already exists`,
      };
    }

    // Validate schema definition if provided
    if (schema_definition && !this.isValidSchema(schema_definition)) {
      return {
        success: false,
        error: "VALIDATION",
        message: "Invalid schema definition format",
      };
    }

    // Generate default location
    const tableLocation = location || `s3a://openbricks-data/${database}/${name}`;

    const table = await this.tables.create({
      name,
      database,
      format,
      location: tableLocation,
      schema_definition,
      is_public,
      owner_id: user.id,
    });

    this.emit("table.created", {
      tableId: table.id,
      userId: user.id,
      database,
      tableName: name,
      format,
    });

    return { success: true, data: table };
  }

  /**
   * Update table metadata
   * @param {number} id - Table ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated table
   */
  async update(id, data, user) {
    const existing = await this.tables.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Validate schema if provided
    if (data.schema_definition && !this.isValidSchema(data.schema_definition)) {
      return {
        success: false,
        error: "VALIDATION",
        message: "Invalid schema definition format",
      };
    }

    // Build update object
    const updates = {};
    if (data.schema_definition !== undefined) updates.schema_definition = data.schema_definition;
    if (data.is_public !== undefined) updates.is_public = data.is_public;

    const table = await this.tables.update(id, updates);

    this.emit("table.updated", {
      tableId: id,
      userId: user.id,
      changes: Object.keys(updates),
    });

    return { success: true, data: table };
  }

  /**
   * Update table schema
   * @param {number} id - Table ID
   * @param {Object} schemaDefinition - New schema
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated table
   */
  async updateSchema(id, schemaDefinition, user) {
    const existing = await this.tables.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    if (!this.isValidSchema(schemaDefinition)) {
      return { success: false, error: "VALIDATION", message: "Invalid schema format" };
    }

    const table = await this.tables.updateSchema(id, schemaDefinition);

    this.emit("table.schema_updated", {
      tableId: id,
      userId: user.id,
    });

    return { success: true, data: table };
  }

  /**
   * Set table visibility
   * @param {number} id - Table ID
   * @param {boolean} isPublic - New visibility
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated table
   */
  async setVisibility(id, isPublic, user) {
    const existing = await this.tables.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    const table = await this.tables.setVisibility(id, isPublic);

    this.emit("table.visibility_changed", {
      tableId: id,
      userId: user.id,
      isPublic,
    });

    return { success: true, data: table };
  }

  /**
   * Delete table from catalog
   * @param {number} id - Table ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Result
   */
  async delete(id, user) {
    const existing = await this.tables.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    await this.tables.delete(id);

    this.emit("table.deleted", {
      tableId: id,
      userId: user.id,
      database: existing.database,
      tableName: existing.name,
    });

    return { success: true };
  }

  /**
   * Validate schema definition structure
   * @param {Object} schema - Schema definition
   * @returns {boolean}
   */
  isValidSchema(schema) {
    if (!schema || typeof schema !== "object") {
      return false;
    }

    // Schema should have fields array
    if (!Array.isArray(schema.fields)) {
      return false;
    }

    // Each field should have name and type
    return schema.fields.every(
      (field) =>
        typeof field.name === "string" &&
        typeof field.type === "string" &&
        field.name.length > 0
    );
  }
}

module.exports = { TableService };
