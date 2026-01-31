/**
 * Job Routes
 * RESTful endpoints for job scheduling
 */

const express = require("express");
const { asyncHandler, errors } = require("../utils/errors");
const schemas = require("../schemas");
const { authenticateToken } = require("../middleware/auth");

/**
 * Create job router
 * @param {Object} repositories - Repository instances
 * @returns {express.Router} Configured router
 */
function createJobRoutes(repositories) {
  const router = express.Router();
  const { jobs, notebooks } = repositories;

  /**
   * GET /jobs - List jobs
   */
  router.get(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { status, notebook_id } = req.query;

      let result;
      if (notebook_id) {
        // Verify notebook access
        if (!(await notebooks.canAccess(notebook_id, req.user))) {
          throw errors.forbidden("You do not have access to this notebook");
        }
        result = await jobs.findByNotebook(notebook_id);
      } else if (status) {
        // Filter by status (admin only)
        if (req.user.role !== "admin") {
          throw errors.forbidden("Only admins can filter by status");
        }
        result = await jobs.findByStatus(status);
      } else {
        result = await jobs.findForUser(req.user);
      }

      res.json({ jobs: result });
    })
  );

  /**
   * GET /jobs/:id - Get job by ID
   */
  router.get(
    "/:id",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const job = await jobs.findByIdWithNotebook(req.params.id);

      if (!job) {
        throw errors.notFound("Job");
      }

      if (!(await jobs.canAccess(job.id, req.user))) {
        throw errors.forbidden("You do not have access to this job");
      }

      res.json({ job });
    })
  );

  /**
   * POST /jobs - Create a new job
   */
  router.post(
    "/",
    authenticateToken,
    schemas.jobs.create,
    asyncHandler(async (req, res) => {
      const { name, notebook_id, schedule } = req.body;

      // Verify user owns the notebook
      const notebook = await notebooks.findById(notebook_id);
      if (!notebook) {
        throw errors.notFound("Notebook");
      }

      if (!(await notebooks.canAccess(notebook_id, req.user))) {
        throw errors.forbidden("You do not own this notebook");
      }

      const job = await jobs.create({
        name,
        notebook_id,
        schedule,
        status: "pending",
        owner_id: req.user.id,
      });

      res.status(201).json({ job });
    })
  );

  /**
   * PUT /jobs/:id - Update job
   */
  router.put(
    "/:id",
    authenticateToken,
    schemas.jobs.update,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, schedule, status } = req.body;

      const existing = await jobs.findById(id);
      if (!existing) {
        throw errors.notFound("Job");
      }

      if (!(await jobs.canAccess(id, req.user))) {
        throw errors.forbidden("You do not have permission to update this job");
      }

      // Build update object with only provided fields
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (schedule !== undefined) updates.schedule = schedule;
      if (status !== undefined) updates.status = status;

      const job = await jobs.update(id, updates);
      res.json({ job });
    })
  );

  /**
   * POST /jobs/:id/run - Trigger job execution
   */
  router.post(
    "/:id/run",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await jobs.findById(id);
      if (!existing) {
        throw errors.notFound("Job");
      }

      if (!(await jobs.canAccess(id, req.user))) {
        throw errors.forbidden("You do not have permission to run this job");
      }

      // Update status to pending (job scheduler will pick it up)
      const job = await jobs.updateStatus(id, "pending");
      res.json({ job, message: "Job queued for execution" });
    })
  );

  /**
   * POST /jobs/:id/cancel - Cancel job execution
   */
  router.post(
    "/:id/cancel",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await jobs.findById(id);
      if (!existing) {
        throw errors.notFound("Job");
      }

      if (!(await jobs.canAccess(id, req.user))) {
        throw errors.forbidden("You do not have permission to cancel this job");
      }

      if (existing.status !== "running" && existing.status !== "pending") {
        throw errors.badRequest("Job is not running or pending");
      }

      const job = await jobs.updateStatus(id, "cancelled");
      res.json({ job, message: "Job cancelled" });
    })
  );

  /**
   * DELETE /jobs/:id - Delete job
   */
  router.delete(
    "/:id",
    authenticateToken,
    schemas.jobs.getById,
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const existing = await jobs.findById(id);
      if (!existing) {
        throw errors.notFound("Job");
      }

      if (!(await jobs.canAccess(id, req.user))) {
        throw errors.forbidden("You do not have permission to delete this job");
      }

      await jobs.delete(id);
      res.json({ message: "Job deleted successfully" });
    })
  );

  return router;
}

module.exports = { createJobRoutes };
