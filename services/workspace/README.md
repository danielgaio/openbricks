# Workspace Service - JupyterLab

The workspace service provides an interactive notebook environment for data analysis using JupyterLab.

## Features

- JupyterLab with PySpark support
- Delta Lake integration
- Pre-installed data science libraries
- Connected to Spark cluster

## Access

Access JupyterLab at http://localhost:8888

Default token: `openbricks` (configurable via `JUPYTER_TOKEN` environment variable)

## Pre-installed Libraries

- pyspark
- delta-spark
- pandas
- numpy
- matplotlib
- seaborn
- plotly
- scikit-learn

## Example: Connect to Spark Cluster

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("OpenBricks Notebook") \
    .master("spark://spark-master:7077") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# Read Delta table
df = spark.read.format("delta").load("/data/lakehouse/my_table")
df.show()
```
