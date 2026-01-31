/**
 * Workspace Data Transfer Objects
 * Transforms Workspace domain entities to API representations
 */

const { UserDTO } = require("./UserDTO");

/**
 * Basic workspace representation
 * Use in lists and for standard responses
 */
class WorkspaceDTO {
  /**
   * @param {Object} workspace - Domain workspace entity
   * @param {Object} options - Transformation options
   * @returns {Object} Workspace representation
   */
  static fromEntity(workspace, options = {}) {
    if (!workspace) return null;

    const dto = {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description || null,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at,
    };

    // Include owner info if requested
    if (options.includeOwner && workspace.owner) {
      dto.owner = UserDTO.fromEntity(workspace.owner);
    } else if (workspace.owner_id) {
      dto.owner_id = workspace.owner_id;
    }

    return dto;
  }

  /**
   * Transform array of workspaces
   * @param {Array} workspaces - Array of workspace entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of workspace DTOs
   */
  static fromEntities(workspaces, options = {}) {
    return (workspaces || []).map((ws) => WorkspaceDTO.fromEntity(ws, options));
  }
}

/**
 * Detailed workspace representation
 * Includes related entities (notebooks, collaborators)
 */
class WorkspaceDetailDTO extends WorkspaceDTO {
  static fromEntity(workspace, options = {}) {
    if (!workspace) return null;

    const base = WorkspaceDTO.fromEntity(workspace, options);

    // Add detailed fields
    const dto = {
      ...base,
    };

    // Include notebooks count if available
    if (workspace.notebooks_count !== undefined) {
      dto.notebooks_count = workspace.notebooks_count;
    }

    // Include notebook list if provided
    if (workspace.notebooks) {
      dto.notebooks = workspace.notebooks.map((nb) => ({
        id: nb.id,
        name: nb.name,
        language: nb.language,
      }));
    }

    return dto;
  }
}

/**
 * Workspaces list response DTO
 */
class WorkspacesListDTO {
  static fromEntities(workspaces, options = {}) {
    const { total, limit, offset, includeOwner } = options;

    return {
      workspaces: WorkspaceDTO.fromEntities(workspaces, { includeOwner }),
      pagination: {
        total: total || workspaces.length,
        limit: limit || workspaces.length,
        offset: offset || 0,
      },
    };
  }
}

module.exports = {
  WorkspaceDTO,
  WorkspaceDetailDTO,
  WorkspacesListDTO,
};
