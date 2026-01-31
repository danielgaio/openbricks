/**
 * Table Repository
 * Data access layer for data catalog tables
 */

const { BaseRepository } = require("./BaseRepository");

class TableRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "data_tables");
  }

  /**
   * Find tables visible to a user
   * Public tables + user's own tables (admins see all)
   * @param {Object|null} user - Current user (null for anonymous)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Tables
   */
  async findForUser(user, options = {}) {
    const { database, limit, offset } = options;

    if (!user) {
      // Anonymous users see only public tables
      return this.findAll({
        where: { is_public: true, ...(database && { database }) },
        orderBy: "created_at",
        order: "DESC",
        limit,
        offset,
      });
    }

    if (user.role === "admin") {
      return this.findAll({
        where: database ? { database } : {},
        orderBy: "created_at",
        order: "DESC",
        limit,
        offset,
      });
    }

    // Regular users see public tables + their own
    let query = `
      SELECT * FROM data_tables
      WHERE (is_public = true OR owner_id = $1)
    `;
    const params = [user.id];

    if (database) {
      params.push(database);
      query += ` AND database = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Find tables by database name
   * @param {string} database - Database name
   * @returns {Promise<Array>} Tables in database
   */
  async findByDatabase(database) {
    return this.findAll({
      where: { database },
      orderBy: "name",
      order: "ASC",
    });
  }

  /**
   * Find table by database and name
   * @param {string} database - Database name
   * @param {string} name - Table name
   * @returns {Promise<Object|null>} Table or null
   */
  async findByDatabaseAndName(database, name) {
    return this.findOne({ database, name });
  }

  /**
   * Check if user owns the table
   * @param {number} tableId - Table ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user owns table
   */
  async isOwner(tableId, userId) {
    const table = await this.findById(tableId);
    return table && table.owner_id === userId;
  }

  /**
   * Check if user can access the table
   * @param {number} tableId - Table ID
   * @param {Object} user - Current user
   * @returns {Promise<boolean>} True if user can access
   */
  async canAccess(tableId, user) {
    const table = await this.findById(tableId);
    if (!table) return false;
    if (table.is_public) return true;
    if (user.role === "admin") return true;
    return table.owner_id === user.id;
  }

  /**
   * Check if user can modify the table
   * @param {number} tableId - Table ID
   * @param {Object} user - Current user
   * @returns {Promise<boolean>} True if user can modify
   */
  async canModify(tableId, user) {
    if (user.role === "admin") return true;
    return this.isOwner(tableId, user.id);
  }

  /**
   * List distinct databases
   * @returns {Promise<Array<string>>} Database names
   */
  async listDatabases() {
    const query = `
      SELECT DISTINCT database 
      FROM data_tables 
      ORDER BY database ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map((r) => r.database);
  }

  /**
   * Update table schema
   * @param {number} id - Table ID
   * @param {Object} schemaDefinition - New schema
   * @returns {Promise<Object|null>} Updated table
   */
  async updateSchema(id, schemaDefinition) {
    return this.update(id, { schema_definition: schemaDefinition });
  }

  /**
   * Set table visibility
   * @param {number} id - Table ID
   * @param {boolean} isPublic - Public visibility
   * @returns {Promise<Object|null>} Updated table
   */
  async setVisibility(id, isPublic) {
    return this.update(id, { is_public: isPublic });
  }
}

module.exports = { TableRepository };
