/**
 * Job Repository
 * Data access layer for scheduled jobs
 */

const { BaseRepository } = require("./BaseRepository");

class JobRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "jobs");
  }

  /**
   * Find jobs for a specific user
   * Admins see all, regular users see jobs for their notebooks
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Jobs
   */
  async findForUser(user, options = {}) {
    if (user.role === "admin") {
      return this.findAll({ orderBy: "created_at", order: "DESC", ...options });
    }

    // Users see jobs associated with their notebooks
    const query = `
      SELECT j.* FROM jobs j
      JOIN notebooks n ON j.notebook_id = n.id
      WHERE n.owner_id = $1
      ORDER BY j.created_at DESC
    `;
    const result = await this.pool.query(query, [user.id]);
    return result.rows;
  }

  /**
   * Find jobs by notebook
   * @param {number} notebookId - Notebook ID
   * @returns {Promise<Array>} Jobs for notebook
   */
  async findByNotebook(notebookId) {
    return this.findAll({
      where: { notebook_id: notebookId },
      orderBy: "created_at",
      order: "DESC",
    });
  }

  /**
   * Find jobs by status
   * @param {string} status - Job status
   * @returns {Promise<Array>} Jobs with status
   */
  async findByStatus(status) {
    return this.findAll({
      where: { status },
      orderBy: "created_at",
      order: "ASC",
    });
  }

  /**
   * Get pending jobs ready for execution
   * @returns {Promise<Array>} Pending jobs
   */
  async findPendingJobs() {
    const query = `
      SELECT j.*, n.content as notebook_content, n.language
      FROM jobs j
      JOIN notebooks n ON j.notebook_id = n.id
      WHERE j.status = 'pending'
        AND (j.next_run_at IS NULL OR j.next_run_at <= NOW())
      ORDER BY j.created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Update job status
   * @param {number} id - Job ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated job
   */
  async updateStatus(id, status) {
    const updates = { status };
    if (status === "running") {
      updates.last_run_at = new Date();
    }
    return this.update(id, updates);
  }

  /**
   * Check if user can access the job
   * @param {number} jobId - Job ID
   * @param {Object} user - Current user
   * @returns {Promise<boolean>} True if user can access
   */
  async canAccess(jobId, user) {
    if (user.role === "admin") return true;

    const query = `
      SELECT j.id FROM jobs j
      JOIN notebooks n ON j.notebook_id = n.id
      WHERE j.id = $1 AND (j.owner_id = $2 OR n.owner_id = $2)
    `;
    const result = await this.pool.query(query, [jobId, user.id]);
    return result.rows.length > 0;
  }

  /**
   * Get job with notebook info
   * @param {number} id - Job ID
   * @returns {Promise<Object|null>} Job with notebook
   */
  async findByIdWithNotebook(id) {
    const query = `
      SELECT j.*, 
             n.name as notebook_name,
             n.owner_id as notebook_owner_id,
             n.language
      FROM jobs j
      LEFT JOIN notebooks n ON j.notebook_id = n.id
      WHERE j.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = { JobRepository };
