/**
 * Base Repository
 * Provides common CRUD operations for all domain entities
 * Implements Repository Pattern for data access abstraction
 */

/**
 * BaseRepository class
 * Abstract base for all domain repositories
 */
class BaseRepository {
  /**
   * @param {import('pg').Pool} pool - PostgreSQL connection pool
   * @param {string} tableName - Database table name
   * @param {Object} options - Repository options
   */
  constructor(pool, tableName, options = {}) {
    this.pool = pool;
    this.tableName = tableName;
    this.primaryKey = options.primaryKey || "id";
    this.softDelete = options.softDelete || false;
  }

  /**
   * Find all records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    const {
      where = {},
      orderBy = "created_at",
      order = "DESC",
      limit,
      offset,
    } = options;

    const { clause, params } = this._buildWhereClause(where);
    let query = `SELECT * FROM ${this.tableName}`;

    if (clause) {
      query += ` WHERE ${clause}`;
    }

    query += ` ORDER BY ${orderBy} ${order}`;

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
   * Find a single record by ID
   * @param {number|string} id - Record ID
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a single record matching conditions
   * @param {Object} where - WHERE conditions
   * @returns {Promise<Object|null>} Found record or null
   */
  async findOne(where) {
    const { clause, params } = this._buildWhereClause(where);
    const query = `SELECT * FROM ${this.tableName} WHERE ${clause} LIMIT 1`;
    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {number|string} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      return this.findById(id);
    }

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
    values.push(id);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${this.primaryKey} = $${values.length}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   * @param {number|string} id - Record ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Count records with optional filtering
   * @param {Object} where - WHERE conditions
   * @returns {Promise<number>} Count of records
   */
  async count(where = {}) {
    const { clause, params } = this._buildWhereClause(where);
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    if (clause) {
      query += ` WHERE ${clause}`;
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if a record exists
   * @param {Object} where - WHERE conditions
   * @returns {Promise<boolean>} True if exists
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Execute a raw query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(query, params = []) {
    return this.pool.query(query, params);
  }

  /**
   * Execute operations within a transaction
   * @param {Function} callback - Async function receiving client
   * @returns {Promise<*>} Transaction result
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause from conditions object
   * @private
   */
  _buildWhereClause(conditions) {
    const entries = Object.entries(conditions);
    if (entries.length === 0) {
      return { clause: "", params: [] };
    }

    const clauses = [];
    const params = [];

    entries.forEach(([key, value]) => {
      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        // Handle IN clause
        const placeholders = value.map((_, i) => `$${params.length + i + 1}`);
        clauses.push(`${key} IN (${placeholders.join(", ")})`);
        params.push(...value);
      } else if (typeof value === "object" && value !== null) {
        // Handle operators like { gt: 5, lt: 10 }
        Object.entries(value).forEach(([op, val]) => {
          params.push(val);
          const operators = {
            eq: "=",
            ne: "<>",
            gt: ">",
            gte: ">=",
            lt: "<",
            lte: "<=",
            like: "LIKE",
            ilike: "ILIKE",
          };
          clauses.push(`${key} ${operators[op] || "="} $${params.length}`);
        });
      } else {
        params.push(value);
        clauses.push(`${key} = $${params.length}`);
      }
    });

    return { clause: clauses.join(" AND "), params };
  }
}

module.exports = { BaseRepository };
