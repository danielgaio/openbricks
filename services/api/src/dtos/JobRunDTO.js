/**
 * Job Run Data Transfer Objects
 * Transforms JobRun domain entities to API representations
 */

/**
 * Job run status display mapping
 */
const STATUS_DISPLAY = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Basic job run representation
 * Used in lists and details
 */
class JobRunDTO {
  /**
   * Transform a job run entity to API representation
   * @param {Object} run - Domain job run entity
   * @param {Object} options - Transformation options
   * @returns {Object} Job run representation
   */
  static fromEntity(run, options = {}) {
    if (!run) return null;

    const dto = {
      id: run.id,
      job_id: run.job_id,
      status: run.status,
      status_display: STATUS_DISPLAY[run.status] || run.status,
      started_at: run.started_at,
      ended_at: run.ended_at || null,
      duration_seconds: run.duration_seconds || null,
      duration_display: run.duration_seconds
        ? JobRunDTO.formatDuration(run.duration_seconds)
        : null,
    };

    // Include error message only if failed
    if (run.status === "failed" && run.error_message) {
      dto.error_message = run.error_message;
    }

    // Include output if requested and available
    if (options.includeOutput && run.output) {
      dto.output = run.output;
    }

    // Include job info if joined
    if (run.job_name) {
      dto.job_name = run.job_name;
    }
    if (run.notebook_id) {
      dto.notebook_id = run.notebook_id;
    }

    return dto;
  }

  /**
   * Transform multiple job runs to API representations
   * @param {Array} runs - Array of domain entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of job run representations
   */
  static fromEntities(runs, options = {}) {
    if (!runs || !Array.isArray(runs)) return [];
    return runs.map((run) => JobRunDTO.fromEntity(run, options));
  }

  /**
   * Format duration in human-readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  static formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Job run statistics representation
 * Used for job dashboard/analytics
 */
class JobRunStatsDTO {
  /**
   * Transform job run statistics to API representation
   * @param {Object} stats - Statistics from repository
   * @returns {Object} Stats representation
   */
  static fromEntity(stats) {
    if (!stats) return null;

    return {
      total_runs: stats.total_runs || 0,
      successful_runs: stats.successful_runs || 0,
      failed_runs: stats.failed_runs || 0,
      cancelled_runs: stats.cancelled_runs || 0,
      success_rate:
        stats.success_rate !== null ? `${stats.success_rate}%` : null,
      success_rate_value: stats.success_rate || null,
      avg_duration_seconds: stats.avg_duration_seconds || null,
      avg_duration_display: stats.avg_duration_seconds
        ? JobRunDTO.formatDuration(stats.avg_duration_seconds)
        : null,
      last_run_at: stats.last_run_at || null,
    };
  }
}

module.exports = { JobRunDTO, JobRunStatsDTO };
