/**
 * Notebook Routes
 * RESTful endpoints for notebook management
 */

const express = require("express");
const { asyncHandler, errors } = require("../utils/errors");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");

/**
 * Create notebook router
 * @param {Object} repositories - Repository instances
 * @returns {express.Router} Configured router
 */
function createNotebookRoutes(repositories) {
  const router = express.Router();
  const { notebooks, workspaces } = repositories;

  /**
   * GET /notebooks - List notebooks
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { workspace_id } = req.query;

      let result;
      if (workspace_id) {
        // Verify workspace access
        if (!(await workspaces.canAccess(workspace_id, req.user))) {
          throw errors.forbidden("You do not have access to this workspace");
        }
        result = await notebooks.findByWorkspace(workspace_id);
      } else {
        result = await notebooks.findForUser(req.user);
      }

      res.json({ notebooks: result });
    }),
  );

  /**
   * GET /notebooks/:id - Get notebook by ID
   */
  router.get(
    "/:id",
    authenticateToken,
    schemas.notebooks.getById,
    asyncHandler(async (req, res) => {
      const notebook = await notebooks.findByIdWithWorkspace(req.params.id);

      if (!notebook) {
        throw errors.notFound("Notebook");
      }

      if (!(await notebooks.canAccess(notebook.id, req.user))) {
        throw errors.forbidden("You do not have access to this notebook");
      }

      res.json({ notebook });
    }),
  );

  /**
   * POST /notebooks - Create a new notebook
   */
  router.post(
    "/",
    authenticateToken,
    schemas.notebooks.create,
    asyncHandler(async (req, res) => {
      const {
        name,
        workspace_id,
        language = "python",
        content = "",
      } = req.body;

      // Verify workspace access if workspace_id provided
      if (workspace_id) {
        const workspace = await workspaces.findById(workspace_id);
        if (!workspace) {
          throw errors.notFound("Workspace");
        }
        if (!(await workspaces.canAccess(workspace_id, req.user))) {
          throw errors.forbidden("You do not have access to this workspace");
        }
      }

      const notebook = await notebooks.create({
        name,
        workspace_id,
        language,
        content,
        owner_id: req.user.id,
      });

      res.status(201).json({ notebook });
    }),
  );

  /**
   * PUT /notebooks/:id - Update notebook
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.notebooks.update,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, workspace_id, language, content } = req.body;

      const existing = await notebooks.findById(id);
      if (!existing) {
        throw errors.notFound("Notebook");
      }

      if (!(await notebooks.canAccess(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to update this notebook",
        );
      }

      // If changing workspace, verify access to new workspace
      if (workspace_id && workspace_id !== existing.workspace_id) {
        if (!(await workspaces.canAccess(workspace_id, req.user))) {
          throw errors.forbidden(
            "You do not have access to the target workspace",
          );
        }
      }

      // Build update object with only provided fields
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (workspace_id !== undefined) updates.workspace_id = workspace_id;
      if (language !== undefined) updates.language = language;
      if (content !== undefined) updates.content = content;

      const notebook = await notebooks.update(id, updates);
      res.json({ notebook });
    }),
  );

  /**
   * PATCH /notebooks/:id/content - Update notebook content only
   */
  router.patch(
    "/:id/content",
    authenticateToken,
    schemas.notebooks.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content } = req.body;

      const existing = await notebooks.findById(id);
      if (!existing) {
        throw errors.notFound("Notebook");
      }

      if (!(await notebooks.canAccess(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to update this notebook",
        );
      }

      const notebook = await notebooks.updateContent(id, content);
      res.json({ notebook });
    }),
  );

  /**
   * DELETE /notebooks/:id - Delete notebook
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.notebooks.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await notebooks.findById(id);
      if (!existing) {
        throw errors.notFound("Notebook");
      }

      if (!(await notebooks.canAccess(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to delete this notebook",
        );
      }

      await notebooks.delete(id);
      res.json({ message: "Notebook deleted successfully" });
    }),
  );

  return router;
}

module.exports = { createNotebookRoutes };
