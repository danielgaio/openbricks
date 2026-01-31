/**
 * Job Service
 * Business logic for job scheduling and execution
 */

const { BaseService } = require("./BaseService");
const { DomainEvents } = require("../events");

// Valid job status transitions
const STATUS_TRANSITIONS = {
  pending: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: ["pending"], // Allow re-run
  failed: ["pending"], // Allow retry
  cancelled: ["pending"], // Allow restart
};

/**
 * JobService handles all job-related business logic
 */
class JobService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.jobs = repositories.jobs;
    this.notebooks = repositories.notebooks;
  }

  /**
   * List jobs for a user
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Result with jobs array
   */
  async list(user, options = {}) {
    const { status, notebook_id, limit, offset } = options;

    // Filter by notebook
    if (notebook_id) {
      const notebook = await this.notebooks.findById(notebook_id);
      if (!notebook) {
        return {
          success: false,
          error: "NOT_FOUND",
          message: "Notebook not found",
        };
      }
      if (!this.canAccess(notebook, user)) {
        return { success: false, error: "FORBIDDEN" };
      }
      const jobs = await this.jobs.findByNotebook(notebook_id);
      return { success: true, data: jobs };
    }

    // Filter by status (admin only)
    if (status) {
      if (!this.isAdmin(user)) {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "Only admins can filter by status",
        };
      }
      const jobs = await this.jobs.findByStatus(status);
      return { success: true, data: jobs };
    }

    // Default: user's jobs
    const jobs = await this.jobs.findForUser(user, { limit, offset });
    return { success: true, data: jobs };
  }

  /**
   * Get job by ID with access check
   * @param {number} id - Job ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Job with notebook info
   */
  async getById(id, user) {
    const job = await this.jobs.findByIdWithNotebook(id);

    if (!job) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!(await this.jobs.canAccess(id, user))) {
      return { success: false, error: "FORBIDDEN" };
    }

    return { success: true, data: job };
  }

  /**
   * Create a new job
   * @param {Object} data - Job data (name, notebook_id, schedule)
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created job
   */
  async create(data, user) {
    const { name, notebook_id, schedule } = data;

    // Verify notebook exists and user has access
    const notebook = await this.notebooks.findById(notebook_id);
    if (!notebook) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: "Notebook not found",
      };
    }
    if (!this.canAccess(notebook, user)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "You do not have access to this notebook",
      };
    }

    // Validate schedule format if provided
    if (schedule && !this.isValidCronExpression(schedule)) {
      return {
        success: false,
        error: "VALIDATION",
        message: "Invalid cron schedule format",
      };
    }

    const job = await this.jobs.create({
      name,
      notebook_id,
      schedule,
      status: "pending",
      owner_id: user.id,
    });

    this.emit(DomainEvents.JOB_CREATED, { job, userId: user.id });

    return { success: true, data: job };
  }

  /**
   * Update job
   * @param {number} id - Job ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated job
   */
  async update(id, data, user) {
    const existing = await this.jobs.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!(await this.jobs.canAccess(id, user))) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Validate schedule if provided
    if (data.schedule && !this.isValidCronExpression(data.schedule)) {
      return {
        success: false,
        error: "VALIDATION",
        message: "Invalid cron schedule format",
      };
    }

    // Build update object
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.schedule !== undefined) updates.schedule = data.schedule;

    const job = await this.jobs.update(id, updates);

    this.emit(DomainEvents.JOB_UPDATED, {
      job,
      userId: user.id,
      changes: Object.keys(updates),
    });

    return { success: true, data: job };
  }

  /**
   * Run a job (trigger execution)
   * @param {number} id - Job ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated job
   */
  async run(id, user) {
    const existing = await this.jobs.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!(await this.jobs.canAccess(id, user))) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Check if job is already running
    if (existing.status === "running") {
      return {
        success: false,
        error: "CONFLICT",
        message: "Job is already running",
      };
    }

    // Validate status transition
    if (!this.canTransition(existing.status, "pending")) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot run job in '${existing.status}' state`,
      };
    }

    const job = await this.jobs.updateStatus(id, "pending");

    this.emit(DomainEvents.JOB_QUEUED, {
      job,
      userId: user.id,
      previousStatus: existing.status,
    });

    return { success: true, data: job, message: "Job queued for execution" };
  }

  /**
   * Cancel a job
   * @param {number} id - Job ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated job
   */
  async cancel(id, user) {
    const existing = await this.jobs.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!(await this.jobs.canAccess(id, user))) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Validate status transition
    if (!this.canTransition(existing.status, "cancelled")) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot cancel job in '${existing.status}' state`,
      };
    }

    const job = await this.jobs.updateStatus(id, "cancelled");

    this.emit(DomainEvents.JOB_CANCELLED, {
      job,
      userId: user.id,
      previousStatus: existing.status,
    });

    return { success: true, data: job, message: "Job cancelled" };
  }

  /**
   * Delete job
   * @param {number} id - Job ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Result
   */
  async delete(id, user) {
    const existing = await this.jobs.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!(await this.jobs.canAccess(id, user))) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Cannot delete running jobs
    if (existing.status === "running") {
      return {
        success: false,
        error: "CONFLICT",
        message: "Cannot delete a running job. Cancel it first.",
      };
    }

    await this.jobs.delete(id);

    this.emit(DomainEvents.JOB_DELETED, { id, userId: user.id });

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

  /**
   * Validate cron expression (basic validation)
   * @param {string} expression - Cron expression
   * @returns {boolean}
   */
  isValidCronExpression(expression) {
    // Basic cron validation: 5 or 6 space-separated parts
    const parts = expression.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  }
}

module.exports = { JobService };
