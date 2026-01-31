/**
 * Workspace Service
 * Business logic for workspace management
 */

const { BaseService } = require("./BaseService");
const { DomainEvents } = require("../events");

/**
 * WorkspaceService handles all workspace-related business logic
 */
class WorkspaceService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.workspaces = repositories.workspaces;
    this.notebooks = repositories.notebooks;
  }

  /**
   * List workspaces for a user
   * Admins see all, users see only their own
   * @param {Object} user - Current user
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} List of workspaces
   */
  async list(user, options = {}) {
    return this.workspaces.findForUser(user, options);
  }

  /**
   * Get workspace by ID with access check
   * @param {number} id - Workspace ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Workspace with stats
   * @throws {Error} If not found or access denied
   */
  async getById(id, user) {
    const workspace = await this.workspaces.findByIdWithStats(id);

    if (!workspace) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(workspace, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    return { success: true, data: workspace };
  }

  /**
   * Create a new workspace
   * @param {Object} data - Workspace data (name, description)
   * @param {Object} user - Current user (becomes owner)
   * @returns {Promise<Object>} Created workspace
   */
  async create(data, user) {
    const { name, description } = data;

    const workspace = await this.workspaces.create({
      name,
      description,
      owner_id: user.id,
    });

    this.emit(DomainEvents.WORKSPACE_CREATED, { workspace, userId: user.id });

    return { success: true, data: workspace };
  }

  /**
   * Update workspace
   * @param {number} id - Workspace ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated workspace
   */
  async update(id, data, user) {
    const existing = await this.workspaces.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Build update object with only provided fields
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;

    const workspace = await this.workspaces.update(id, updates);

    this.emit(DomainEvents.WORKSPACE_UPDATED, {
      workspace,
      userId: user.id,
      changes: Object.keys(updates),
    });

    return { success: true, data: workspace };
  }

  /**
   * Delete workspace
   * Validates workspace is empty before deletion
   * @param {number} id - Workspace ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Result
   */
  async delete(id, user) {
    const existing = await this.workspaces.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Check for notebooks in workspace
    const notebookCount = await this.notebooks.count({ workspace_id: id });
    if (notebookCount > 0) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot delete workspace with ${notebookCount} notebooks. Delete notebooks first.`,
      };
    }

    await this.workspaces.delete(id);

    this.emit(DomainEvents.WORKSPACE_DELETED, { id, userId: user.id });

    return { success: true };
  }
}

module.exports = { WorkspaceService };
