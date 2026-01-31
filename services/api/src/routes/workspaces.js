/**
 * Workspace Routes
 * RESTful endpoints for workspace management
 * Routes are thin adapters that delegate to WorkspaceService
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const { handleResult } = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");

/**
 * Create workspace router
 * @param {Object} services - Service instances
 * @returns {express.Router} Configured router
 */
function createWorkspaceRoutes(services) {
  const router = express.Router();
  const { workspaces } = services;

  /**
   * GET /workspaces - List workspaces
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { limit, offset } = req.query;
      const result = await workspaces.list(req.user, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      res.json({ workspaces: result });
    }),
  );

  /**
   * GET /workspaces/:id - Get workspace by ID
   */
  router.get(
    "/:id",
    authenticateToken,
    schemas.workspaces.getById,
    asyncHandler(async (req, res) => {
      const result = await workspaces.getById(req.params.id, req.user);
      handleResult(result, res, { dataKey: "workspace" });
    }),
  );

  /**
   * POST /workspaces - Create a new workspace
   */
  router.post(
    "/",
    authenticateToken,
    schemas.workspaces.create,
    asyncHandler(async (req, res) => {
      const result = await workspaces.create(req.body, req.user);
      handleResult(result, res, { successStatus: 201, dataKey: "workspace" });
    }),
  );

  /**
   * PUT /workspaces/:id - Update workspace
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.workspaces.update,
    asyncHandler(async (req, res) => {
      const result = await workspaces.update(req.params.id, req.body, req.user);
      handleResult(result, res, { dataKey: "workspace" });
    }),
  );

  /**
   * DELETE /workspaces/:id - Delete workspace
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.workspaces.getById,
    asyncHandler(async (req, res) => {
      const result = await workspaces.delete(req.params.id, req.user);
      if (result.success) {
        return res.json({ message: "Workspace deleted successfully" });
      }
      handleResult(result, res);
    }),
  );

  return router;
}

module.exports = { createWorkspaceRoutes };
