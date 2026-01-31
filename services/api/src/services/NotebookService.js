/**
 * Notebook Service
 * Business logic for notebook management
 */

const { BaseService } = require("./BaseService");

/**
 * NotebookService handles all notebook-related business logic
 */
class NotebookService extends BaseService {
  constructor(repositories, options = {}) {
    super(repositories, options);
    this.notebooks = repositories.notebooks;
    this.workspaces = repositories.workspaces;
    this.jobs = repositories.jobs;
  }

  /**
   * List notebooks for a user
   * @param {Object} user - Current user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of notebooks
   */
  async list(user, options = {}) {
    const { workspace_id, limit, offset } = options;

    if (workspace_id) {
      // Verify workspace access
      const workspace = await this.workspaces.findById(workspace_id);
      if (!workspace) {
        return { success: false, error: "NOT_FOUND", message: "Workspace not found" };
      }
      if (!this.canAccess(workspace, user)) {
        return { success: false, error: "FORBIDDEN" };
      }
      const notebooks = await this.notebooks.findByWorkspace(workspace_id);
      return { success: true, data: notebooks };
    }

    const notebooks = await this.notebooks.findForUser(user, { limit, offset });
    return { success: true, data: notebooks };
  }

  /**
   * Get notebook by ID with access check
   * @param {number} id - Notebook ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Notebook with workspace info
   */
  async getById(id, user) {
    const notebook = await this.notebooks.findByIdWithWorkspace(id);

    if (!notebook) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(notebook, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    return { success: true, data: notebook };
  }

  /**
   * Create a new notebook
   * @param {Object} data - Notebook data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created notebook
   */
  async create(data, user) {
    const { name, workspace_id, language = "python", content = "" } = data;

    // Verify workspace access if provided
    if (workspace_id) {
      const workspace = await this.workspaces.findById(workspace_id);
      if (!workspace) {
        return { success: false, error: "NOT_FOUND", message: "Workspace not found" };
      }
      if (!this.canAccess(workspace, user)) {
        return { success: false, error: "FORBIDDEN", message: "You do not have access to this workspace" };
      }
    }

    const notebook = await this.notebooks.create({
      name,
      workspace_id,
      language,
      content,
      owner_id: user.id,
    });

    this.emit("notebook.created", {
      notebookId: notebook.id,
      userId: user.id,
      workspaceId: workspace_id,
      language,
    });

    return { success: true, data: notebook };
  }

  /**
   * Update notebook metadata
   * @param {number} id - Notebook ID
   * @param {Object} data - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated notebook
   */
  async update(id, data, user) {
    const existing = await this.notebooks.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Handle workspace change with access check
    if (data.workspace_id && data.workspace_id !== existing.workspace_id) {
      const newWorkspace = await this.workspaces.findById(data.workspace_id);
      if (!newWorkspace) {
        return { success: false, error: "NOT_FOUND", message: "Target workspace not found" };
      }
      if (!this.canAccess(newWorkspace, user)) {
        return { success: false, error: "FORBIDDEN", message: "You do not have access to target workspace" };
      }
    }

    // Build update object
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.workspace_id !== undefined) updates.workspace_id = data.workspace_id;
    if (data.language !== undefined) updates.language = data.language;
    if (data.content !== undefined) updates.content = data.content;

    const notebook = await this.notebooks.update(id, updates);

    this.emit("notebook.updated", {
      notebookId: id,
      userId: user.id,
      changes: Object.keys(updates),
    });

    return { success: true, data: notebook };
  }

  /**
   * Update notebook content only
   * Optimized for frequent content saves
   * @param {number} id - Notebook ID
   * @param {string} content - New content
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated notebook
   */
  async updateContent(id, content, user) {
    const existing = await this.notebooks.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    const notebook = await this.notebooks.updateContent(id, content);

    // Lighter event for content updates (high frequency)
    this.emit("notebook.content_updated", {
      notebookId: id,
      userId: user.id,
    });

    return { success: true, data: notebook };
  }

  /**
   * Delete notebook
   * Validates no active jobs before deletion
   * @param {number} id - Notebook ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Result
   */
  async delete(id, user) {
    const existing = await this.notebooks.findById(id);

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (!this.canAccess(existing, user)) {
      return { success: false, error: "FORBIDDEN" };
    }

    // Check for running/pending jobs
    const activeJobs = await this.jobs.count({
      notebook_id: id,
      status: { in: ["running", "pending"] },
    });

    if (activeJobs > 0) {
      return {
        success: false,
        error: "CONFLICT",
        message: `Cannot delete notebook with ${activeJobs} active jobs. Cancel jobs first.`,
      };
    }

    await this.notebooks.delete(id);

    this.emit("notebook.deleted", {
      notebookId: id,
      userId: user.id,
    });

    return { success: true };
  }
}

module.exports = { NotebookService };
