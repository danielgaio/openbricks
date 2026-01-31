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
    this.eventEmitter = options.eventEmitter || null;
  }

  /**
   * Emit a domain event
   * @param {string} eventName - Event name
   * @param {Object} payload - Event payload
   */
  emit(eventName, payload) {
    if (this.eventEmitter) {
      this.eventEmitter.emit(eventName, {
        timestamp: new Date().toISOString(),
        ...payload,
      });
    }
    this.logger.info(`Event: ${eventName}`, payload);
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
