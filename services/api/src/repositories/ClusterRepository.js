/**
 * Cluster Repository
 * Data access layer for compute clusters
 */

const { BaseRepository } = require("./BaseRepository");

class ClusterRepository extends BaseRepository {
  constructor(pool) {
    super(pool, "clusters");
  }

  /**
   * Find all clusters with optional status filter
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Clusters
   */
  async findAll(options = {}) {
    return super.findAll({
      orderBy: "created_at",
      order: "DESC",
      ...options,
    });
  }

  /**
   * Find clusters by status
   * @param {string} status - Cluster status
   * @returns {Promise<Array>} Clusters with status
   */
  async findByStatus(status) {
    return this.findAll({ where: { status } });
  }

  /**
   * Find running clusters
   * @returns {Promise<Array>} Running clusters
   */
  async findRunning() {
    return this.findByStatus("running");
  }

  /**
   * Update cluster status
   * @param {number} id - Cluster ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated cluster
   */
  async updateStatus(id, status) {
    const updates = { status };

    if (status === "running") {
      updates.started_at = new Date();
    } else if (status === "terminated") {
      updates.terminated_at = new Date();
    }

    return this.update(id, updates);
  }

  /**
   * Start a cluster
   * @param {number} id - Cluster ID
   * @returns {Promise<Object|null>} Updated cluster
   */
  async start(id) {
    return this.updateStatus(id, "starting");
  }

  /**
   * Stop a cluster
   * @param {number} id - Cluster ID
   * @returns {Promise<Object|null>} Updated cluster
   */
  async stop(id) {
    return this.updateStatus(id, "stopping");
  }

  /**
   * Terminate a cluster
   * @param {number} id - Cluster ID
   * @returns {Promise<Object|null>} Updated cluster
   */
  async terminate(id) {
    return this.updateStatus(id, "terminated");
  }

  /**
   * Scale cluster workers
   * @param {number} id - Cluster ID
   * @param {number} numWorkers - New worker count
   * @returns {Promise<Object|null>} Updated cluster
   */
  async scale(id, numWorkers) {
    return this.update(id, { num_workers: numWorkers });
  }

  /**
   * Get cluster utilization stats
   * @param {number} id - Cluster ID
   * @returns {Promise<Object|null>} Cluster with stats
   */
  async findByIdWithStats(id) {
    const query = `
      SELECT c.*,
             EXTRACT(EPOCH FROM (COALESCE(c.terminated_at, NOW()) - c.started_at)) as uptime_seconds
      FROM clusters c
      WHERE c.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = { ClusterRepository };
