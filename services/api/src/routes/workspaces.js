/**
 * Workspace Routes
 * RESTful endpoints for workspace management
 */

const express = require("express");
const { asyncHandler, errors } = require("../utils/errors");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");

/**
 * Create workspace router
 * @param {Object} repositories - Repository instances
 * @returns {express.Router} Configured router
 */
function createWorkspaceRoutes(repositories) {
  const router = express.Router();
  const { workspaces } = repositories;

  /**
   * GET /workspaces - List workspaces
   * Users see their own workspaces, admins see all
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const result = await workspaces.findForUser(req.user);
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
      const workspace = await workspaces.findByIdWithStats(req.params.id);

      if (!workspace) {
        throw errors.notFound("Workspace");
      }

      if (!(await workspaces.canAccess(workspace.id, req.user))) {
        throw errors.forbidden("You do not have access to this workspace");
      }

      res.json({ workspace });
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
      const { name, description } = req.body;

      const workspace = await workspaces.create({
        name,
        description,
        owner_id: req.user.id,
      });

      res.status(201).json({ workspace });
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
      const { id } = req.params;
      const { name, description } = req.body;

      const existing = await workspaces.findById(id);
      if (!existing) {
        throw errors.notFound("Workspace");
      }

      if (!(await workspaces.canAccess(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to update this workspace",
        );
      }

      // Build update object with only provided fields
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      const workspace = await workspaces.update(id, updates);
      res.json({ workspace });
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
      const { id } = req.params;

      const existing = await workspaces.findById(id);
      if (!existing) {
        throw errors.notFound("Workspace");
      }

      if (!(await workspaces.canAccess(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to delete this workspace",
        );
      }

      await workspaces.delete(id);
      res.json({ message: "Workspace deleted successfully" });
    }),
  );

  return router;
}

module.exports = { createWorkspaceRoutes };
