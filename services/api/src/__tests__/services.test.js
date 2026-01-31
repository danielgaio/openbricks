/**
 * Service Layer Tests
 * Unit tests for business logic services
 */

const {
  WorkspaceService,
  NotebookService,
  JobService,
  JobRunService,
  ClusterService,
  TableService,
  createServices,
} = require("../services");

describe("Service Layer", () => {
  let mockRepositories;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    // Create mock repositories
    mockRepositories = {
      workspaces: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findForUser: jest.fn(),
        findByIdWithStats: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        canAccess: jest.fn(),
      },
      notebooks: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findForUser: jest.fn(),
        findByWorkspace: jest.fn(),
        findByIdWithWorkspace: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateContent: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        canAccess: jest.fn(),
      },
      jobs: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findForUser: jest.fn(),
        findByNotebook: jest.fn(),
        findByStatus: jest.fn(),
        findByIdWithNotebook: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        delete: jest.fn(),
        canAccess: jest.fn(),
        count: jest.fn(),
      },
      jobRuns: {
        create: jest.fn(),
        findByJobId: jest.fn(),
        findLatestByJobId: jest.fn(),
        complete: jest.fn(),
        fail: jest.fn(),
        cancel: jest.fn(),
        findRunning: jest.fn(),
        getStatsByJobId: jest.fn(),
        cleanup: jest.fn(),
      },
      clusters: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findByStatus: jest.fn(),
        findByIdWithStats: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        terminate: jest.fn(),
        scale: jest.fn(),
        delete: jest.fn(),
      },
      tables: {
        findAll: jest.fn(),
        findById: jest.fn(),
        findForUser: jest.fn(),
        findByDatabaseAndName: jest.fn(),
        listDatabases: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateSchema: jest.fn(),
        setVisibility: jest.fn(),
        delete: jest.fn(),
        canAccess: jest.fn(),
      },
    };
  });

  // ============================================
  // WorkspaceService Tests
  // ============================================
  describe("WorkspaceService", () => {
    let service;

    beforeEach(() => {
      service = new WorkspaceService(mockRepositories, { logger: mockLogger });
    });

    describe("list", () => {
      it("should return workspaces for user", async () => {
        const mockWorkspaces = [{ id: 1, name: "Test" }];
        mockRepositories.workspaces.findForUser.mockResolvedValue(
          mockWorkspaces,
        );

        const result = await service.list({ id: 1, role: "user" });

        expect(result).toEqual(mockWorkspaces);
        expect(mockRepositories.workspaces.findForUser).toHaveBeenCalled();
      });
    });

    describe("getById", () => {
      it("should return workspace if found and accessible", async () => {
        const mockWorkspace = { id: 1, name: "Test", owner_id: 1 };
        mockRepositories.workspaces.findByIdWithStats.mockResolvedValue(
          mockWorkspace,
        );

        const result = await service.getById(1, { id: 1, role: "user" });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkspace);
      });

      it("should return NOT_FOUND if workspace doesn't exist", async () => {
        mockRepositories.workspaces.findByIdWithStats.mockResolvedValue(null);

        const result = await service.getById(999, { id: 1, role: "user" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("NOT_FOUND");
      });

      it("should return FORBIDDEN if user cannot access", async () => {
        const mockWorkspace = { id: 1, name: "Test", owner_id: 2 };
        mockRepositories.workspaces.findByIdWithStats.mockResolvedValue(
          mockWorkspace,
        );

        const result = await service.getById(1, { id: 1, role: "user" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("FORBIDDEN");
      });

      it("should allow admin access to any workspace", async () => {
        const mockWorkspace = { id: 1, name: "Test", owner_id: 2 };
        mockRepositories.workspaces.findByIdWithStats.mockResolvedValue(
          mockWorkspace,
        );

        const result = await service.getById(1, { id: 1, role: "admin" });

        expect(result.success).toBe(true);
      });
    });

    describe("create", () => {
      it("should create workspace and emit event", async () => {
        const mockWorkspace = { id: 1, name: "New Workspace", owner_id: 1 };
        mockRepositories.workspaces.create.mockResolvedValue(mockWorkspace);

        const result = await service.create(
          { name: "New Workspace", description: "Test" },
          { id: 1 },
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockWorkspace);
        expect(mockRepositories.workspaces.create).toHaveBeenCalledWith({
          name: "New Workspace",
          description: "Test",
          owner_id: 1,
        });
      });
    });

    describe("delete", () => {
      it("should prevent deletion of workspace with notebooks", async () => {
        mockRepositories.workspaces.findById.mockResolvedValue({
          id: 1,
          owner_id: 1,
        });
        mockRepositories.notebooks.count.mockResolvedValue(5);

        const result = await service.delete(1, { id: 1, role: "user" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("CONFLICT");
        expect(result.message).toContain("5 notebooks");
      });

      it("should delete empty workspace", async () => {
        mockRepositories.workspaces.findById.mockResolvedValue({
          id: 1,
          owner_id: 1,
        });
        mockRepositories.notebooks.count.mockResolvedValue(0);
        mockRepositories.workspaces.delete.mockResolvedValue(true);

        const result = await service.delete(1, { id: 1, role: "user" });

        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================
  // JobService Tests
  // ============================================
  describe("JobService", () => {
    let service;

    beforeEach(() => {
      service = new JobService(mockRepositories, { logger: mockLogger });
    });

    describe("run", () => {
      it("should queue job for execution", async () => {
        mockRepositories.jobs.findById.mockResolvedValue({
          id: 1,
          status: "completed",
          owner_id: 1,
        });
        mockRepositories.jobs.canAccess.mockResolvedValue(true);
        mockRepositories.jobs.updateStatus.mockResolvedValue({
          id: 1,
          status: "pending",
        });

        const result = await service.run(1, { id: 1 });

        expect(result.success).toBe(true);
        expect(result.data.status).toBe("pending");
        expect(result.message).toContain("queued");
      });

      it("should prevent running already running job", async () => {
        mockRepositories.jobs.findById.mockResolvedValue({
          id: 1,
          status: "running",
          owner_id: 1,
        });
        mockRepositories.jobs.canAccess.mockResolvedValue(true);

        const result = await service.run(1, { id: 1 });

        expect(result.success).toBe(false);
        expect(result.error).toBe("CONFLICT");
      });
    });

    describe("cancel", () => {
      it("should cancel running job", async () => {
        mockRepositories.jobs.findById.mockResolvedValue({
          id: 1,
          status: "running",
          owner_id: 1,
        });
        mockRepositories.jobs.canAccess.mockResolvedValue(true);
        mockRepositories.jobs.updateStatus.mockResolvedValue({
          id: 1,
          status: "cancelled",
        });

        const result = await service.cancel(1, { id: 1 });

        expect(result.success).toBe(true);
        expect(result.data.status).toBe("cancelled");
      });

      it("should prevent cancelling completed job", async () => {
        mockRepositories.jobs.findById.mockResolvedValue({
          id: 1,
          status: "completed",
          owner_id: 1,
        });
        mockRepositories.jobs.canAccess.mockResolvedValue(true);

        const result = await service.cancel(1, { id: 1 });

        expect(result.success).toBe(false);
        expect(result.error).toBe("CONFLICT");
      });
    });

    describe("isValidCronExpression", () => {
      it("should validate correct cron expressions", () => {
        expect(service.isValidCronExpression("0 * * * *")).toBe(true);
        expect(service.isValidCronExpression("0 0 * * * *")).toBe(true);
        expect(service.isValidCronExpression("*/5 * * * *")).toBe(true);
      });

      it("should reject invalid cron expressions", () => {
        expect(service.isValidCronExpression("invalid")).toBe(false);
        expect(service.isValidCronExpression("")).toBe(false);
        expect(service.isValidCronExpression("0 *")).toBe(false);
      });
    });
  });

  // ============================================
  // ClusterService Tests
  // ============================================
  describe("ClusterService", () => {
    let service;

    beforeEach(() => {
      service = new ClusterService(mockRepositories, { logger: mockLogger });
    });

    describe("create", () => {
      it("should only allow admins to create clusters", async () => {
        const result = await service.create(
          { name: "Test Cluster" },
          { id: 1, role: "user" },
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("FORBIDDEN");
      });

      it("should create cluster for admin", async () => {
        const mockCluster = { id: 1, name: "Test", status: "terminated" };
        mockRepositories.clusters.create.mockResolvedValue(mockCluster);

        const result = await service.create(
          { name: "Test Cluster" },
          { id: 1, role: "admin" },
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCluster);
      });

      it("should validate node type", async () => {
        const result = await service.create(
          { name: "Test", node_type: "invalid_type" },
          { id: 1, role: "admin" },
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("VALIDATION");
      });
    });

    describe("start", () => {
      it("should start terminated cluster", async () => {
        mockRepositories.clusters.findById.mockResolvedValue({
          id: 1,
          status: "terminated",
        });
        mockRepositories.clusters.start.mockResolvedValue({
          id: 1,
          status: "starting",
        });

        const result = await service.start(1, { id: 1, role: "admin" });

        expect(result.success).toBe(true);
        expect(result.data.status).toBe("starting");
      });

      it("should prevent starting running cluster", async () => {
        mockRepositories.clusters.findById.mockResolvedValue({
          id: 1,
          status: "running",
        });

        const result = await service.start(1, { id: 1, role: "admin" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("CONFLICT");
      });
    });

    describe("scale", () => {
      it("should scale cluster workers within limits", async () => {
        mockRepositories.clusters.findById.mockResolvedValue({
          id: 1,
          node_type: "standard",
          num_workers: 2,
        });
        mockRepositories.clusters.scale.mockResolvedValue({
          id: 1,
          num_workers: 5,
        });

        const result = await service.scale(1, 5, { id: 1, role: "admin" });

        expect(result.success).toBe(true);
        expect(result.data.num_workers).toBe(5);
      });

      it("should reject invalid worker count", async () => {
        mockRepositories.clusters.findById.mockResolvedValue({
          id: 1,
          node_type: "standard", // maxWorkers: 8
          num_workers: 2,
        });

        const result = await service.scale(1, 100, { id: 1, role: "admin" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("VALIDATION");
      });
    });
  });

  // ============================================
  // TableService Tests
  // ============================================
  describe("TableService", () => {
    let service;

    beforeEach(() => {
      service = new TableService(mockRepositories, { logger: mockLogger });
    });

    describe("create", () => {
      it("should create table with valid format", async () => {
        mockRepositories.tables.findByDatabaseAndName.mockResolvedValue(null);
        mockRepositories.tables.create.mockResolvedValue({
          id: 1,
          name: "users",
          database: "default",
          format: "delta",
        });

        const result = await service.create(
          { name: "users", format: "delta" },
          { id: 1 },
        );

        expect(result.success).toBe(true);
      });

      it("should reject invalid format", async () => {
        const result = await service.create(
          { name: "users", format: "invalid_format" },
          { id: 1 },
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("VALIDATION");
      });

      it("should prevent duplicate tables", async () => {
        mockRepositories.tables.findByDatabaseAndName.mockResolvedValue({
          id: 1,
        });

        const result = await service.create(
          { name: "users", database: "default" },
          { id: 1 },
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("DUPLICATE");
      });
    });

    describe("isValidSchema", () => {
      it("should validate correct schema", () => {
        const schema = {
          fields: [
            { name: "id", type: "integer" },
            { name: "name", type: "string" },
          ],
        };
        expect(service.isValidSchema(schema)).toBe(true);
      });

      it("should reject invalid schema", () => {
        expect(service.isValidSchema(null)).toBe(false);
        expect(service.isValidSchema({})).toBe(false);
        expect(service.isValidSchema({ fields: "not an array" })).toBe(false);
        expect(service.isValidSchema({ fields: [{ name: "" }] })).toBe(false);
      });
    });
  });

  // ============================================
  // JobRunService Tests
  // ============================================
  describe("JobRunService", () => {
    let service;

    beforeEach(() => {
      service = new JobRunService(mockRepositories, { logger: mockLogger });
    });

    describe("startRun", () => {
      it("should create a new run record", async () => {
        const mockJob = { id: 1, name: "Test Job" };
        const mockRun = {
          id: 1,
          job_id: 1,
          status: "running",
          started_at: new Date(),
        };

        mockRepositories.jobs.findById.mockResolvedValue(mockJob);
        mockRepositories.jobRuns.create.mockResolvedValue(mockRun);

        const result = await service.startRun(1);

        expect(result).toEqual(mockRun);
        expect(mockRepositories.jobRuns.create).toHaveBeenCalledWith({
          job_id: 1,
          status: "running",
        });
      });

      it("should throw if job not found", async () => {
        mockRepositories.jobs.findById.mockResolvedValue(null);

        await expect(service.startRun(999)).rejects.toThrow("Job not found");
      });
    });

    describe("completeRun", () => {
      it("should complete a run successfully", async () => {
        const mockRun = {
          id: 1,
          job_id: 1,
          status: "completed",
          ended_at: new Date(),
          duration_seconds: 60,
        };

        mockRepositories.jobRuns.complete.mockResolvedValue(mockRun);
        mockRepositories.jobs.update.mockResolvedValue({});

        const result = await service.completeRun(1, "Output logs");

        expect(result).toEqual(mockRun);
        expect(mockRepositories.jobRuns.complete).toHaveBeenCalledWith(
          1,
          "Output logs",
        );
        expect(mockRepositories.jobs.update).toHaveBeenCalledWith(1, {
          last_run_at: mockRun.ended_at,
        });
      });

      it("should throw if run not found", async () => {
        mockRepositories.jobRuns.complete.mockResolvedValue(null);

        await expect(service.completeRun(999)).rejects.toThrow("Run not found");
      });
    });

    describe("failRun", () => {
      it("should mark a run as failed with error message", async () => {
        const mockRun = {
          id: 1,
          job_id: 1,
          status: "failed",
          error_message: "Execution failed",
          ended_at: new Date(),
          duration_seconds: 30,
        };

        mockRepositories.jobRuns.fail.mockResolvedValue(mockRun);
        mockRepositories.jobs.update.mockResolvedValue({});

        const result = await service.failRun(1, "Execution failed");

        expect(result).toEqual(mockRun);
        expect(mockRepositories.jobRuns.fail).toHaveBeenCalledWith(
          1,
          "Execution failed",
        );
      });
    });

    describe("cancelRun", () => {
      it("should cancel a running job run", async () => {
        const mockRun = {
          id: 1,
          job_id: 1,
          status: "cancelled",
          ended_at: new Date(),
        };

        mockRepositories.jobRuns.cancel.mockResolvedValue(mockRun);

        const result = await service.cancelRun(1);

        expect(result).toEqual(mockRun);
        expect(mockRepositories.jobRuns.cancel).toHaveBeenCalledWith(1);
      });
    });

    describe("getRunsForJob", () => {
      it("should return run history for a job", async () => {
        const mockRuns = [
          { id: 2, job_id: 1, status: "completed" },
          { id: 1, job_id: 1, status: "failed" },
        ];

        mockRepositories.jobRuns.findByJobId.mockResolvedValue(mockRuns);

        const result = await service.getRunsForJob(1, { limit: 10 });

        expect(result).toEqual(mockRuns);
        expect(mockRepositories.jobRuns.findByJobId).toHaveBeenCalledWith(1, {
          limit: 10,
        });
      });
    });

    describe("getStatsForJob", () => {
      it("should return run statistics", async () => {
        const mockStats = {
          total_runs: 10,
          successful_runs: 8,
          failed_runs: 2,
          avg_duration_seconds: 45,
          success_rate: 80,
        };

        mockRepositories.jobRuns.getStatsByJobId.mockResolvedValue(mockStats);

        const result = await service.getStatsForJob(1);

        expect(result).toEqual(mockStats);
      });
    });

    describe("cleanupOldRuns", () => {
      it("should cleanup old runs based on retention policy", async () => {
        mockRepositories.jobRuns.cleanup.mockResolvedValue(5);

        const result = await service.cleanupOldRuns(30);

        expect(result).toBe(5);
        expect(mockRepositories.jobRuns.cleanup).toHaveBeenCalledWith(30);
      });
    });
  });

  // ============================================
  // createServices Factory Tests
  // ============================================
  describe("createServices", () => {
    it("should create all service instances", () => {
      const services = createServices(mockRepositories, { logger: mockLogger });

      expect(services.workspaces).toBeInstanceOf(WorkspaceService);
      expect(services.notebooks).toBeInstanceOf(NotebookService);
      expect(services.jobs).toBeInstanceOf(JobService);
      expect(services.jobRuns).toBeInstanceOf(JobRunService);
      expect(services.clusters).toBeInstanceOf(ClusterService);
      expect(services.tables).toBeInstanceOf(TableService);
    });
  });
});
