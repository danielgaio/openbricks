/**
 * Table Data Transfer Objects
 * Transforms DataTable domain entities to API representations
 */

const { UserDTO } = require("./UserDTO");

/**
 * Format display configuration
 */
const FORMAT_CONFIG = {
  delta: { display: "Delta Lake", icon: "delta" },
  parquet: { display: "Parquet", icon: "parquet" },
  csv: { display: "CSV", icon: "csv" },
  json: { display: "JSON", icon: "json" },
  orc: { display: "ORC", icon: "orc" },
  avro: { display: "Avro", icon: "avro" },
};

/**
 * Basic table representation
 * Use in lists and for catalog views
 */
class TableDTO {
  /**
   * @param {Object} table - Domain table entity
   * @param {Object} options - Transformation options
   * @returns {Object} Table representation
   */
  static fromEntity(table, options = {}) {
    if (!table) return null;

    const formatConfig = FORMAT_CONFIG[table.format] || {
      display: table.format,
      icon: "table",
    };

    const dto = {
      id: table.id,
      name: table.name,
      database: table.database || "default",
      format: table.format || "delta",
      format_display: formatConfig.display,
      is_public: table.is_public || false,
      created_at: table.created_at,
      updated_at: table.updated_at,
    };

    // Full qualified name
    dto.full_name = `${dto.database}.${dto.name}`;

    // Include owner info if requested
    if (options.includeOwner && table.owner) {
      dto.owner = UserDTO.fromEntity(table.owner);
    } else if (table.owner_id) {
      dto.owner_id = table.owner_id;
    }

    return dto;
  }

  /**
   * Transform array of tables
   * @param {Array} tables - Array of table entities
   * @param {Object} options - Transformation options
   * @returns {Array} Array of table DTOs
   */
  static fromEntities(tables, options = {}) {
    return (tables || []).map((t) => TableDTO.fromEntity(t, options));
  }
}

/**
 * Detailed table representation
 * Includes schema and location info
 */
class TableDetailDTO extends TableDTO {
  static fromEntity(table, options = {}) {
    if (!table) return null;

    const base = TableDTO.fromEntity(table, options);

    const dto = {
      ...base,
      location: table.location || null,
      schema_definition: table.schema_definition || null,
    };

    // Calculate column count if schema is available
    if (table.schema_definition?.columns) {
      dto.column_count = table.schema_definition.columns.length;
    }

    // Add schema summary
    if (table.schema_definition?.columns) {
      dto.columns = table.schema_definition.columns.map((col) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable !== false,
      }));
    }

    return dto;
  }
}

/**
 * Tables list response DTO with catalog structure
 */
class TablesListDTO {
  static fromEntities(tables, options = {}) {
    const { total, limit, offset, includeOwner, groupByDatabase } = options;

    const tableDTOs = TableDTO.fromEntities(tables, { includeOwner });

    const response = {
      tables: tableDTOs,
      pagination: {
        total: total || tables.length,
        limit: limit || tables.length,
        offset: offset || 0,
      },
    };

    // Group by database if requested
    if (groupByDatabase) {
      const byDatabase = {};
      for (const table of tableDTOs) {
        if (!byDatabase[table.database]) {
          byDatabase[table.database] = [];
        }
        byDatabase[table.database].push(table);
      }
      response.databases = Object.keys(byDatabase).map((db) => ({
        name: db,
        tables: byDatabase[db],
        table_count: byDatabase[db].length,
      }));
    }

    return response;
  }
}

module.exports = {
  TableDTO,
  TableDetailDTO,
  TablesListDTO,
};
