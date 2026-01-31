/**
 * Data Transfer Objects (DTOs)
 * Transform domain entities to/from API representations
 *
 * Architecture Role: Interface Adapters layer in Clean Architecture
 * - Decouples API contracts from domain models
 * - Prevents sensitive data exposure
 * - Enables versioned API responses
 */

const { UserDTO, UserDetailDTO, UsersListDTO } = require("./UserDTO");
const {
  WorkspaceDTO,
  WorkspaceDetailDTO,
  WorkspacesListDTO,
} = require("./WorkspaceDTO");
const {
  NotebookDTO,
  NotebookDetailDTO,
  NotebooksListDTO,
} = require("./NotebookDTO");
const { JobDTO, JobDetailDTO, JobsListDTO, JobRunDTO } = require("./JobDTO");
const {
  ClusterDTO,
  ClusterDetailDTO,
  ClustersListDTO,
} = require("./ClusterDTO");
const { TableDTO, TableDetailDTO, TablesListDTO } = require("./TableDTO");
const {
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
} = require("./ResponseDTO");

module.exports = {
  // User DTOs
  UserDTO,
  UserDetailDTO,
  UsersListDTO,

  // Workspace DTOs
  WorkspaceDTO,
  WorkspaceDetailDTO,
  WorkspacesListDTO,

  // Notebook DTOs
  NotebookDTO,
  NotebookDetailDTO,
  NotebooksListDTO,

  // Job DTOs
  JobDTO,
  JobDetailDTO,
  JobsListDTO,
  JobRunDTO,

  // Cluster DTOs
  ClusterDTO,
  ClusterDetailDTO,
  ClustersListDTO,

  // Table DTOs
  TableDTO,
  TableDetailDTO,
  TablesListDTO,

  // Response builders
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
};
