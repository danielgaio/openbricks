/**
 * Workspace Repository
 * Data access layer for workspaces
 */

const { BaseRepository } = require("./BaseRepository");

class WorkspaceRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "workspaces");
  }

  /**
   * Find workspaces for a specific user
   * Admins see all, regular users see only their own
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Workspaces
   */
  async findForUser(user, options = {}) {
    if (user.role === "admin") {
      return this.findAll({ orderBy: "created_at", order: "DESC", ...options });
    }

    return this.findAll({
      where: { owner_id: user.id },
      orderBy: "created_at",
      order: "DESC",
      ...options,
    });
  }

  /**
   * Check if user owns the workspace
   * @param {number} workspaceId - Workspace ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user owns workspace
   */
  async isOwner(workspaceId, userId) {
    const workspace = await this.findById(workspaceId);
    return workspace && workspace.owner_id === userId;
  }

  /**
   * Check if user can access the workspace
   * @param {number} workspaceId - Workspace ID
   * @param {Object} user - Current user
   * @returns {Promise<boolean>} True if user can access
   */
  async canAccess(workspaceId, user) {
    if (user.role === "admin") return true;
    return this.isOwner(workspaceId, user.id);
  }

  /**
   * Get workspace with notebook count
   * @param {number} id - Workspace ID
   * @returns {Promise<Object|null>} Workspace with stats
   */
  async findByIdWithStats(id) {
    const query = `
      SELECT w.*, 
             COUNT(n.id) as notebook_count
      FROM workspaces w
      LEFT JOIN notebooks n ON n.workspace_id = w.id
      WHERE w.id = $1
      GROUP BY w.id
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = { WorkspaceRepository };
