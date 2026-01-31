/**
 * Notebook Routes
 * RESTful endpoints for notebook management
 * Routes are thin adapters that delegate to NotebookService
 *
 * Uses DTOs for response transformation (Clean Architecture)
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const { handleResult, handleResultWithDTO, handleListWithDTO } = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");
const { NotebookDTO, NotebookDetailDTO } = require("../dtos");

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
      
      // Transform through DTO - excludes content from list
      handleListWithDTO(result, res, { 
        dataKey: "notebooks",
        dto: NotebookDTO
      });
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
      // Use detailed DTO to include content
      handleResultWithDTO(result, res, { 
        dataKey: "notebook",
        dto: NotebookDetailDTO
      });
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
      handleResultWithDTO(result, res, { 
        successStatus: 201, 
        dataKey: "notebook",
        dto: NotebookDTO
      });
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
      handleResultWithDTO(result, res, { 
        dataKey: "notebook",
        dto: NotebookDTO
      });
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
      // Use detailed DTO since content update returns full notebook
      handleResultWithDTO(result, res, { 
        dataKey: "notebook",
        dto: NotebookDetailDTO
      });
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
