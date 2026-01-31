/**
 * Cluster Routes
 * RESTful endpoints for compute cluster management
 */

const express = require("express");
const { asyncHandler, errors } = require("../utils/errors");
const schemas = require("../schemas");
const { authenticateToken, requireRole } = require("../middleware/auth");

/**
 * Create cluster router
 * @param {Object} repositories - Repository instances
 * @returns {express.Router} Configured router
 */
function createClusterRoutes(repositories) {
  const router = express.Router();
  const { clusters } = repositories;

  /**
   * GET /clusters - List clusters
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { status } = req.query;

      let result;
      if (status) {
        result = await clusters.findByStatus(status);
      } else {
        result = await clusters.findAll();
      }

      res.json({ clusters: result });
    }),
  );

  /**
   * GET /clusters/:id - Get cluster by ID
   */
  router.get(
    "/:id",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const cluster = await clusters.findByIdWithStats(req.params.id);

      if (!cluster) {
        throw errors.notFound("Cluster");
      }

      res.json({ cluster });
    }),
  );

  /**
   * POST /clusters - Create a new cluster (admin only)
   */
  router.post(
    "/",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.create,
    asyncHandler(async (req, res) => {
      const {
        name,
        node_type = "standard",
        num_workers = 1,
        driver_memory = "2g",
        executor_memory = "2g",
        spark_version = "3.5.0",
      } = req.body;

      const cluster = await clusters.create({
        name,
        node_type,
        num_workers,
        driver_memory,
        executor_memory,
        spark_version,
        status: "terminated",
        owner_id: req.user.id,
      });

      res.status(201).json({ cluster });
    }),
  );

  /**
   * PUT /clusters/:id - Update cluster (admin only)
   */
  router.put(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.update,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, num_workers } = req.body;

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      // Build update object with only provided fields
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (num_workers !== undefined) updates.num_workers = num_workers;

      const cluster = await clusters.update(id, updates);
      res.json({ cluster });
    }),
  );

  /**
   * POST /clusters/:id/start - Start cluster
   */
  router.post(
    "/:id/start",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      if (existing.status === "running" || existing.status === "starting") {
        throw errors.badRequest("Cluster is already running or starting");
      }

      const cluster = await clusters.start(id);
      res.json({ cluster, message: "Cluster starting" });
    }),
  );

  /**
   * POST /clusters/:id/stop - Stop cluster
   */
  router.post(
    "/:id/stop",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      if (existing.status !== "running") {
        throw errors.badRequest("Cluster is not running");
      }

      const cluster = await clusters.stop(id);
      res.json({ cluster, message: "Cluster stopping" });
    }),
  );

  /**
   * POST /clusters/:id/terminate - Terminate cluster
   */
  router.post(
    "/:id/terminate",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      if (existing.status === "terminated") {
        throw errors.badRequest("Cluster is already terminated");
      }

      const cluster = await clusters.terminate(id);
      res.json({ cluster, message: "Cluster terminated" });
    }),
  );

  /**
   * POST /clusters/:id/scale - Scale cluster workers
   */
  router.post(
    "/:id/scale",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { num_workers } = req.body;

      if (!num_workers || num_workers < 1 || num_workers > 100) {
        throw errors.badRequest("num_workers must be between 1 and 100");
      }

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      const cluster = await clusters.scale(id, num_workers);
      res.json({
        cluster,
        message: `Cluster scaled to ${num_workers} workers`,
      });
    }),
  );

  /**
   * DELETE /clusters/:id - Delete cluster (admin only)
   */
  router.delete(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await clusters.findById(id);
      if (!existing) {
        throw errors.notFound("Cluster");
      }

      if (existing.status === "running") {
        throw errors.badRequest(
          "Cannot delete a running cluster. Terminate it first.",
        );
      }

      await clusters.delete(id);
      res.json({ message: "Cluster deleted successfully" });
    }),
  );

  return router;
}

module.exports = { createClusterRoutes };
