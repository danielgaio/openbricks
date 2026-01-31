/**
 * Services Index
 * Exports all service classes and factory function
 */

const { BaseService } = require("./BaseService");
const { WorkspaceService } = require("./WorkspaceService");
const { NotebookService } = require("./NotebookService");
const { JobService } = require("./JobService");
const { JobRunService } = require("./JobRunService");
const { ClusterService } = require("./ClusterService");
const { TableService } = require("./TableService");
const { AuditService } = require("./AuditService");

/**
 * Create all service instances
 * @param {Object} repositories - Repository instances
 * @param {Object} options - Service options (logger, eventEmitter, pool)
 * @returns {Object} Service instances
 */
function createServices(repositories, options = {}) {
  return {
    workspaces: new WorkspaceService(repositories, options),
    notebooks: new NotebookService(repositories, options),
    jobs: new JobService(repositories, options),
    jobRuns: new JobRunService(repositories, options),
    clusters: new ClusterService(repositories, options),
    tables: new TableService(repositories, options),
    audit: new AuditService(repositories, options),
  };
}

module.exports = {
  BaseService,
  WorkspaceService,
  NotebookService,
  JobService,
  JobRunService,
  ClusterService,
  TableService,
  AuditService,
  createServices,
};
