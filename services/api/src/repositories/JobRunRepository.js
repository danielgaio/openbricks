/**
 * Job Run Repository
 * Data access layer for job execution tracking
 *
 * Tracks individual job runs with:
 * - Execution status and timing
 * - Error messages and output
 * - Duration calculation
 */

const { BaseRepository } = require("./BaseRepository");

class JobRunRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "job_runs");
  }

  /**
   * Create a new job run record
   * @param {Object} data - Run data
   * @returns {Promise<Object>} Created run
   */
  async create(data) {
    const query = `
      INSERT INTO job_runs (job_id, status, started_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      data.job_id,
      data.status || "running",
    ]);
    return result.rows[0];
  }

  /**
   * Find runs for a specific job
   * @param {number} jobId - Job ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Job runs
   */
  async findByJobId(jobId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    const query = `
      SELECT * FROM job_runs
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [jobId, limit, offset]);
    return result.rows;
  }

  /**
   * Get the latest run for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object|null>} Latest run or null
   */
  async findLatestByJobId(jobId) {
    const query = `
      SELECT * FROM job_runs
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [jobId]);
    return result.rows[0] || null;
  }

  /**
   * Complete a job run successfully
   * @param {number} id - Run ID
   * @param {string} output - Optional output/logs
   * @returns {Promise<Object>} Updated run
   */
  async complete(id, output = null) {
    const query = `
      UPDATE job_runs
      SET status = 'completed',
          ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
          output = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, output]);
    return result.rows[0];
  }

  /**
   * Mark a job run as failed
   * @param {number} id - Run ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Updated run
   */
  async fail(id, errorMessage) {
    const query = `
      UPDATE job_runs
      SET status = 'failed',
          ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
          error_message = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, errorMessage]);
    return result.rows[0];
  }

  /**
   * Mark a job run as cancelled
   * @param {number} id - Run ID
   * @returns {Promise<Object>} Updated run
   */
  async cancel(id) {
    const query = `
      UPDATE job_runs
      SET status = 'cancelled',
          ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find currently running job runs
   * @returns {Promise<Array>} Running job runs
   */
  async findRunning() {
    const query = `
      SELECT jr.*, j.name as job_name, j.notebook_id
      FROM job_runs jr
      JOIN jobs j ON jr.job_id = j.id
      WHERE jr.status = 'running'
      ORDER BY jr.started_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get run statistics for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Statistics
   */
  async getStatsByJobId(jobId) {
    const query = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_runs,
        AVG(duration_seconds) FILTER (WHERE status = 'completed') as avg_duration,
        MAX(started_at) as last_run_at
      FROM job_runs
      WHERE job_id = $1
    `;
    const result = await this.pool.query(query, [jobId]);
    const stats = result.rows[0];

    return {
      total_runs: parseInt(stats.total_runs) || 0,
      successful_runs: parseInt(stats.successful_runs) || 0,
      failed_runs: parseInt(stats.failed_runs) || 0,
      cancelled_runs: parseInt(stats.cancelled_runs) || 0,
      avg_duration_seconds: stats.avg_duration
        ? Math.round(parseFloat(stats.avg_duration))
        : null,
      last_run_at: stats.last_run_at,
      success_rate:
        stats.total_runs > 0
          ? Math.round(
              (parseInt(stats.successful_runs) / parseInt(stats.total_runs)) *
                100,
            )
          : null,
    };
  }

  /**
   * Cleanup old job runs (retention policy)
   * @param {number} daysToKeep - Number of days to retain
   * @returns {Promise<number>} Number of deleted runs
   */
  async cleanup(daysToKeep = 30) {
    const query = `
      DELETE FROM job_runs
      WHERE started_at < NOW() - INTERVAL '1 day' * $1
      RETURNING id
    `;
    const result = await this.pool.query(query, [daysToKeep]);
    return result.rowCount;
  }
}

module.exports = { JobRunRepository };
