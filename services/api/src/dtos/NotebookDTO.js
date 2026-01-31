/**
 * Notebook Data Transfer Objects
 * Transforms Notebook domain entities to API representations
 */

const { UserDTO } = require("./UserDTO");

/**
 * Basic notebook representation
 * Use in lists and workspace embeddings
 */
class NotebookDTO {
  /**
   * @param {Object} notebook - Domain notebook entity
   * @param {Object} options - Transformation options
   * @returns {Object} Notebook representation
   */
  static fromEntity(notebook, options = {}) {
    if (!notebook) return null;

    const dto = {
      id: notebook.id,
      name: notebook.name,
      language: notebook.language || "python",
      workspace_id: notebook.workspace_id,
      created_at: notebook.created_at,
      updated_at: notebook.updated_at,
    };

    // Include owner info if requested
    if (options.includeOwner && notebook.owner) {
      dto.owner = UserDTO.fromEntity(notebook.owner);
    } else if (notebook.owner_id) {
      dto.owner_id = notebook.owner_id;
    }

    return dto;
  }

  /**
   * Transform array of notebooks
   * @param {Array} notebooks - Array of notebook entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of notebook DTOs
   */
  static fromEntities(notebooks, options = {}) {
    return (notebooks || []).map((nb) => NotebookDTO.fromEntity(nb, options));
  }
}

/**
 * Detailed notebook representation
 * Includes content and workspace info
 */
class NotebookDetailDTO extends NotebookDTO {
  static fromEntity(notebook, options = {}) {
    if (!notebook) return null;

    const base = NotebookDTO.fromEntity(notebook, options);

    const dto = {
      ...base,
      content: notebook.content || "",
    };

    // Include workspace info if available
    if (notebook.workspace) {
      dto.workspace = {
        id: notebook.workspace.id,
        name: notebook.workspace.name,
      };
    }

    // Include content size for large notebooks
    if (notebook.content) {
      dto.content_size = notebook.content.length;
    }

    return dto;
  }
}

/**
 * Notebooks list response DTO
 * Excludes content to reduce payload size
 */
class NotebooksListDTO {
  static fromEntities(notebooks, options = {}) {
    const { total, limit, offset, includeOwner } = options;

    return {
      notebooks: NotebookDTO.fromEntities(notebooks, { includeOwner }),
      pagination: {
        total: total || notebooks.length,
        limit: limit || notebooks.length,
        offset: offset || 0,
      },
    };
  }
}

module.exports = {
  NotebookDTO,
  NotebookDetailDTO,
  NotebooksListDTO,
};
