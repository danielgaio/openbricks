/**
 * Table Routes
 * RESTful endpoints for data catalog tables
 */

const express = require("express");
const { asyncHandler, errors } = require("../utils/errors");
const schemas = require("../schemas");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

/**
 * Create table router
 * @param {Object} repositories - Repository instances
 * @returns {express.Router} Configured router
 */
function createTableRoutes(repositories) {
  const router = express.Router();
  const { tables } = repositories;

  /**
   * GET /tables - List data tables
   * Public tables visible to all, private to owners/admins
   */
  router.get(
    "/",
    optionalAuth,
    asyncHandler(async (req, res) => {
      const { database, limit, offset } = req.query;

      const result = await tables.findForUser(req.user, {
        database,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      res.json({ tables: result });
    }),
  );

  /**
   * GET /tables/databases - List all databases
   */
  router.get(
    "/databases",
    optionalAuth,
    asyncHandler(async (req, res) => {
      const databases = await tables.listDatabases();
      res.json({ databases });
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
      const table = await tables.findById(req.params.id);

      if (!table) {
        throw errors.notFound("Table");
      }

      // Check access for private tables
      if (!table.is_public && req.user) {
        if (!(await tables.canAccess(table.id, req.user))) {
          throw errors.forbidden("You do not have access to this table");
        }
      } else if (!table.is_public && !req.user) {
        throw errors.unauthorized(
          "Authentication required to access this table",
        );
      }

      res.json({ table });
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
      const {
        name,
        database = "default",
        format = "delta",
        location,
        schema_definition,
        is_public = false,
      } = req.body;

      // Check if table already exists
      const existing = await tables.findByDatabaseAndName(database, name);
      if (existing) {
        throw errors.duplicate(`Table ${database}.${name}`);
      }

      // Generate default location if not provided
      const tableLocation =
        location || `s3a://openbricks-data/${database}/${name}`;

      const table = await tables.create({
        name,
        database,
        format,
        location: tableLocation,
        schema_definition,
        is_public,
        owner_id: req.user.id,
      });

      res.status(201).json({ table });
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
      const { id } = req.params;
      const { schema_definition, is_public } = req.body;

      const existing = await tables.findById(id);
      if (!existing) {
        throw errors.notFound("Table");
      }

      if (!(await tables.canModify(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to update this table",
        );
      }

      // Build update object with only provided fields
      const updates = {};
      if (schema_definition !== undefined)
        updates.schema_definition = schema_definition;
      if (is_public !== undefined) updates.is_public = is_public;

      const table = await tables.update(id, updates);
      res.json({ table });
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
      const { id } = req.params;
      const { is_public } = req.body;

      if (typeof is_public !== "boolean") {
        throw errors.badRequest("is_public must be a boolean");
      }

      const existing = await tables.findById(id);
      if (!existing) {
        throw errors.notFound("Table");
      }

      if (!(await tables.canModify(id, req.user))) {
        throw errors.forbidden(
          "You do not have permission to modify this table",
        );
      }

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
