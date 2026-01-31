/**
 * Cluster Data Transfer Objects
 * Transforms Cluster domain entities to API representations
 */

const { UserDTO } = require("./UserDTO");

/**
 * Cluster status display with additional context
 */
const STATUS_CONFIG = {
  pending: { display: "Pending", canStart: true, canStop: false },
  starting: { display: "Starting", canStart: false, canStop: true },
  running: { display: "Running", canStart: false, canStop: true },
  stopping: { display: "Stopping", canStart: false, canStop: false },
  terminated: { display: "Terminated", canStart: true, canStop: false },
  error: { display: "Error", canStart: true, canStop: false },
};

/**
 * Basic cluster representation
 * Use in lists
 */
class ClusterDTO {
  /**
   * @param {Object} cluster - Domain cluster entity
   * @param {Object} options - Transformation options
   * @returns {Object} Cluster representation
   */
  static fromEntity(cluster, options = {}) {
    if (!cluster) return null;

    const statusConfig = STATUS_CONFIG[cluster.status] || {
      display: cluster.status,
      canStart: false,
      canStop: false,
    };

    const dto = {
      id: cluster.id,
      name: cluster.name,
      status: cluster.status,
      status_display: statusConfig.display,
      node_type: cluster.node_type || "standard",
      num_workers: cluster.num_workers || 1,
      spark_version: cluster.spark_version || "3.5.0",
      created_at: cluster.created_at,
      updated_at: cluster.updated_at,
    };

    // Include action hints
    dto.actions = {
      can_start: statusConfig.canStart,
      can_stop: statusConfig.canStop,
      can_scale: cluster.status === "running",
    };

    // Include owner info if requested
    if (options.includeOwner && cluster.owner) {
      dto.owner = UserDTO.fromEntity(cluster.owner);
    } else if (cluster.owner_id) {
      dto.owner_id = cluster.owner_id;
    }

    return dto;
  }

  /**
   * Transform array of clusters
   * @param {Array} clusters - Array of cluster entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of cluster DTOs
   */
  static fromEntities(clusters, options = {}) {
    return (clusters || []).map((c) => ClusterDTO.fromEntity(c, options));
  }
}

/**
 * Detailed cluster representation
 * Includes configuration and runtime details
 */
class ClusterDetailDTO extends ClusterDTO {
  static fromEntity(cluster, options = {}) {
    if (!cluster) return null;

    const base = ClusterDTO.fromEntity(cluster, options);

    const dto = {
      ...base,
      driver_memory: cluster.driver_memory || "2g",
      executor_memory: cluster.executor_memory || "2g",
      started_at: cluster.started_at || null,
      terminated_at: cluster.terminated_at || null,
    };

    // Calculate runtime if running
    if (cluster.status === "running" && cluster.started_at) {
      const startTime = new Date(cluster.started_at);
      const now = new Date();
      dto.runtime_seconds = Math.floor((now - startTime) / 1000);
    }

    return dto;
  }
}

/**
 * Clusters list response DTO
 */
class ClustersListDTO {
  static fromEntities(clusters, options = {}) {
    const { total, limit, offset, includeOwner } = options;

    // Calculate summary stats
    const runningCount = clusters.filter((c) => c.status === "running").length;

    return {
      clusters: ClusterDTO.fromEntities(clusters, { includeOwner }),
      summary: {
        total: total || clusters.length,
        running: runningCount,
        terminated: clusters.length - runningCount,
      },
      pagination: {
        total: total || clusters.length,
        limit: limit || clusters.length,
        offset: offset || 0,
      },
    };
  }
}

module.exports = {
  ClusterDTO,
  ClusterDetailDTO,
  ClustersListDTO,
};
