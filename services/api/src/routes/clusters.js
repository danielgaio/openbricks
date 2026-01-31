/**
 * Cluster Routes
 * RESTful endpoints for compute cluster management
 * Routes are thin adapters that delegate to ClusterService
 *
 * Uses DTOs for response transformation (Clean Architecture)
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const { handleResult, handleResultWithDTO, handleListWithDTO } = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");
const { ClusterDTO, ClusterDetailDTO } = require("../dtos");

/**
 * Create cluster router
 * @param {Object} services - Service instances
 * @returns {express.Router} Configured router
 */
function createClusterRoutes(services) {
  const router = express.Router();
  const { clusters } = services;

  /**
   * GET /clusters - List clusters
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { status, limit, offset } = req.query;
      const result = await clusters.list(req.user, {
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      // Transform through DTO
      handleListWithDTO(result, res, { 
        dataKey: "clusters",
        dto: ClusterDTO
      });
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
      const result = await clusters.getById(req.params.id, req.user);
      // Use detailed DTO for single entity
      handleResultWithDTO(result, res, { 
        dataKey: "cluster",
        dto: ClusterDetailDTO
      });
    }),
  );

  /**
   * POST /clusters - Create a new cluster (admin only)
   */
  router.post(
    "/",
    authenticateToken,
    schemas.clusters.create,
    asyncHandler(async (req, res) => {
      const result = await clusters.create(req.body, req.user);
      handleResultWithDTO(result, res, { 
        successStatus: 201, 
        dataKey: "cluster",
        dto: ClusterDTO
      });
    }),
  );

  /**
   * PUT /clusters/:id - Update cluster (admin only)
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.clusters.update,
    asyncHandler(async (req, res) => {
      const result = await clusters.update(req.params.id, req.body, req.user);
      handleResultWithDTO(result, res, { 
        dataKey: "cluster",
        dto: ClusterDTO
      });
    }),
  );

  /**
   * POST /clusters/:id/start - Start cluster
   */
  router.post(
    "/:id/start",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const result = await clusters.start(req.params.id, req.user);
      if (result.success) {
        return res.json({ 
          cluster: ClusterDTO.fromEntity(result.data), 
          message: result.message 
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * POST /clusters/:id/stop - Stop cluster
   */
  router.post(
    "/:id/stop",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const result = await clusters.stop(req.params.id, req.user);
      if (result.success) {
        return res.json({ 
          cluster: ClusterDTO.fromEntity(result.data), 
          message: result.message 
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * POST /clusters/:id/terminate - Terminate cluster
   */
  router.post(
    "/:id/terminate",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const result = await clusters.terminate(req.params.id, req.user);
      if (result.success) {
        return res.json({ 
          cluster: ClusterDTO.fromEntity(result.data), 
          message: result.message 
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * POST /clusters/:id/scale - Scale cluster workers
   */
  router.post(
    "/:id/scale",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const { num_workers } = req.body;
      const result = await clusters.scale(req.params.id, num_workers, req.user);
      if (result.success) {
        return res.json({ 
          cluster: ClusterDTO.fromEntity(result.data), 
          message: result.message 
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * DELETE /clusters/:id - Delete cluster (admin only)
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.clusters.getById,
    asyncHandler(async (req, res) => {
      const result = await clusters.delete(req.params.id, req.user);
      if (result.success) {
        return res.json({ message: "Cluster deleted successfully" });
      }
      handleResult(result, res);
    }),
  );

  return router;
}

module.exports = { createClusterRoutes };      const existing = await clusters.findById(id);
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
