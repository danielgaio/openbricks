/**
 * Audit Service
 * Business logic for audit logging
 */

const { BaseService } = require("./BaseService");

/**
 * AuditService handles audit log creation and retrieval
 */
class AuditService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.pool = options.pool;
  }

  /**
   * Log an audit event
   * @param {Object} event - Audit event data
   * @returns {Promise<Object>} Created log entry
   */
  async log(event) {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      details = {},
      ipAddress = null,
    } = event;

    try {
      const result = await this.pool.query(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, resource_id, details, ip_address) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          JSON.stringify(details),
          ipAddress,
        ],
      );

      return { success: true, data: result.rows[0] };
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error("Audit log failed:", error);
      return { success: false, error: "INTERNAL" };
    }
  }

  /**
   * Get audit logs with filtering
   * @param {Object} filters - Query filters
   * @param {Object} user - Current user (must be admin)
   * @returns {Promise<Object>} Audit logs
   */
  async getLogs(filters = {}, user) {
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can view audit logs",
      };
    }

    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters;

    let query = `
      SELECT al.*, u.email as user_email, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    if (resourceType) {
      query += ` AND al.resource_type = $${paramIndex++}`;
      params.push(resourceType);
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return { success: true, data: result.rows };
  }

  /**
   * Get audit logs for a specific resource
   * @param {string} resourceType - Resource type
   * @param {number} resourceId - Resource ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Audit logs
   */
  async getResourceLogs(resourceType, resourceId, user) {
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can view audit logs",
      };
    }

    const result = await this.pool.query(
      `SELECT al.*, u.email as user_email, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.resource_type = $1 AND al.resource_id = $2
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [resourceType, resourceId],
    );

    return { success: true, data: result.rows };
  }

  /**
   * Get user activity summary
   * @param {number} targetUserId - User to get activity for
   * @param {Object} user - Current user (admin or same user)
   * @returns {Promise<Object>} Activity summary
   */
  async getUserActivity(targetUserId, user) {
    // Users can see their own activity, admins can see anyone's
    if (!this.isAdmin(user) && user.id !== targetUserId) {
      return { success: false, error: "FORBIDDEN" };
    }

    const result = await this.pool.query(
      `SELECT 
         action,
         resource_type,
         COUNT(*) as count,
         MAX(created_at) as last_occurrence
       FROM audit_logs
       WHERE user_id = $1
       GROUP BY action, resource_type
       ORDER BY count DESC`,
      [targetUserId],
    );

    return { success: true, data: result.rows };
  }
}

module.exports = { AuditService };
