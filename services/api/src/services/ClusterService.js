/**
 * Cluster Service
 * Business logic for Spark cluster management
 */

const { BaseService } = require("./BaseService");
const { DomainEvents } = require("../events");

// Valid cluster status transitions
const STATUS_TRANSITIONS = {
  terminated: ["starting", "pending"],
  pending: ["starting", "terminated"],
  starting: ["running", "error", "terminated"],
  running: ["stopping", "error"],
  stopping: ["terminated", "error"],
  error: ["terminated", "starting"],
};

// Cluster configuration defaults
const CLUSTER_DEFAULTS = {
  node_type: "standard",
  num_workers: 1,
  driver_memory: "2g",
  executor_memory: "2g",
  spark_version: "3.5.0",
};

// Valid node types and their configurations
const NODE_TYPES = {
  standard: { maxWorkers: 8, memoryOptions: ["1g", "2g", "4g"] },
  memory_optimized: { maxWorkers: 4, memoryOptions: ["4g", "8g", "16g"] },
  compute_optimized: { maxWorkers: 16, memoryOptions: ["2g", "4g", "8g"] },
};

/**
 * ClusterService handles all cluster-related business logic
 */
class ClusterService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.clusters = repositories.clusters;
  }

  /**
   * List all clusters
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Result with clusters
   */
  async list(user, options = {}) {
    const { status, limit, offset } = options;

    let clusters;
    if (status) {
      clusters = await this.clusters.findByStatus(status);
    } else {
      clusters = await this.clusters.findAll({ limit, offset });
    }

    return { success: true, data: clusters };
  }

  /**
   * Get cluster by ID with stats
   * @param {number} id - Cluster ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Cluster with stats
   */
  async getById(id, user) {
    const cluster = await this.clusters.findByIdWithStats(id);

    if (!cluster) {
      return { success: false, error: "NOT_FOUND" };
    }

    return { success: true, data: cluster };
  }

  /**
   * Create a new cluster (admin only)
   * @param {Object} data - Cluster configuration
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created cluster
   */
  async create(data, user) {
    // Only admins can create clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can create clusters",
      };
    }

    const config = { ...CLUSTER_DEFAULTS, ...data };
    const {
      name,
      node_type,
      num_workers,
      driver_memory,
      executor_memory,
      spark_version,
    } = config;

    // Validate node type
    if (!NODE_TYPES[node_type]) {
      return {
        success: false,
        error: "VALIDATION",
        message: `Invalid node type. Valid types: ${Object.keys(NODE_TYPES).join(", ")}`,
      };
    }

    // Validate worker count
    const nodeConfig = NODE_TYPES[node_type];
    if (num_workers < 1 || num_workers > nodeConfig.maxWorkers) {
      return {
        success: false,
        error: "VALIDATION",
        message: `Worker count must be between 1 and ${nodeConfig.maxWorkers} for ${node_type}`,
      };
    }

    const cluster = await this.clusters.create({
      name,
      node_type,
      num_workers,
      driver_memory,
      executor_memory,
      spark_version,
      status: "terminated",
      owner_id: user.id,
    });

    this.emit(DomainEvents.CLUSTER_CREATED, { cluster, userId: user.id });

    return { success: true, data: cluster };
  }

  /**
   * Update cluster configuration
   * @param {number} id - Cluster ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated cluster
   */
  async update(id, data, user) {
    // Only admins can update clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can update clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Cannot update running clusters (except for scaling)
    if (
      existing.status === "running" &&
      (data.node_type || data.spark_version)
    ) {
      return {
        success: false,
        error: "CONFLICT",
        message:
          "Cannot change node_type or spark_version on running cluster. Stop it first.",
      };
    }

    // Build update object
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.node_type !== undefined) updates.node_type = data.node_type;
    if (data.num_workers !== undefined) updates.num_workers = data.num_workers;
    if (data.driver_memory !== undefined)
      updates.driver_memory = data.driver_memory;
    if (data.executor_memory !== undefined)
      updates.executor_memory = data.executor_memory;

    const cluster = await this.clusters.update(id, updates);

    this.emit(DomainEvents.CLUSTER_UPDATED, {
      cluster,
      userId: user.id,
      changes: Object.keys(updates),
    });

    return { success: true, data: cluster };
  }

  /**
   * Start a cluster
   * @param {number} id - Cluster ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated cluster
   */
  async start(id, user) {
    // Only admins can start clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can start clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Validate status transition
    if (!this.canTransition(existing.status, "starting")) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot start cluster in '${existing.status}' state`,
      };
    }

    const cluster = await this.clusters.start(id);

    this.emit(DomainEvents.CLUSTER_STARTING, {
      cluster,
      userId: user.id,
      previousStatus: existing.status,
    });

    return { success: true, data: cluster, message: "Cluster starting" };
  }

  /**
   * Stop a cluster (graceful shutdown)
   * @param {number} id - Cluster ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated cluster
   */
  async stop(id, user) {
    // Only admins can stop clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can stop clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Validate status transition
    if (!this.canTransition(existing.status, "stopping")) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot stop cluster in '${existing.status}' state`,
      };
    }

    const cluster = await this.clusters.stop(id);

    this.emit(DomainEvents.CLUSTER_STOPPING, {
      cluster,
      userId: user.id,
      previousStatus: existing.status,
    });

    return { success: true, data: cluster, message: "Cluster stopping" };
  }

  /**
   * Terminate a cluster (immediate shutdown)
   * @param {number} id - Cluster ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated cluster
   */
  async terminate(id, user) {
    // Only admins can terminate clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can terminate clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Can terminate from most states except already terminated
    if (existing.status === "terminated") {
      return {
        success: false,
        error: "CONFLICT",
        message: "Cluster is already terminated",
      };
    }

    const cluster = await this.clusters.terminate(id);

    this.emit(DomainEvents.CLUSTER_TERMINATED, {
      cluster,
      userId: user.id,
      previousStatus: existing.status,
    });

    return { success: true, data: cluster, message: "Cluster terminated" };
  }

  /**
   * Scale cluster workers
   * @param {number} id - Cluster ID
   * @param {number} numWorkers - New worker count
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated cluster
   */
  async scale(id, numWorkers, user) {
    // Only admins can scale clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can scale clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Validate worker count for node type
    const nodeConfig = NODE_TYPES[existing.node_type];
    if (!nodeConfig) {
      return {
        success: false,
        error: "INTERNAL",
        message: "Invalid cluster node type",
      };
    }

    if (numWorkers < 1 || numWorkers > nodeConfig.maxWorkers) {
      return {
        success: false,
        error: "VALIDATION",
        message: `Worker count must be between 1 and ${nodeConfig.maxWorkers} for ${existing.node_type}`,
      };
    }

    const previousWorkers = existing.num_workers;
    const cluster = await this.clusters.scale(id, numWorkers);

    this.emit(DomainEvents.CLUSTER_SCALED, {
      cluster,
      userId: user.id,
      previousWorkers,
      newWorkers: numWorkers,
    });

    return {
      success: true,
      data: cluster,
      message: `Cluster scaled from ${previousWorkers} to ${numWorkers} workers`,
    };
  }

  /**
   * Delete cluster (must be terminated)
   * @param {number} id - Cluster ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Result
   */
  async delete(id, user) {
    // Only admins can delete clusters
    if (!this.isAdmin(user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Only admins can delete clusters",
      };
    }

    const existing = await this.clusters.findById(id);
    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    // Must be terminated to delete
    if (existing.status !== "terminated") {
      return {
        success: false,
        error: "CONFLICT",
        message:
          "Cannot delete cluster that is not terminated. Terminate it first.",
      };
    }

    await this.clusters.delete(id);

    this.emit(DomainEvents.CLUSTER_DELETED, { id, userId: user.id });

    return { success: true };
  }

  /**
   * Check if a status transition is valid
   * @param {string} from - Current status
   * @param {string} to - Target status
   * @returns {boolean}
   */
  canTransition(from, to) {
    const allowed = STATUS_TRANSITIONS[from];
    return allowed && allowed.includes(to);
  }
}

module.exports = { ClusterService };
