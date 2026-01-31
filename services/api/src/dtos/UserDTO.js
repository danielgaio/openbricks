/**
 * User Data Transfer Objects
 * Transforms User domain entities to API representations
 *
 * Security: Explicitly excludes password and sensitive fields
 */

/**
 * Basic user representation for embedding
 * Use in lists and as nested object in other DTOs
 */
class UserDTO {
  /**
   * @param {Object} user - Domain user entity
   * @returns {Object} Safe user representation
   */
  static fromEntity(user) {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Transform array of users
   * @param {Array} users - Array of user entities
   * @returns {Array} Array of user DTOs
   */
  static fromEntities(users) {
    return (users || []).map((user) => UserDTO.fromEntity(user));
  }
}

/**
 * Detailed user representation
 * Includes timestamps and additional metadata
 */
class UserDetailDTO extends UserDTO {
  static fromEntity(user) {
    if (!user) return null;

    const base = UserDTO.fromEntity(user);
    return {
      ...base,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

/**
 * Users list response DTO
 */
class UsersListDTO {
  static fromEntities(users, options = {}) {
    const { total, limit, offset } = options;

    return {
      users: UserDTO.fromEntities(users),
      pagination: {
        total: total || users.length,
        limit: limit || users.length,
        offset: offset || 0,
      },
    };
  }
}

module.exports = {
  UserDTO,
  UserDetailDTO,
  UsersListDTO,
};
