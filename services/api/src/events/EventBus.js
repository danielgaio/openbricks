/**
 * Event Bus
 * Central hub for domain events using the Observer pattern
 *
 * Design Principles:
 * - Single Responsibility: Only manages event subscription and dispatch
 * - Open/Closed: New handlers can be added without modifying the bus
 * - Dependency Inversion: Services depend on EventBus interface, not implementations
 */

const { EventEmitter } = require("events");

/**
 * Domain Event structure
 * @typedef {Object} DomainEvent
 * @property {string} type - Event type (e.g., 'workspace.created')
 * @property {Object} payload - Event data
 * @property {Object} metadata - Event metadata (timestamp, correlationId, userId)
 */

/**
 * EventBus - Centralized event dispatcher
 * Implements the Mediator pattern for loose coupling between services
 */
class EventBus {
  constructor(options = {}) {
    this.emitter = new EventEmitter();
    this.logger = options.logger || console;
    this.handlers = new Map(); // Track registered handlers for debugging
    this.middlewares = []; // Pre-dispatch middlewares

    // Increase max listeners for production use
    this.emitter.setMaxListeners(100);
  }

  /**
   * Register middleware to run before each event dispatch
   * Useful for logging, metrics, or transformation
   * @param {Function} middleware - (event) => event or Promise<event>
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type pattern (supports wildcards with *)
   * @param {Function} handler - Async handler function (event) => Promise<void>
   * @param {Object} options - Handler options
   * @returns {Function} Unsubscribe function
   */
  on(eventType, handler, options = {}) {
    const { name = handler.name || "anonymous" } = options;

    // Track handler for debugging
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push({ name, handler });

    // Wrap handler with error handling
    const wrappedHandler = async (event) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`Event handler error [${name}]:`, {
          eventType,
          error: error.message,
          event,
        });
        // Don't rethrow - other handlers should still execute
      }
    };

    this.emitter.on(eventType, wrappedHandler);

    // Return unsubscribe function
    return () => {
      this.emitter.off(eventType, wrappedHandler);
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex((h) => h.name === name);
        if (index !== -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to an event type (one-time)
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler function
   * @returns {Promise} Resolves when event is received
   */
  once(eventType, handler) {
    return new Promise((resolve) => {
      const unsubscribe = this.on(eventType, async (event) => {
        unsubscribe();
        if (handler) await handler(event);
        resolve(event);
      });
    });
  }

  /**
   * Emit a domain event
   * @param {string} type - Event type
   * @param {Object} payload - Event payload
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<void>}
   */
  async emit(type, payload, metadata = {}) {
    const event = {
      type,
      payload,
      metadata: {
        timestamp: new Date().toISOString(),
        eventId: this._generateEventId(),
        ...metadata,
      },
    };

    // Run middlewares
    let processedEvent = event;
    for (const middleware of this.middlewares) {
      try {
        processedEvent = (await middleware(processedEvent)) || processedEvent;
      } catch (error) {
        this.logger.error("Event middleware error:", {
          error: error.message,
          event,
        });
      }
    }

    // Log event emission
    this.logger.info(`Event emitted: ${type}`, {
      eventId: processedEvent.metadata.eventId,
      payload: this._sanitizePayload(payload),
    });

    // Emit to specific handlers
    this.emitter.emit(type, processedEvent);

    // Emit to wildcard handlers (e.g., 'workspace.*' or '*')
    const parts = type.split(".");
    if (parts.length > 1) {
      this.emitter.emit(`${parts[0]}.*`, processedEvent);
    }
    this.emitter.emit("*", processedEvent);
  }

  /**
   * Get list of registered handlers (for debugging)
   * @returns {Object} Map of event types to handler names
   */
  getHandlers() {
    const result = {};
    for (const [eventType, handlers] of this.handlers) {
      result[eventType] = handlers.map((h) => h.name);
    }
    return result;
  }

  /**
   * Wait for all pending handlers to complete
   * Useful for testing and graceful shutdown
   */
  async drain() {
    // EventEmitter is synchronous, but handlers are async
    // This is a simple implementation - could be enhanced with tracking
    await new Promise((resolve) => setImmediate(resolve));
  }

  /**
   * Remove all handlers
   */
  clear() {
    this.emitter.removeAllListeners();
    this.handlers.clear();
  }

  /**
   * Generate unique event ID
   * @private
   */
  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   * @private
   */
  _sanitizePayload(payload) {
    if (!payload || typeof payload !== "object") return payload;

    const sensitiveKeys = ["password", "token", "secret", "apiKey", "api_key"];
    const sanitized = { ...payload };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}

module.exports = { EventBus };
