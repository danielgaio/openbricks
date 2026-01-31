/**
 * Repositories Index
 * Central export for all repository classes
 * Provides factory function for dependency injection
 */

const { BaseRepository } = require("./BaseRepository");
const { WorkspaceRepository } = require("./WorkspaceRepository");
const { NotebookRepository } = require("./NotebookRepository");
const { JobRepository } = require("./JobRepository");
const { ClusterRepository } = require("./ClusterRepository");
const { TableRepository } = require("./TableRepository");

/**
 * Create all repositories with shared pool
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @returns {Object} Repository instances
 */
function createRepositories(pool) {
  return {
    workspaces: new WorkspaceRepository(pool),
    notebooks: new NotebookRepository(pool),
    jobs: new JobRepository(pool),
    clusters: new ClusterRepository(pool),
    tables: new TableRepository(pool),
  };
}

module.exports = {
  BaseRepository,
  WorkspaceRepository,
  NotebookRepository,
  JobRepository,
  ClusterRepository,
  TableRepository,
  createRepositories,
};
