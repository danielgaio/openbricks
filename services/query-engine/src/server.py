"""
OpenBricks Query Engine Server
Provides a REST API for executing Spark SQL queries with Delta Lake support.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyspark.sql import SparkSession

app = Flask(__name__)
CORS(app)

# Environment configuration
SPARK_MASTER_URL = os.getenv('SPARK_MASTER_URL', 'local[*]')
SPARK_DRIVER_MEMORY = os.getenv('SPARK_DRIVER_MEMORY', '2g')
SPARK_EXECUTOR_MEMORY = os.getenv('SPARK_EXECUTOR_MEMORY', '2g')
DELTA_LAKE_PATH = os.getenv('DELTA_LAKE_PATH', '/data/lakehouse')
QUERY_ROW_LIMIT = int(os.getenv('QUERY_ROW_LIMIT', '1000'))

# Global Spark session (lazy initialization)
_spark_session = None


def get_spark_session():
    """Get or create a Spark session with Delta Lake support."""
    global _spark_session
    if _spark_session is None:
        _spark_session = (SparkSession.builder
            .appName("OpenBricks Query Engine")
            .master(SPARK_MASTER_URL)
            .config("spark.driver.memory", SPARK_DRIVER_MEMORY)
            .config("spark.executor.memory", SPARK_EXECUTOR_MEMORY)
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
            .config("spark.jars.packages", "io.delta:delta-spark_2.12:3.0.0")
            .getOrCreate())
    return _spark_session


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'query-engine',
        'spark_master': SPARK_MASTER_URL
    })


@app.route('/query', methods=['POST'])
def execute_query():
    """Execute a Spark SQL query."""
    try:
        data = request.get_json()
        sql_query = data.get('query')
        
        if not sql_query:
            return jsonify({'error': 'Query is required'}), 400
        
        spark = get_spark_session()
        result = spark.sql(sql_query)
        
        # Convert result to JSON-serializable format
        rows = result.collect()
        columns = result.columns
        
        data_rows = []
        for row in rows[:QUERY_ROW_LIMIT]:  # Limit rows based on config
            data_rows.append({col: row[col] for col in columns})
        
        return jsonify({
            'success': True,
            'columns': columns,
            'data': data_rows,
            'row_count': len(data_rows),
            'truncated': len(rows) > QUERY_ROW_LIMIT
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tables', methods=['GET'])
def list_tables():
    """List available tables in the catalog."""
    try:
        spark = get_spark_session()
        tables = spark.catalog.listTables()
        
        table_list = []
        for table in tables:
            table_list.append({
                'name': table.name,
                'database': table.database,
                'tableType': table.tableType
            })
        
        return jsonify({
            'success': True,
            'tables': table_list
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/schema/<table_name>', methods=['GET'])
def get_schema(table_name):
    """Get the schema of a specific table."""
    try:
        spark = get_spark_session()
        df = spark.table(table_name)
        schema = df.schema
        
        fields = []
        for field in schema.fields:
            fields.append({
                'name': field.name,
                'type': str(field.dataType),
                'nullable': field.nullable
            })
        
        return jsonify({
            'success': True,
            'table': table_name,
            'schema': fields
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
