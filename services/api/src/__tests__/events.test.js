/**
 * Event Bus Tests
 * Unit tests for Event-Driven Architecture
 */

const {
  EventBus,
  DomainEvents,
  createEventBus,
  registerHandlers,
} = require("../events");

describe("Event-Driven Architecture", () => {
  let eventBus;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    eventBus = new EventBus({ logger: mockLogger });
  });

  afterEach(() => {
    eventBus.clear();
  });

  // ============================================
  // EventBus Tests
  // ============================================
  describe("EventBus", () => {
    describe("emit and on", () => {
      it("should emit events to subscribers", async () => {
        const handler = jest.fn();
        eventBus.on("test.event", handler);

        await eventBus.emit("test.event", { data: "test" });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "test.event",
            payload: { data: "test" },
            metadata: expect.objectContaining({
              timestamp: expect.any(String),
              eventId: expect.stringMatching(/^evt_/),
            }),
          }),
        );
      });

      it("should support multiple handlers for same event", async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        eventBus.on("test.event", handler1);
        eventBus.on("test.event", handler2);

        await eventBus.emit("test.event", { data: "test" });

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
      });

      it("should not emit to unsubscribed handlers", async () => {
        const handler = jest.fn();
        const unsubscribe = eventBus.on("test.event", handler);

        unsubscribe();
        await eventBus.emit("test.event", { data: "test" });

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("wildcard subscriptions", () => {
      it("should emit to wildcard handlers (*)", async () => {
        const wildcardHandler = jest.fn();
        eventBus.on("*", wildcardHandler);

        await eventBus.emit("any.event", { data: "test" });

        expect(wildcardHandler).toHaveBeenCalledTimes(1);
      });

      it("should emit to namespace wildcard handlers (namespace.*)", async () => {
        const namespaceHandler = jest.fn();
        eventBus.on("workspace.*", namespaceHandler);

        await eventBus.emit("workspace.created", { data: "test" });
        await eventBus.emit("workspace.deleted", { data: "test" });
        await eventBus.emit("job.created", { data: "test" });

        expect(namespaceHandler).toHaveBeenCalledTimes(2);
      });
    });

    describe("error handling", () => {
      it("should catch handler errors and continue", async () => {
        const errorHandler = jest
          .fn()
          .mockRejectedValue(new Error("Test error"));
        const successHandler = jest.fn();

        eventBus.on("test.event", errorHandler, { name: "ErrorHandler" });
        eventBus.on("test.event", successHandler, { name: "SuccessHandler" });

        await eventBus.emit("test.event", { data: "test" });

        expect(errorHandler).toHaveBeenCalled();
        expect(successHandler).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining("Event handler error"),
          expect.any(Object),
        );
      });
    });

    describe("once", () => {
      it("should only fire handler once", async () => {
        let callCount = 0;

        eventBus.once("test.event", () => {
          callCount++;
        });

        await eventBus.emit("test.event", {});
        await eventBus.emit("test.event", {});

        expect(callCount).toBe(1);
      });
    });

    describe("middleware", () => {
      it("should run middleware before dispatch", async () => {
        const middlewareFn = jest.fn((event) => ({
          ...event,
          metadata: { ...event.metadata, enriched: true },
        }));

        eventBus.use(middlewareFn);

        const handler = jest.fn();
        eventBus.on("test.event", handler);

        await eventBus.emit("test.event", { data: "test" });

        expect(middlewareFn).toHaveBeenCalled();
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({ enriched: true }),
          }),
        );
      });
    });

    describe("getHandlers", () => {
      it("should return registered handlers", () => {
        eventBus.on("event1", () => {}, { name: "Handler1" });
        eventBus.on("event2", () => {}, { name: "Handler2" });

        const handlers = eventBus.getHandlers();

        expect(handlers.event1).toContain("Handler1");
        expect(handlers.event2).toContain("Handler2");
      });
    });

    describe("payload sanitization", () => {
      it("should redact sensitive fields in logs", async () => {
        await eventBus.emit("test.event", {
          user: "test",
          password: "secret123",
          token: "jwt-token",
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            payload: expect.objectContaining({
              user: "test",
              password: "[REDACTED]",
              token: "[REDACTED]",
            }),
          }),
        );
      });
    });
  });

  // ============================================
  // DomainEvents Tests
  // ============================================
  describe("DomainEvents", () => {
    it("should have all required event types defined", () => {
      expect(DomainEvents.WORKSPACE_CREATED).toBe("workspace.created");
      expect(DomainEvents.JOB_QUEUED).toBe("job.queued");
      expect(DomainEvents.CLUSTER_STARTED).toBe("cluster.started");
      expect(DomainEvents.TABLE_DELETED).toBe("table.deleted");
    });

    it("should follow naming convention (aggregate.action)", () => {
      const eventTypes = Object.values(DomainEvents);

      eventTypes.forEach((eventType) => {
        // Allow lowercase letters, dots, and underscores
        expect(eventType).toMatch(/^[a-z]+\.[a-z_.]+$/);
      });
    });
  });

  // ============================================
  // createEventBus Factory Tests
  // ============================================
  describe("createEventBus", () => {
    it("should create configured event bus", () => {
      const bus = createEventBus({ logger: mockLogger });

      expect(bus).toBeInstanceOf(EventBus);
    });
  });

  // ============================================
  // Event Handlers Tests
  // ============================================
  describe("Event Handlers", () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
    });

    describe("registerHandlers", () => {
      it("should register all default handlers", () => {
        registerHandlers(eventBus, { pool: mockPool, logger: mockLogger });

        const handlers = eventBus.getHandlers();

        // Should have wildcard handlers registered
        expect(handlers["*"]).toBeDefined();
        expect(handlers["*"].length).toBeGreaterThan(0);
      });

      it("should log audit events to database", async () => {
        registerHandlers(eventBus, { pool: mockPool, logger: mockLogger });

        await eventBus.emit(DomainEvents.WORKSPACE_CREATED, {
          workspace: { id: 1, name: "Test" },
          userId: 123,
        });

        // Wait for async handlers
        await eventBus.drain();

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO audit_logs"),
          expect.any(Array),
        );
      });
    });
  });

  // ============================================
  // Integration with Services
  // ============================================
  describe("Service Integration", () => {
    const { WorkspaceService } = require("../services");

    it("should emit events from services", async () => {
      const handler = jest.fn();
      eventBus.on(DomainEvents.WORKSPACE_CREATED, handler);

      const mockRepositories = {
        workspaces: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 1, name: "Test", owner_id: 1 }),
          findForUser: jest.fn(),
        },
        notebooks: {
          count: jest.fn(),
        },
      };

      const service = new WorkspaceService(mockRepositories, {
        logger: mockLogger,
        eventBus,
      });

      await service.create({ name: "Test" }, { id: 1 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DomainEvents.WORKSPACE_CREATED,
          payload: expect.objectContaining({
            workspace: expect.objectContaining({ id: 1 }),
            userId: 1,
          }),
        }),
      );
    });
  });
});
