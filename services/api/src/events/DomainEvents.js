/**
 * Domain Event Types
 * Centralized registry of all domain events in the system
 *
 * Naming Convention: <aggregate>.<action>
 * Examples: workspace.created, job.completed, cluster.started
 */

const DomainEvents = {
  // Workspace Events
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_UPDATED: "workspace.updated",
  WORKSPACE_DELETED: "workspace.deleted",

  // Notebook Events
  NOTEBOOK_CREATED: "notebook.created",
  NOTEBOOK_UPDATED: "notebook.updated",
  NOTEBOOK_DELETED: "notebook.deleted",
  NOTEBOOK_CONTENT_UPDATED: "notebook.content.updated",

  // Job Events
  JOB_CREATED: "job.created",
  JOB_UPDATED: "job.updated",
  JOB_DELETED: "job.deleted",
  JOB_QUEUED: "job.queued",
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
  JOB_CANCELLED: "job.cancelled",
  JOB_STATUS_CHANGED: "job.status.changed",

  // Job Run Events (execution tracking)
  JOB_RUN_STARTED: "job.run.started",
  JOB_RUN_COMPLETED: "job.run.completed",
  JOB_RUN_FAILED: "job.run.failed",
  JOB_RUN_CANCELLED: "job.run.cancelled",
  JOB_RUNS_CLEANED_UP: "job.runs.cleaned_up",

  // Cluster Events
  CLUSTER_CREATED: "cluster.created",
  CLUSTER_UPDATED: "cluster.updated",
  CLUSTER_DELETED: "cluster.deleted",
  CLUSTER_STARTING: "cluster.starting",
  CLUSTER_STARTED: "cluster.started",
  CLUSTER_STOPPING: "cluster.stopping",
  CLUSTER_STOPPED: "cluster.stopped",
  CLUSTER_TERMINATED: "cluster.terminated",
  CLUSTER_SCALED: "cluster.scaled",
  CLUSTER_STATUS_CHANGED: "cluster.status.changed",

  // Table/Data Catalog Events
  TABLE_CREATED: "table.created",
  TABLE_UPDATED: "table.updated",
  TABLE_DELETED: "table.deleted",
  TABLE_SCHEMA_UPDATED: "table.schema.updated",
  TABLE_VISIBILITY_CHANGED: "table.visibility.changed",

  // User Events (from auth service)
  USER_REGISTERED: "user.registered",
  USER_LOGGED_IN: "user.logged_in",
  USER_LOGGED_OUT: "user.logged_out",

  // System Events
  SYSTEM_STARTUP: "system.startup",
  SYSTEM_SHUTDOWN: "system.shutdown",
  SYSTEM_ERROR: "system.error",
};

/**
 * Event payload schemas for documentation and validation
 * Each event type documents its expected payload structure
 */
const EventPayloads = {
  [DomainEvents.WORKSPACE_CREATED]: {
    workspace: "Object - The created workspace",
    userId: "number - ID of user who created it",
  },
  [DomainEvents.JOB_STATUS_CHANGED]: {
    job: "Object - The job",
    oldStatus: "string - Previous status",
    newStatus: "string - New status",
    userId: "number - ID of user who triggered change",
  },
  [DomainEvents.CLUSTER_STATUS_CHANGED]: {
    cluster: "Object - The cluster",
    oldStatus: "string - Previous status",
    newStatus: "string - New status",
    userId: "number - ID of user who triggered change",
  },
};

module.exports = { DomainEvents, EventPayloads };
