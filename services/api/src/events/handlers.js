/**
 * Event Handlers
 * Domain event handlers that react to events and perform side effects
 *
 * Design Pattern: Observer/Subscriber
 * Each handler is a pure function that receives an event and performs an action
 */

const { DomainEvents } = require("./DomainEvents");

/**
 * In-memory store for tracking active job runs
 * Maps job_id to run_id for correlating job events with run records
 */
const activeJobRuns = new Map();

/**
 * Create audit logging handler
 * Automatically logs all domain events to audit_logs table
 * @param {Object} pool - Database pool
 * @param {Object} logger - Logger instance
 * @returns {Function} Event handler
 */
function createAuditHandler(pool, logger) {
  return async (event) => {
    const { type, payload, metadata } = event;

    // Extract resource info from event type
    const [resourceType, action] = type.split(".");

    // Extract resource ID and user ID from payload
    const resourceId =
      payload[resourceType]?.id || payload.id || payload.resourceId || null;
    const userId =
      payload.userId || payload.user?.id || metadata.userId || null;

    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          type,
          resourceType,
          resourceId,
          JSON.stringify({
            eventId: metadata.eventId,
            payload: sanitizeForAudit(payload),
          }),
        ],
      );
    } catch (error) {
      logger.error("Audit handler error:", {
        error: error.message,
        event: type,
      });
    }
  };
}

/**
 * Create notification handler (placeholder for future webhook/email integration)
 * @param {Object} logger - Logger instance
 * @returns {Function} Event handler
 */
function createNotificationHandler(logger) {
  // Events that should trigger notifications
  const notifiableEvents = new Set([
    DomainEvents.JOB_COMPLETED,
    DomainEvents.JOB_FAILED,
    DomainEvents.CLUSTER_TERMINATED,
    DomainEvents.WORKSPACE_DELETED,
  ]);

  return async (event) => {
    const { type, payload, metadata } = event;

    if (!notifiableEvents.has(type)) return;

    // TODO: Implement actual notification logic (webhooks, email, etc.)
    logger.info("Notification triggered:", {
      eventType: type,
      resourceId: payload.id || payload.job?.id || payload.cluster?.id,
      userId: payload.userId || metadata.userId,
    });
  };
}

/**
 * Create metrics handler for observability
 * @param {Object} logger - Logger instance
 * @returns {Function} Event handler
 */
function createMetricsHandler(logger) {
  const eventCounts = new Map();

  return async (event) => {
    const { type } = event;

    // Increment event counter
    const count = (eventCounts.get(type) || 0) + 1;
    eventCounts.set(type, count);

    // Log metrics periodically (every 100 events)
    if (count % 100 === 0) {
      logger.info("Event metrics:", {
        eventType: type,
        totalCount: count,
      });
    }
  };
}

/**
 * Create job run tracking handler
 * Automatically creates and updates job run records based on job lifecycle events
 * @param {Object} dependencies - { logger, jobRunService }
 * @returns {Function} Event handler
 */
function createJobRunTrackingHandler(dependencies) {
  const { logger, jobRunService } = dependencies;

  if (!jobRunService) {
    return async () => {}; // No-op if service not provided
  }

  return async (event) => {
    const { type, payload, metadata } = event;
    const { job, userId } = payload;

    try {
      switch (type) {
        case DomainEvents.JOB_QUEUED: {
          // Create a new run record when job is queued
          if (!job?.id) break;

          const run = await jobRunService.startRun(job.id, { userId });
          activeJobRuns.set(job.id, run.id);

          logger.info("Job run started:", {
            jobId: job.id,
            runId: run.id,
          });
          break;
        }

        case DomainEvents.JOB_COMPLETED: {
          // Complete the active run
          if (!job?.id) break;

          const runId = activeJobRuns.get(job.id);
          if (runId) {
            await jobRunService.completeRun(runId, payload.output || null, {
              userId,
            });
            activeJobRuns.delete(job.id);

            logger.info("Job run completed:", {
              jobId: job.id,
              runId,
            });
          }
          break;
        }

        case DomainEvents.JOB_FAILED: {
          // Fail the active run with error message
          if (!job?.id) break;

          const runId = activeJobRuns.get(job.id);
          if (runId) {
            const errorMessage =
              payload.error?.message || payload.errorMessage || "Unknown error";
            await jobRunService.failRun(runId, errorMessage, { userId });
            activeJobRuns.delete(job.id);

            logger.info("Job run failed:", {
              jobId: job.id,
              runId,
              error: errorMessage,
            });
          }
          break;
        }

        case DomainEvents.JOB_CANCELLED: {
          // Cancel the active run
          if (!job?.id) break;

          const runId = activeJobRuns.get(job.id);
          if (runId) {
            await jobRunService.cancelRun(runId, { userId });
            activeJobRuns.delete(job.id);

            logger.info("Job run cancelled:", {
              jobId: job.id,
              runId,
            });
          }
          break;
        }
      }
    } catch (error) {
      logger.error("Job run tracking error:", {
        event: type,
        jobId: job?.id,
        error: error.message,
      });
    }
  };
}

/**
 * Create job execution handler
 * Handles job.queued events to trigger actual job execution
 * @param {Object} dependencies - { pool, logger, jobRunner }
 * @returns {Function} Event handler
 */
function createJobExecutionHandler(dependencies) {
  const { logger, jobRunner } = dependencies;

  return async (event) => {
    const { type, payload } = event;

    if (type !== DomainEvents.JOB_QUEUED) return;

    const { job } = payload;
    if (!job) return;

    logger.info("Job execution triggered:", { jobId: job.id });

    // If jobRunner is provided, execute the job
    if (jobRunner) {
      try {
        await jobRunner.execute(job);
      } catch (error) {
        logger.error("Job execution failed:", {
          jobId: job.id,
          error: error.message,
        });
      }
    }
  };
}

/**
 * Register all event handlers on the event bus
 * @param {EventBus} eventBus - Event bus instance
 * @param {Object} dependencies - { pool, logger, jobRunner, jobRunService }
 */
function registerHandlers(eventBus, dependencies) {
  const { pool, logger, jobRunner, jobRunService } = dependencies;

  // Register audit handler for ALL events (using wildcard)
  if (pool) {
    eventBus.on("*", createAuditHandler(pool, logger), {
      name: "AuditHandler",
    });
  }

  // Register notification handler for ALL events
  eventBus.on("*", createNotificationHandler(logger), {
    name: "NotificationHandler",
  });

  // Register metrics handler for ALL events
  eventBus.on("*", createMetricsHandler(logger), {
    name: "MetricsHandler",
  });

  // Register job run tracking handler for job lifecycle events
  if (jobRunService) {
    const jobRunTrackingHandler = createJobRunTrackingHandler({
      logger,
      jobRunService,
    });

    // Listen to all job lifecycle events that affect runs
    eventBus.on(DomainEvents.JOB_QUEUED, jobRunTrackingHandler, {
      name: "JobRunTrackingHandler",
    });
    eventBus.on(DomainEvents.JOB_COMPLETED, jobRunTrackingHandler, {
      name: "JobRunTrackingHandler",
    });
    eventBus.on(DomainEvents.JOB_FAILED, jobRunTrackingHandler, {
      name: "JobRunTrackingHandler",
    });
    eventBus.on(DomainEvents.JOB_CANCELLED, jobRunTrackingHandler, {
      name: "JobRunTrackingHandler",
    });
  }

  // Register job execution handler
  if (jobRunner) {
    eventBus.on(
      DomainEvents.JOB_QUEUED,
      createJobExecutionHandler(dependencies),
      {
        name: "JobExecutionHandler",
      },
    );
  }

  logger.info("Event handlers registered:", eventBus.getHandlers());
}

/**
 * Sanitize payload for audit logging (remove sensitive/large data)
 * @param {Object} payload - Event payload
 * @returns {Object} Sanitized payload
 */
function sanitizeForAudit(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const sanitized = { ...payload };

  // Remove sensitive fields
  const sensitiveKeys = ["password", "token", "content", "schema_definition"];
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = "[OMITTED]";
    }
  }

  // Remove nested objects to keep audit logs small
  for (const key of Object.keys(sanitized)) {
    if (sanitized[key] && typeof sanitized[key] === "object") {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = `[Array(${sanitized[key].length})]`;
      } else if (sanitized[key].id) {
        // Keep just the ID for nested objects
        sanitized[key] = { id: sanitized[key].id };
      }
    }
  }

  return sanitized;
}

module.exports = {
  createAuditHandler,
  createNotificationHandler,
  createMetricsHandler,
  createJobRunTrackingHandler,
  createJobExecutionHandler,
  registerHandlers,
  // Expose for testing
  activeJobRuns,
};
