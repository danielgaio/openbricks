/**
 * Events Module
 * Central export for event-driven architecture components
 */

const { EventBus } = require("./EventBus");
const { DomainEvents, EventPayloads } = require("./DomainEvents");
const {
  createAuditHandler,
  createNotificationHandler,
  createMetricsHandler,
  createJobExecutionHandler,
  registerHandlers,
} = require("./handlers");

/**
 * Create and configure a new EventBus instance
 * @param {Object} options - Configuration options
 * @returns {EventBus} Configured event bus
 */
function createEventBus(options = {}) {
  const eventBus = new EventBus(options);

  // Add logging middleware
  eventBus.use((event) => {
    // Could add correlation ID, enrich with context, etc.
    return event;
  });

  return eventBus;
}

module.exports = {
  EventBus,
  DomainEvents,
  EventPayloads,
  createEventBus,
  createAuditHandler,
  createNotificationHandler,
  createMetricsHandler,
  createJobExecutionHandler,
  registerHandlers,
};
