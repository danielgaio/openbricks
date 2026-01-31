/**
 * Table Routes
 * RESTful endpoints for data catalog tables
 * Routes are thin adapters that delegate to TableService
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const { handleResult } = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

/**
 * Create table router
 * @param {Object} services - Service instances
 * @returns {express.Router} Configured router
 */
function createTableRoutes(services) {
  const router = express.Router();
  const { tables } = services;

  /**
   * GET /tables - List data tables
   * Public tables visible to all, private to owners/admins
   */
  router.get(
    "/",
    optionalAuth,
    asyncHandler(async (req, res) => {
      const { database, limit, offset } = req.query;
      const result = await tables.list(req.user, {
        database,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      if (result.success) {
        return res.json({ tables: result.data });
      }
      handleResult(result, res);
    }),
  );

  /**
   * GET /tables/databases - List all databases
   */
  router.get(
    "/databases",
    optionalAuth,
    asyncHandler(async (req, res) => {
      const result = await tables.listDatabases();
      if (result.success) {
        return res.json({ databases: result.data });
      }
      handleResult(result, res);
    }),
  );

  /**
   * GET /tables/:id - Get table by ID
   */
  router.get(
    "/:id",
    optionalAuth,
    schemas.tables.getById,
    asyncHandler(async (req, res) => {
      const result = await tables.getById(req.params.id, req.user);
      handleResult(result, res, { dataKey: "table" });
    }),
  );

  /**
   * POST /tables - Create a new table
   */
  router.post(
    "/",
    authenticateToken,
    schemas.tables.create,
    asyncHandler(async (req, res) => {
      const result = await tables.create(req.body, req.user);
      handleResult(result, res, { successStatus: 201, dataKey: "table" });
    }),
  );

  /**
   * PUT /tables/:id - Update table metadata
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.tables.getById,
    asyncHandler(async (req, res) => {
      const result = await tables.update(req.params.id, req.body, req.user);
      handleResult(result, res, { dataKey: "table" });
    }),
  );

  /**
   * PATCH /tables/:id/visibility - Toggle table visibility
   */
  router.patch(
    "/:id/visibility",
    authenticateToken,
    schemas.tables.getById,
    asyncHandler(async (req, res) => {
      const { is_public } = req.body;
      const result = await tables.setVisibility(req.params.id, is_public, req.user);
      handleResult(result, res, { dataKey: "table" });
    }),
  );

  /**
   * DELETE /tables/:id - Delete table from catalog
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.tables.getById,
    asyncHandler(async (req, res) => {
      const result = await tables.delete(req.params.id, req.user);
      if (result.success) {
        return res.json({ message: "Table deleted successfully" });
      }
      handleResult(result, res);
    }),
  );

  return router;
}

module.exports = { createTableRoutes };

      const table = await tables.setVisibility(id, is_public);
      res.json({ table });
    }),
  );

  /**
   * DELETE /tables/:id - Delete table from catalog
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.tables.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await tables.findById(id);
      if (!existing) {
        throw errors.notFound("Table");
      }

      if (!(await tables.canModify(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to delete this table",
        );
      }

      await tables.delete(id);
      res.json({ message: "Table deleted successfully" });
    }),
  );

  return router;
}

module.exports = { createTableRoutes };
