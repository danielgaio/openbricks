/**
 * Job Routes
 * RESTful endpoints for job scheduling
 * Routes are thin adapters that delegate to JobService
 *
 * Uses DTOs for response transformation (Clean Architecture)
 */

const express = require("express");
const { asyncHandler } = require("../utils/errors");
const {
  handleResult,
  handleResultWithDTO,
  handleListWithDTO,
} = require("../utils/routeHelpers");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");
const { JobDTO, JobDetailDTO } = require("../dtos");

/**
 * Create job router
 * @param {Object} services - Service instances
 * @returns {express.Router} Configured router
 */
function createJobRoutes(services) {
  const router = express.Router();
  const { jobs } = services;

  /**
   * GET /jobs - List jobs
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { status, notebook_id, limit, offset } = req.query;
      const result = await jobs.list(req.user, {
        status,
        notebook_id,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      // Transform through DTO
      handleListWithDTO(result, res, {
        dataKey: "jobs",
        dto: JobDTO,
      });
    }),
  );

  /**
   * GET /jobs/:id - Get job by ID
   */
  router.get(
    "/:id",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const result = await jobs.getById(req.params.id, req.user);
      // Use detailed DTO for single entity
      handleResultWithDTO(result, res, {
        dataKey: "job",
        dto: JobDetailDTO,
      });
    }),
  );

  /**
   * POST /jobs - Create a new job
   */
  router.post(
    "/",
    authenticateToken,
    schemas.jobs.create,
    asyncHandler(async (req, res) => {
      const result = await jobs.create(req.body, req.user);
      handleResultWithDTO(result, res, {
        successStatus: 201,
        dataKey: "job",
        dto: JobDTO,
      });
    }),
  );

  /**
   * PUT /jobs/:id - Update job
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.jobs.update,
    asyncHandler(async (req, res) => {
      const result = await jobs.update(req.params.id, req.body, req.user);
      handleResultWithDTO(result, res, {
        dataKey: "job",
        dto: JobDTO,
      });
    }),
  );

  /**
   * POST /jobs/:id/run - Trigger job execution
   */
  router.post(
    "/:id/run",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const result = await jobs.run(req.params.id, req.user);
      if (result.success) {
        return res.json({
          job: JobDTO.fromEntity(result.data),
          message: result.message,
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * POST /jobs/:id/cancel - Cancel job execution
   */
  router.post(
    "/:id/cancel",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const result = await jobs.cancel(req.params.id, req.user);
      if (result.success) {
        return res.json({
          job: JobDTO.fromEntity(result.data),
          message: result.message,
        });
      }
      handleResult(result, res);
    }),
  );

  /**
   * DELETE /jobs/:id - Delete job
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const result = await jobs.delete(req.params.id, req.user);
      if (result.success) {
        return res.json({ message: "Job deleted successfully" });
      }
      handleResult(result, res);
    }),
  );

  return router;
}

module.exports = { createJobRoutes };
