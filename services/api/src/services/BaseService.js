/**
 * Base Service
 * Abstract base class for all domain services
 * Implements common patterns for business logic layer
 */

/**
 * BaseService class
 * Provides common functionality for all services
 */
class BaseService {
  /**
   * @param {Object} repositories - Repository instances
   * @param {Object} options - Service options
   */
  constructor(repositories, options = {}) {
    this.repositories = repositories;
    this.logger = options.logger || console;
    this.eventBus = options.eventBus || null;
  }

  /**
   * Emit a domain event through the event bus
   * @param {string} eventType - Event type (e.g., 'workspace.created')
   * @param {Object} payload - Event payload
   * @param {Object} metadata - Optional metadata (userId, correlationId)
   */
  async emit(eventType, payload, metadata = {}) {
    if (this.eventBus) {
      await this.eventBus.emit(eventType, payload, metadata);
    } else {
      // Fallback to simple logging if no event bus configured
      this.logger.info(`Event: ${eventType}`, payload);
    }
  }

  /**
   * Check if user is admin
   * @param {Object} user - User object
   * @returns {boolean}
   */
  isAdmin(user) {
    return user?.role === "admin";
  }

  /**
   * Check if user owns a resource
   * @param {Object} resource - Resource with owner_id
   * @param {Object} user - User object
   * @returns {boolean}
   */
  isOwner(resource, user) {
    return resource?.owner_id === user?.id;
  }

  /**
   * Check if user can access a resource (admin or owner)
   * @param {Object} resource - Resource with owner_id
   * @param {Object} user - User object
   * @returns {boolean}
   */
  canAccess(resource, user) {
    return this.isAdmin(user) || this.isOwner(resource, user);
  }
}

module.exports = { BaseService };
