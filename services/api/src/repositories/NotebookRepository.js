/**
 * Notebook Repository
 * Data access layer for notebooks
 */

const { BaseRepository } = require("./BaseRepository");

class NotebookRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "notebooks");
  }

  /**
   * Find notebooks for a specific user
   * Admins see all, regular users see only their own
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Notebooks
   */
  async findForUser(user, options = {}) {
    if (user.role === "admin") {
      return this.findAll({ orderBy: "updated_at", order: "DESC", ...options });
    }

    return this.findAll({
      where: { owner_id: user.id },
      orderBy: "updated_at",
      order: "DESC",
      ...options,
    });
  }

  /**
   * Find notebooks by workspace
   * @param {number} workspaceId - Workspace ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Notebooks in workspace
   */
  async findByWorkspace(workspaceId, options = {}) {
    return this.findAll({
      where: { workspace_id: workspaceId },
      orderBy: "updated_at",
      order: "DESC",
      ...options,
    });
  }

  /**
   * Check if user owns the notebook
   * @param {number} notebookId - Notebook ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user owns notebook
   */
  async isOwner(notebookId, userId) {
    const notebook = await this.findById(notebookId);
    return notebook && notebook.owner_id === userId;
  }

  /**
   * Check if user can access the notebook
   * @param {number} notebookId - Notebook ID
   * @param {Object} user - Current user
   * @returns {Promise<boolean>} True if user can access
   */
  async canAccess(notebookId, user) {
    if (user.role === "admin") return true;
    return this.isOwner(notebookId, user.id);
  }

  /**
   * Get notebook with workspace info
   * @param {number} id - Notebook ID
   * @returns {Promise<Object|null>} Notebook with workspace
   */
  async findByIdWithWorkspace(id) {
    const query = `
      SELECT n.*, 
             w.name as workspace_name,
             w.owner_id as workspace_owner_id
      FROM notebooks n
      LEFT JOIN workspaces w ON n.workspace_id = w.id
      WHERE n.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update notebook content
   * @param {number} id - Notebook ID
   * @param {string} content - New content
   * @returns {Promise<Object|null>} Updated notebook
   */
  async updateContent(id, content) {
    return this.update(id, { content });
  }
}

module.exports = { NotebookRepository };
