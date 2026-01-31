/**
 * Routes Index
 * Exports all route factory functions
 */

const { createWorkspaceRoutes } = require("./workspaces");
const { createNotebookRoutes } = require("./notebooks");
const { createJobRoutes } = require("./jobs");
const { createClusterRoutes } = require("./clusters");
const { createTableRoutes } = require("./tables");

module.exports = {
  createWorkspaceRoutes,
  createNotebookRoutes,
  createJobRoutes,
  createClusterRoutes,
  createTableRoutes,
};
