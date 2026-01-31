/**
 * Notebook Routes
 * RESTful endpoints for notebook management
 * Routes are thin adapters that delegate to NotebookService
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const { handleResult } = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");

/**
 * Create notebook router
 * @param {Object} services - Service instances
 * @returns {express.Router} Configured router
 */
function createNotebookRoutes(services) {
  const router = express.Router();
  const { notebooks } = services;

  /**
   * GET /notebooks - List notebooks
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { workspace_id, limit, offset } = req.query;
      const result = await notebooks.list(req.user, {
        workspace_id,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      
      if (result.success) {
        return res.json({ notebooks: result.data });
      }
      handleResult(result, res);
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
      const result = await notebooks.getById(req.params.id, req.user);
      handleResult(result, res, { dataKey: "notebook" });
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
      const result = await notebooks.create(req.body, req.user);
      handleResult(result, res, { successStatus: 201, dataKey: "notebook" });
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
      const result = await notebooks.update(req.params.id, req.body, req.user);
      handleResult(result, res, { dataKey: "notebook" });
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
      const result = await notebooks.updateContent(req.params.id, req.body.content, req.user);
      handleResult(result, res, { dataKey: "notebook" });
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
      const result = await notebooks.delete(req.params.id, req.user);
      if (result.success) {
        return res.json({ message: "Notebook deleted successfully" });
      }
      handleResult(result, res);
    }),
  );

  return router;
}

module.exports = { createNotebookRoutes };
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
