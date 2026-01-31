/**
 * Job Run Service
 * Business logic for job execution tracking
 *
 * Responsibilities:
 * - Track job execution attempts
 * - Calculate run statistics
 * - Manage run lifecycle (start, complete, fail, cancel)
 */

const { BaseService } = require("./BaseService");
const { DomainEvents: Events } = require("../events/DomainEvents");

class JobRunService extends BaseService {
  /**
   * @param {Object} repositories - Repository instances
   * @param {Object} options - Service options
   */
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.jobRunRepository = repositories.jobRuns;
    this.jobRepository = repositories.jobs;
  }

  /**
   * Start a new job run
   * Creates a run record when a job begins execution
   * @param {number} jobId - Job ID
   * @param {Object} metadata - Optional metadata (userId for audit)
   * @returns {Promise<Object>} Created run
   */
  async startRun(jobId, metadata = {}) {
    // Verify job exists
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const run = await this.jobRunRepository.create({
      job_id: jobId,
      status: "running",
    });

    await this.emit(
      Events.JOB_RUN_STARTED,
      {
        run_id: run.id,
        job_id: jobId,
        job_name: job.name,
        started_at: run.started_at,
      },
      metadata,
    );

    return run;
  }

  /**
   * Complete a job run successfully
   * @param {number} runId - Run ID
   * @param {string} output - Optional output/logs
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Updated run
   */
  async completeRun(runId, output = null, metadata = {}) {
    const run = await this.jobRunRepository.complete(runId, output);

    if (!run) {
      throw new Error("Run not found");
    }

    await this.emit(
      Events.JOB_RUN_COMPLETED,
      {
        run_id: run.id,
        job_id: run.job_id,
        duration_seconds: run.duration_seconds,
        ended_at: run.ended_at,
      },
      metadata,
    );

    // Update job's last_run_at
    await this.jobRepository.update(run.job_id, {
      last_run_at: run.ended_at,
    });

    return run;
  }

  /**
   * Mark a job run as failed
   * @param {number} runId - Run ID
   * @param {string} errorMessage - Error message
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Updated run
   */
  async failRun(runId, errorMessage, metadata = {}) {
    const run = await this.jobRunRepository.fail(runId, errorMessage);

    if (!run) {
      throw new Error("Run not found");
    }

    await this.emit(
      Events.JOB_RUN_FAILED,
      {
        run_id: run.id,
        job_id: run.job_id,
        error_message: errorMessage,
        duration_seconds: run.duration_seconds,
        ended_at: run.ended_at,
      },
      metadata,
    );

    // Update job's last_run_at even on failure
    await this.jobRepository.update(run.job_id, {
      last_run_at: run.ended_at,
    });

    return run;
  }

  /**
   * Cancel a job run
   * @param {number} runId - Run ID
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Updated run
   */
  async cancelRun(runId, metadata = {}) {
    const run = await this.jobRunRepository.cancel(runId);

    if (!run) {
      throw new Error("Run not found");
    }

    await this.emit(
      Events.JOB_RUN_CANCELLED,
      {
        run_id: run.id,
        job_id: run.job_id,
        duration_seconds: run.duration_seconds,
        ended_at: run.ended_at,
      },
      metadata,
    );

    return run;
  }

  /**
   * Get runs for a job
   * @param {number} jobId - Job ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Job runs
   */
  async getRunsForJob(jobId, options = {}) {
    return this.jobRunRepository.findByJobId(jobId, options);
  }

  /**
   * Get the latest run for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object|null>} Latest run
   */
  async getLatestRun(jobId) {
    return this.jobRunRepository.findLatestByJobId(jobId);
  }

  /**
   * Get run statistics for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Run statistics
   */
  async getStatsForJob(jobId) {
    return this.jobRunRepository.getStatsByJobId(jobId);
  }

  /**
   * Get all currently running job runs
   * @returns {Promise<Array>} Running runs
   */
  async getRunningRuns() {
    return this.jobRunRepository.findRunning();
  }

  /**
   * Cleanup old run records (retention policy)
   * @param {number} daysToKeep - Days to retain (default 30)
   * @returns {Promise<number>} Number of deleted runs
   */
  async cleanupOldRuns(daysToKeep = 30) {
    const deleted = await this.jobRunRepository.cleanup(daysToKeep);

    await this.emit(Events.JOB_RUNS_CLEANED_UP, {
      deleted_count: deleted,
      retention_days: daysToKeep,
    });

    return deleted;
  }
}

module.exports = { JobRunService };
