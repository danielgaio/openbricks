/**
 * DTO Tests
 * Tests for Data Transfer Object transformations
 *
 * Verifies:
 * - Field filtering (exclude sensitive data)
 * - Entity to DTO transformation
 * - List transformation with pagination
 * - Null/undefined handling
 */

const {
  UserDTO,
  UserDetailDTO,
  WorkspaceDTO,
  WorkspaceDetailDTO,
  NotebookDTO,
  NotebookDetailDTO,
  JobDTO,
  JobDetailDTO,
  JobRunDTO,
  ClusterDTO,
  ClusterDetailDTO,
  TableDTO,
  TableDetailDTO,
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
} = require("../dtos");

describe("User DTOs", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    name: "Test User",
    role: "user",
    password: "hashed_password_should_be_excluded",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  describe("UserDTO", () => {
    it("should transform user entity excluding sensitive fields", () => {
      const dto = UserDTO.fromEntity(mockUser);

      expect(dto).toEqual({
        id: 1,
        email: "user@example.com",
        name: "Test User",
        role: "user",
      });
      expect(dto.password).toBeUndefined();
    });

    it("should handle null input", () => {
      expect(UserDTO.fromEntity(null)).toBeNull();
      expect(UserDTO.fromEntity(undefined)).toBeNull();
    });

    it("should transform array of users", () => {
      const dtos = UserDTO.fromEntities([mockUser, mockUser]);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].password).toBeUndefined();
    });

    it("should handle empty array", () => {
      expect(UserDTO.fromEntities([])).toEqual([]);
      expect(UserDTO.fromEntities(null)).toEqual([]);
    });
  });

  describe("UserDetailDTO", () => {
    it("should include timestamps", () => {
      const dto = UserDetailDTO.fromEntity(mockUser);

      expect(dto.created_at).toBe("2024-01-01T00:00:00Z");
      expect(dto.updated_at).toBe("2024-01-02T00:00:00Z");
      expect(dto.password).toBeUndefined();
    });
  });
});

describe("Workspace DTOs", () => {
  const mockWorkspace = {
    id: 1,
    name: "Test Workspace",
    description: "A test workspace",
    owner_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    owner: {
      id: 1,
      email: "owner@example.com",
      name: "Owner",
      role: "admin",
    },
  };

  describe("WorkspaceDTO", () => {
    it("should transform workspace entity", () => {
      const dto = WorkspaceDTO.fromEntity(mockWorkspace);

      expect(dto).toEqual({
        id: 1,
        name: "Test Workspace",
        description: "A test workspace",
        owner_id: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });
    });

    it("should include owner when requested", () => {
      const dto = WorkspaceDTO.fromEntity(mockWorkspace, {
        includeOwner: true,
      });

      expect(dto.owner).toBeDefined();
      expect(dto.owner.id).toBe(1);
      expect(dto.owner.password).toBeUndefined();
    });

    it("should handle null description", () => {
      const workspace = { ...mockWorkspace, description: null };
      const dto = WorkspaceDTO.fromEntity(workspace);

      expect(dto.description).toBeNull();
    });
  });

  describe("WorkspaceDetailDTO", () => {
    it("should include notebooks count when available", () => {
      const workspace = { ...mockWorkspace, notebooks_count: 5 };
      const dto = WorkspaceDetailDTO.fromEntity(workspace);

      expect(dto.notebooks_count).toBe(5);
    });

    it("should include notebooks list when available", () => {
      const workspace = {
        ...mockWorkspace,
        notebooks: [
          { id: 1, name: "Notebook 1", language: "python" },
          { id: 2, name: "Notebook 2", language: "sql" },
        ],
      };
      const dto = WorkspaceDetailDTO.fromEntity(workspace);

      expect(dto.notebooks).toHaveLength(2);
      expect(dto.notebooks[0].name).toBe("Notebook 1");
    });
  });
});

describe("Notebook DTOs", () => {
  const mockNotebook = {
    id: 1,
    name: "Test Notebook",
    language: "python",
    workspace_id: 1,
    content: "print('Hello World')",
    owner_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  describe("NotebookDTO", () => {
    it("should transform notebook excluding content (for lists)", () => {
      const dto = NotebookDTO.fromEntity(mockNotebook);

      expect(dto.id).toBe(1);
      expect(dto.name).toBe("Test Notebook");
      expect(dto.language).toBe("python");
      expect(dto.content).toBeUndefined();
    });
  });

  describe("NotebookDetailDTO", () => {
    it("should include content for detail view", () => {
      const dto = NotebookDetailDTO.fromEntity(mockNotebook);

      expect(dto.content).toBe("print('Hello World')");
      expect(dto.content_size).toBe(20);
    });

    it("should handle empty content", () => {
      const notebook = { ...mockNotebook, content: "" };
      const dto = NotebookDetailDTO.fromEntity(notebook);

      expect(dto.content).toBe("");
    });
  });
});

describe("Job DTOs", () => {
  const mockJob = {
    id: 1,
    name: "Test Job",
    notebook_id: 1,
    status: "running",
    schedule: "0 * * * *",
    last_run_at: "2024-01-01T10:00:00Z",
    next_run_at: "2024-01-01T11:00:00Z",
    owner_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  describe("JobDTO", () => {
    it("should transform job with status display", () => {
      const dto = JobDTO.fromEntity(mockJob);

      expect(dto.status).toBe("running");
      expect(dto.status_display).toBe("Running");
    });

    it("should handle all job statuses", () => {
      const statuses = [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ];

      statuses.forEach((status) => {
        const job = { ...mockJob, status };
        const dto = JobDTO.fromEntity(job);
        expect(dto.status_display).toBeDefined();
      });
    });
  });

  describe("JobDetailDTO", () => {
    it("should include notebook info when available", () => {
      const job = {
        ...mockJob,
        notebook: { id: 1, name: "My Notebook", language: "python" },
      };
      const dto = JobDetailDTO.fromEntity(job);

      expect(dto.notebook).toBeDefined();
      expect(dto.notebook.name).toBe("My Notebook");
    });

    it("should include recent runs when available", () => {
      const job = {
        ...mockJob,
        runs: [
          {
            id: 1,
            status: "completed",
            started_at: "2024-01-01T10:00:00Z",
            ended_at: "2024-01-01T10:05:00Z",
            duration_seconds: 300,
          },
        ],
      };
      const dto = JobDetailDTO.fromEntity(job);

      expect(dto.recent_runs).toHaveLength(1);
      expect(dto.runs_count).toBe(1);
    });
  });

  describe("JobRunDTO", () => {
    it("should transform job run", () => {
      const run = {
        id: 1,
        status: "completed",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T10:05:00Z",
        duration_seconds: 300,
        error_message: null,
      };
      const dto = JobRunDTO.fromEntity(run);

      expect(dto).toEqual({
        id: 1,
        status: "completed",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T10:05:00Z",
        duration_seconds: 300,
        error_message: null,
      });
    });
  });
});

describe("Cluster DTOs", () => {
  const mockCluster = {
    id: 1,
    name: "Test Cluster",
    status: "running",
    node_type: "standard",
    num_workers: 2,
    driver_memory: "4g",
    executor_memory: "4g",
    spark_version: "3.5.0",
    owner_id: 1,
    started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    terminated_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  describe("ClusterDTO", () => {
    it("should transform cluster with action hints", () => {
      const dto = ClusterDTO.fromEntity(mockCluster);

      expect(dto.status).toBe("running");
      expect(dto.status_display).toBe("Running");
      expect(dto.actions).toEqual({
        can_start: false,
        can_stop: true,
        can_scale: true,
      });
    });

    it("should set correct actions for terminated cluster", () => {
      const cluster = { ...mockCluster, status: "terminated" };
      const dto = ClusterDTO.fromEntity(cluster);

      expect(dto.actions.can_start).toBe(true);
      expect(dto.actions.can_stop).toBe(false);
      expect(dto.actions.can_scale).toBe(false);
    });
  });

  describe("ClusterDetailDTO", () => {
    it("should include memory configuration", () => {
      const dto = ClusterDetailDTO.fromEntity(mockCluster);

      expect(dto.driver_memory).toBe("4g");
      expect(dto.executor_memory).toBe("4g");
    });

    it("should calculate runtime for running cluster", () => {
      const dto = ClusterDetailDTO.fromEntity(mockCluster);

      expect(dto.runtime_seconds).toBeDefined();
      expect(dto.runtime_seconds).toBeGreaterThan(0);
    });
  });
});

describe("Table DTOs", () => {
  const mockTable = {
    id: 1,
    name: "test_table",
    database: "default",
    format: "delta",
    location: "s3://bucket/tables/test",
    schema_definition: {
      columns: [
        { name: "id", type: "bigint", nullable: false },
        { name: "name", type: "string", nullable: true },
      ],
    },
    is_public: true,
    owner_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };

  describe("TableDTO", () => {
    it("should transform table with full name", () => {
      const dto = TableDTO.fromEntity(mockTable);

      expect(dto.full_name).toBe("default.test_table");
      expect(dto.format_display).toBe("Delta Lake");
    });

    it("should handle different formats", () => {
      const formats = ["delta", "parquet", "csv", "json"];

      formats.forEach((format) => {
        const table = { ...mockTable, format };
        const dto = TableDTO.fromEntity(table);
        expect(dto.format_display).toBeDefined();
      });
    });
  });

  describe("TableDetailDTO", () => {
    it("should include schema information", () => {
      const dto = TableDetailDTO.fromEntity(mockTable);

      expect(dto.location).toBe("s3://bucket/tables/test");
      expect(dto.schema_definition).toBeDefined();
      expect(dto.column_count).toBe(2);
      expect(dto.columns).toHaveLength(2);
    });

    it("should format columns with defaults", () => {
      const dto = TableDetailDTO.fromEntity(mockTable);

      expect(dto.columns[0]).toEqual({
        name: "id",
        type: "bigint",
        nullable: false,
      });
      expect(dto.columns[1].nullable).toBe(true);
    });
  });
});

describe("Response DTOs", () => {
  describe("createPaginatedResponse", () => {
    it("should create paginated response", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = createPaginatedResponse(data, {
        total: 10,
        limit: 2,
        offset: 0,
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.meta.pagination).toEqual({
        total: 10,
        limit: 2,
        offset: 0,
        has_more: true,
        page: 1,
        total_pages: 5,
      });
    });

    it("should handle last page", () => {
      const response = createPaginatedResponse([{ id: 1 }], {
        total: 5,
        limit: 2,
        offset: 4,
      });

      expect(response.meta.pagination.has_more).toBe(false);
      expect(response.meta.pagination.page).toBe(3);
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response", () => {
      const response = createErrorResponse("NOT_FOUND", "Resource not found", {
        resourceId: 123,
      });

      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: "NOT_FOUND",
        message: "Resource not found",
        resourceId: 123,
      });
    });
  });

  describe("createSuccessResponse", () => {
    it("should create success response", () => {
      const response = createSuccessResponse({ id: 1, name: "Test" });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1, name: "Test" });
    });

    it("should include meta when provided", () => {
      const response = createSuccessResponse({ id: 1 }, { version: "1.0" });

      expect(response.meta).toEqual({ version: "1.0" });
    });
  });
});
