/**
 * Validation Utilities Tests
 * Comprehensive test suite for validation middleware
 */

const request = require("supertest");
const express = require("express");
const {
  common,
  validate,
  handleValidationErrors,
  body,
} = require("../utils/validation");
const {
  errorHandler,
  errors,
  asyncHandler,
  ApiError,
} = require("../utils/errors");

describe("Validation Utilities", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe("common.requiredString", () => {
    beforeEach(() => {
      app.post(
        "/test",
        validate([common.requiredString("name", { min: 2, max: 50 })]),
        (req, res) => res.json({ success: true, name: req.body.name }),
      );
      app.use(errorHandler);
    });

    it("should accept valid string", async () => {
      const response = await request(app)
        .post("/test")
        .send({ name: "Valid Name" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.name).toBe("Valid Name");
    });

    it("should trim whitespace", async () => {
      const response = await request(app)
        .post("/test")
        .send({ name: "  Trimmed  " })
        .expect(200);

      expect(response.body.name).toBe("Trimmed");
    });

    it("should reject missing field", async () => {
      const response = await request(app).post("/test").send({}).expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(response.body.details[0].field).toBe("name");
    });

    it("should reject too short string", async () => {
      const response = await request(app)
        .post("/test")
        .send({ name: "a" })
        .expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject too long string", async () => {
      const response = await request(app)
        .post("/test")
        .send({ name: "a".repeat(51) })
        .expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("common.optionalString", () => {
    beforeEach(() => {
      app.post(
        "/test",
        validate([common.optionalString("description", { max: 100 })]),
        (req, res) =>
          res.json({ success: true, description: req.body.description }),
      );
      app.use(errorHandler);
    });

    it("should accept missing field", async () => {
      const response = await request(app).post("/test").send({}).expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should accept null value", async () => {
      const response = await request(app)
        .post("/test")
        .send({ description: null })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should accept valid string", async () => {
      const response = await request(app)
        .post("/test")
        .send({ description: "Valid description" })
        .expect(200);

      expect(response.body.description).toBe("Valid description");
    });

    it("should reject too long string", async () => {
      const response = await request(app)
        .post("/test")
        .send({ description: "a".repeat(101) })
        .expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("common.requiredInt", () => {
    beforeEach(() => {
      app.post("/test", validate([common.requiredInt("count")]), (req, res) =>
        res.json({ success: true, count: req.body.count }),
      );
      app.use(errorHandler);
    });

    it("should accept valid integer", async () => {
      const response = await request(app)
        .post("/test")
        .send({ count: 42 })
        .expect(200);

      expect(response.body.count).toBe(42);
    });

    it("should convert string integer", async () => {
      const response = await request(app)
        .post("/test")
        .send({ count: "42" })
        .expect(200);

      expect(response.body.count).toBe(42);
    });

    it("should reject missing field", async () => {
      const response = await request(app).post("/test").send({}).expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject non-integer", async () => {
      const response = await request(app)
        .post("/test")
        .send({ count: "not a number" })
        .expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("common.idParam", () => {
    beforeEach(() => {
      app.get("/test/:id", validate([common.idParam("id")]), (req, res) =>
        res.json({ success: true, id: req.params.id }),
      );
      app.use(errorHandler);
    });

    it("should accept valid positive integer", async () => {
      const response = await request(app).get("/test/123").expect(200);

      expect(response.body.id).toBe(123);
    });

    it("should reject zero", async () => {
      const response = await request(app).get("/test/0").expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject negative number", async () => {
      const response = await request(app).get("/test/-1").expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject non-numeric string", async () => {
      const response = await request(app).get("/test/abc").expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("common.pagination", () => {
    beforeEach(() => {
      app.get("/test", validate(common.pagination()), (req, res) =>
        res.json({
          page: req.query.page || 1,
          limit: req.query.limit || 10,
        }),
      );
      app.use(errorHandler);
    });

    it("should accept valid pagination params", async () => {
      const response = await request(app)
        .get("/test?page=2&limit=20")
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(20);
    });

    it("should accept request without pagination", async () => {
      const response = await request(app).get("/test").expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it("should reject page < 1", async () => {
      const response = await request(app).get("/test?page=0").expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject limit > 100", async () => {
      const response = await request(app).get("/test?limit=101").expect(400);

      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });
});

describe("Error Handling", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe("ApiError", () => {
    it("should create error with correct properties", () => {
      const error = new ApiError("Test error", 400, "TEST_ERROR", {
        field: "test",
      });

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.details).toEqual({ field: "test" });
      expect(error.isOperational).toBe(true);
    });

    it("should serialize to JSON correctly", () => {
      const error = new ApiError("Test error", 400, "TEST_ERROR", {
        field: "test",
      });
      const json = error.toJSON();

      expect(json.error).toBe("Test error");
      expect(json.code).toBe("TEST_ERROR");
      expect(json.details).toEqual({ field: "test" });
    });
  });

  describe("errors factory functions", () => {
    it("should create notFound error", () => {
      const error = errors.notFound("User");

      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should create forbidden error", () => {
      const error = errors.forbidden("Access denied");

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });

    it("should create validation error", () => {
      const error = errors.validation("Invalid input", [{ field: "name" }]);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details).toEqual([{ field: "name" }]);
    });
  });

  describe("asyncHandler", () => {
    beforeEach(() => {
      app.get(
        "/success",
        asyncHandler(async (req, res) => {
          res.json({ success: true });
        }),
      );

      app.get(
        "/error",
        asyncHandler(async (req, res) => {
          throw errors.notFound("Resource");
        }),
      );

      app.get(
        "/unexpected",
        asyncHandler(async (req, res) => {
          throw new Error("Unexpected error");
        }),
      );

      app.use(errorHandler);
    });

    it("should handle successful async operation", async () => {
      const response = await request(app).get("/success").expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should forward ApiError to error handler", async () => {
      const response = await request(app).get("/error").expect(404);

      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should forward unexpected errors to error handler", async () => {
      const response = await request(app).get("/unexpected").expect(500);

      expect(response.body.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("errorHandler", () => {
    beforeEach(() => {
      app.post("/json-error", (req, res, next) => {
        const error = new SyntaxError("Unexpected token");
        error.status = 400;
        error.body = "invalid";
        next(error);
      });

      app.use(errorHandler);
    });

    it("should handle PostgreSQL unique violation", async () => {
      const mockApp = express();
      mockApp.use(express.json());
      mockApp.get("/test", (req, res, next) => {
        const error = new Error("duplicate key value");
        error.code = "23505";
        next(error);
      });
      mockApp.use(errorHandler);

      const response = await request(mockApp).get("/test").expect(409);

      expect(response.body.code).toBe("DUPLICATE");
    });

    it("should handle PostgreSQL foreign key violation", async () => {
      const mockApp = express();
      mockApp.use(express.json());
      mockApp.get("/test", (req, res, next) => {
        const error = new Error("foreign key violation");
        error.code = "23503";
        next(error);
      });
      mockApp.use(errorHandler);

      const response = await request(mockApp).get("/test").expect(400);

      expect(response.body.code).toBe("INVALID_REFERENCE");
    });
  });
});

describe("Integration: Validation + Error Handling", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    app.post(
      "/resource",
      validate([
        common.requiredString("name", { min: 1, max: 100 }),
        common.optionalString("description"),
      ]),
      asyncHandler(async (req, res) => {
        // Simulate business logic that might throw
        if (req.body.name === "duplicate") {
          throw errors.duplicate("name");
        }
        res.status(201).json({ id: 1, ...req.body });
      }),
    );

    app.get(
      "/resource/:id",
      validate([common.idParam("id")]),
      asyncHandler(async (req, res) => {
        if (req.params.id === 999) {
          throw errors.notFound("Resource");
        }
        res.json({ id: req.params.id, name: "Test" });
      }),
    );

    app.use(errorHandler);
  });

  it("should create resource with valid data", async () => {
    const response = await request(app)
      .post("/resource")
      .send({ name: "Test Resource", description: "A test" })
      .expect(201);

    expect(response.body.name).toBe("Test Resource");
  });

  it("should reject invalid data with validation error", async () => {
    const response = await request(app)
      .post("/resource")
      .send({ description: "Missing name" })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.details[0].field).toBe("name");
  });

  it("should handle business logic errors", async () => {
    const response = await request(app)
      .post("/resource")
      .send({ name: "duplicate" })
      .expect(409);

    expect(response.body.code).toBe("DUPLICATE");
  });

  it("should get resource with valid ID", async () => {
    const response = await request(app).get("/resource/1").expect(200);

    expect(response.body.id).toBe(1);
  });

  it("should return 404 for non-existent resource", async () => {
    const response = await request(app).get("/resource/999").expect(404);

    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("should reject invalid ID format", async () => {
    const response = await request(app).get("/resource/invalid").expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});
