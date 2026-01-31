/**
 * Job Data Transfer Objects
 * Transforms Job domain entities to API representations
 */

const { UserDTO } = require("./UserDTO");

/**
 * Job status display mapping
 */
const STATUS_DISPLAY = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Basic job representation
 * Use in lists
 */
class JobDTO {
  /**
   * @param {Object} job - Domain job entity
   * @param {Object} options - Transformation options
   * @returns {Object} Job representation
   */
  static fromEntity(job, options = {}) {
    if (!job) return null;

    const dto = {
      id: job.id,
      name: job.name,
      notebook_id: job.notebook_id,
      status: job.status,
      status_display: STATUS_DISPLAY[job.status] || job.status,
      schedule: job.schedule || null,
      last_run_at: job.last_run_at || null,
      next_run_at: job.next_run_at || null,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };

    // Include owner info if requested
    if (options.includeOwner && job.owner) {
      dto.owner = UserDTO.fromEntity(job.owner);
    } else if (job.owner_id) {
      dto.owner_id = job.owner_id;
    }

    return dto;
  }

  /**
   * Transform array of jobs
   * @param {Array} jobs - Array of job entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of job DTOs
   */
  static fromEntities(jobs, options = {}) {
    return (jobs || []).map((job) => JobDTO.fromEntity(job, options));
  }
}

/**
 * Detailed job representation
 * Includes notebook info and run history
 */
class JobDetailDTO extends JobDTO {
  static fromEntity(job, options = {}) {
    if (!job) return null;

    const base = JobDTO.fromEntity(job, options);

    const dto = {
      ...base,
    };

    // Include notebook info if available
    if (job.notebook) {
      dto.notebook = {
        id: job.notebook.id,
        name: job.notebook.name,
        language: job.notebook.language,
      };
    }

    // Include recent runs if available
    if (job.runs) {
      dto.recent_runs = job.runs.map((run) => JobRunDTO.fromEntity(run));
      dto.runs_count = job.runs.length;
    }

    return dto;
  }
}

/**
 * Job run representation
 */
class JobRunDTO {
  static fromEntity(run) {
    if (!run) return null;

    return {
      id: run.id,
      status: run.status,
      started_at: run.started_at,
      ended_at: run.ended_at || null,
      duration_seconds: run.duration_seconds || null,
      error_message: run.error_message || null,
    };
  }

  static fromEntities(runs) {
    return (runs || []).map((run) => JobRunDTO.fromEntity(run));
  }
}

/**
 * Jobs list response DTO
 */
class JobsListDTO {
  static fromEntities(jobs, options = {}) {
    const { total, limit, offset, includeOwner } = options;

    return {
      jobs: JobDTO.fromEntities(jobs, { includeOwner }),
      pagination: {
        total: total || jobs.length,
        limit: limit || jobs.length,
        offset: offset || 0,
      },
    };
  }
}

module.exports = {
  JobDTO,
  JobDetailDTO,
  JobsListDTO,
  JobRunDTO,
};
