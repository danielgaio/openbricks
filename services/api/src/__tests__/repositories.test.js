/**
 * Repository Tests
 * Unit tests for the Repository Pattern implementation
 */

const { Pool } = require("pg");
const {
  BaseRepository,
  WorkspaceRepository,
  NotebookRepository,
  JobRepository,
  ClusterRepository,
  TableRepository,
  createRepositories,
} = require("../repositories");

// Mock pg Pool
jest.mock("pg", () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe("Repository Pattern", () => {
  let pool;
  let mockClient;

  beforeEach(() => {
    pool = new Pool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  // ============================================
  // BaseRepository Tests
  // ============================================
  describe("BaseRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new BaseRepository(pool, "test_table");
    });

    describe("findAll", () => {
      it("should return all records", async () => {
        const mockRows = [{ id: 1 }, { id: 2 }];
        pool.query.mockResolvedValue({ rows: mockRows });

        const result = await repository.findAll();

        expect(result).toEqual(mockRows);
        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table"',
          [],
        );
      });

      it("should apply WHERE conditions", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await repository.findAll({
          where: { status: "active", type: "standard" },
        });

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table" WHERE "status" = $1 AND "type" = $2',
          ["active", "standard"],
        );
      });

      it("should apply pagination", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await repository.findAll({ limit: 10, offset: 20 });

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table" LIMIT $1 OFFSET $2',
          [10, 20],
        );
      });

      it("should apply ordering", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await repository.findAll({ orderBy: "created_at", order: "DESC" });

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table" ORDER BY "created_at" DESC',
          [],
        );
      });

      it("should support advanced WHERE operators", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await repository.findAll({
          where: {
            count: { gt: 5, lt: 10 },
            status: { ne: "deleted" },
          },
        });

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table" WHERE "count" > $1 AND "count" < $2 AND "status" != $3',
          [5, 10, "deleted"],
        );
      });
    });

    describe("findById", () => {
      it("should return a record by id", async () => {
        const mockRow = { id: 1, name: "Test" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.findById(1);

        expect(result).toEqual(mockRow);
        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "test_table" WHERE "id" = $1',
          [1],
        );
      });

      it("should return null if not found", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const result = await repository.findById(999);

        expect(result).toBeNull();
      });
    });

    describe("create", () => {
      it("should insert a new record", async () => {
        const mockRow = { id: 1, name: "Test", status: "active" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.create({
          name: "Test",
          status: "active",
        });

        expect(result).toEqual(mockRow);
        expect(pool.query).toHaveBeenCalledWith(
          'INSERT INTO "test_table" ("name", "status") VALUES ($1, $2) RETURNING *',
          ["Test", "active"],
        );
      });
    });

    describe("update", () => {
      it("should update a record", async () => {
        const mockRow = { id: 1, name: "Updated", status: "active" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.update(1, { name: "Updated" });

        expect(result).toEqual(mockRow);
        expect(pool.query).toHaveBeenCalledWith(
          'UPDATE "test_table" SET "name" = $1 WHERE "id" = $2 RETURNING *',
          ["Updated", 1],
        );
      });

      it("should return null if not found", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        const result = await repository.update(999, { name: "Updated" });

        expect(result).toBeNull();
      });
    });

    describe("delete", () => {
      it("should delete a record", async () => {
        pool.query.mockResolvedValue({ rowCount: 1 });

        const result = await repository.delete(1);

        expect(result).toBe(true);
        expect(pool.query).toHaveBeenCalledWith(
          'DELETE FROM "test_table" WHERE "id" = $1',
          [1],
        );
      });

      it("should return false if not found", async () => {
        pool.query.mockResolvedValue({ rowCount: 0 });

        const result = await repository.delete(999);

        expect(result).toBe(false);
      });
    });

    describe("exists", () => {
      it("should return true if record exists", async () => {
        pool.query.mockResolvedValue({ rows: [{ exists: true }] });

        const result = await repository.exists({ id: 1 });

        expect(result).toBe(true);
      });

      it("should return false if record does not exist", async () => {
        pool.query.mockResolvedValue({ rows: [{ exists: false }] });

        const result = await repository.exists({ id: 999 });

        expect(result).toBe(false);
      });
    });

    describe("count", () => {
      it("should return record count", async () => {
        pool.query.mockResolvedValue({ rows: [{ count: "42" }] });

        const result = await repository.count();

        expect(result).toBe(42);
      });

      it("should apply WHERE conditions", async () => {
        pool.query.mockResolvedValue({ rows: [{ count: "10" }] });

        const result = await repository.count({ status: "active" });

        expect(result).toBe(10);
        expect(pool.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM "test_table" WHERE "status" = $1',
          ["active"],
        );
      });
    });

    describe("transaction", () => {
      it("should execute callback in transaction", async () => {
        const mockResult = { success: true };
        mockClient.query.mockResolvedValue({ rows: [] });

        const callback = jest.fn().mockResolvedValue(mockResult);
        const result = await repository.transaction(callback);

        expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
        expect(callback).toHaveBeenCalledWith(mockClient);
        expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        expect(mockClient.release).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });

      it("should rollback on error", async () => {
        mockClient.query.mockResolvedValue({ rows: [] });
        const error = new Error("Transaction failed");
        const callback = jest.fn().mockRejectedValue(error);

        await expect(repository.transaction(callback)).rejects.toThrow(
          "Transaction failed",
        );

        expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // WorkspaceRepository Tests
  // ============================================
  describe("WorkspaceRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new WorkspaceRepository(pool);
    });

    describe("findForUser", () => {
      it("should return all workspaces for admin", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });

        await repository.findForUser({ id: 1, role: "admin" });

        expect(pool.query.mock.calls[0][0]).toContain("SELECT * FROM");
        expect(pool.query.mock.calls[0][0]).toContain("ORDER BY");
      });

      it("should return only owned workspaces for regular user", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

        await repository.findForUser({ id: 1, role: "user" });

        expect(pool.query.mock.calls[0][0]).toContain("owner_id");
      });
    });

    describe("isOwner", () => {
      it("should return true if user owns workspace", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1, owner_id: 1 }] });

        const result = await repository.isOwner(1, 1);

        expect(result).toBe(true);
      });

      it("should return false if user does not own workspace", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1, owner_id: 2 }] });

        const result = await repository.isOwner(1, 1);

        expect(result).toBe(false);
      });
    });

    describe("canAccess", () => {
      it("should return true for admin", async () => {
        const result = await repository.canAccess(1, { id: 1, role: "admin" });

        expect(result).toBe(true);
      });

      it("should return true for owner", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1, owner_id: 1 }] });

        const result = await repository.canAccess(1, { id: 1, role: "user" });

        expect(result).toBe(true);
      });
    });
  });

  // ============================================
  // NotebookRepository Tests
  // ============================================
  describe("NotebookRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new NotebookRepository(pool);
    });

    describe("findByWorkspace", () => {
      it("should return notebooks for a workspace", async () => {
        const mockRows = [{ id: 1, workspace_id: 1 }];
        pool.query.mockResolvedValue({ rows: mockRows });

        const result = await repository.findByWorkspace(1);

        expect(result).toEqual(mockRows);
        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "notebooks" WHERE "workspace_id" = $1',
          [1],
        );
      });
    });

    describe("updateContent", () => {
      it("should update notebook content", async () => {
        const mockRow = { id: 1, content: "new content" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.updateContent(1, "new content");

        expect(result).toEqual(mockRow);
        expect(pool.query.mock.calls[0][0]).toContain("content");
        expect(pool.query.mock.calls[0][0]).toContain("updated_at");
      });
    });
  });

  // ============================================
  // JobRepository Tests
  // ============================================
  describe("JobRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new JobRepository(pool);
    });

    describe("findByStatus", () => {
      it("should return jobs with given status", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1, status: "running" }] });

        await repository.findByStatus("running");

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "jobs" WHERE "status" = $1',
          ["running"],
        );
      });
    });

    describe("findPendingJobs", () => {
      it("should return pending jobs", async () => {
        pool.query.mockResolvedValue({ rows: [] });

        await repository.findPendingJobs();

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "jobs" WHERE "status" = $1',
          ["pending"],
        );
      });
    });

    describe("updateStatus", () => {
      it("should update job status", async () => {
        const mockRow = { id: 1, status: "completed" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.updateStatus(1, "completed");

        expect(result).toEqual(mockRow);
      });
    });
  });

  // ============================================
  // ClusterRepository Tests
  // ============================================
  describe("ClusterRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new ClusterRepository(pool);
    });

    describe("findRunning", () => {
      it("should return running clusters", async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 1, status: "running" }] });

        await repository.findRunning();

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "clusters" WHERE "status" = $1',
          ["running"],
        );
      });
    });

    describe("start", () => {
      it("should start a cluster", async () => {
        pool.query.mockResolvedValue({
          rows: [{ id: 1, status: "starting" }],
        });

        const result = await repository.start(1);

        expect(result.status).toBe("starting");
      });
    });

    describe("stop", () => {
      it("should stop a cluster", async () => {
        pool.query.mockResolvedValue({
          rows: [{ id: 1, status: "stopping" }],
        });

        const result = await repository.stop(1);

        expect(result.status).toBe("stopping");
      });
    });

    describe("scale", () => {
      it("should scale cluster workers", async () => {
        pool.query.mockResolvedValue({
          rows: [{ id: 1, num_workers: 5 }],
        });

        const result = await repository.scale(1, 5);

        expect(result.num_workers).toBe(5);
      });
    });
  });

  // ============================================
  // TableRepository Tests
  // ============================================
  describe("TableRepository", () => {
    let repository;

    beforeEach(() => {
      repository = new TableRepository(pool);
    });

    describe("findByDatabaseAndName", () => {
      it("should find table by database and name", async () => {
        const mockRow = { id: 1, database: "default", name: "users" };
        pool.query.mockResolvedValue({ rows: [mockRow] });

        const result = await repository.findByDatabaseAndName(
          "default",
          "users",
        );

        expect(result).toEqual(mockRow);
        expect(pool.query).toHaveBeenCalledWith(
          'SELECT * FROM "data_tables" WHERE "database" = $1 AND "name" = $2',
          ["default", "users"],
        );
      });
    });

    describe("listDatabases", () => {
      it("should list unique databases", async () => {
        pool.query.mockResolvedValue({
          rows: [{ database: "default" }, { database: "analytics" }],
        });

        const result = await repository.listDatabases();

        expect(result).toEqual(["default", "analytics"]);
      });
    });

    describe("setVisibility", () => {
      it("should set table visibility", async () => {
        pool.query.mockResolvedValue({
          rows: [{ id: 1, is_public: true }],
        });

        const result = await repository.setVisibility(1, true);

        expect(result.is_public).toBe(true);
      });
    });
  });

  // ============================================
  // createRepositories Factory Tests
  // ============================================
  describe("createRepositories", () => {
    it("should create all repository instances", () => {
      const repos = createRepositories(pool);

      expect(repos.workspaces).toBeInstanceOf(WorkspaceRepository);
      expect(repos.notebooks).toBeInstanceOf(NotebookRepository);
      expect(repos.jobs).toBeInstanceOf(JobRepository);
      expect(repos.clusters).toBeInstanceOf(ClusterRepository);
      expect(repos.tables).toBeInstanceOf(TableRepository);
    });
  });
});
