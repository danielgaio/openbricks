FROM jupyter/pyspark-notebook:spark-3.5.0

USER root

# Install additional Python packages
RUN pip install --no-cache-dir \
    delta-spark==3.0.0 \
    pandas==2.1.3 \
    numpy==1.26.2 \
    matplotlib==3.8.2 \
    seaborn==0.13.0 \
    plotly==5.18.0 \
    scikit-learn==1.3.2

# Configure Spark for Delta Lake
ENV SPARK_HOME=/usr/local/spark
ENV PYSPARK_PYTHON=python3

# Copy configuration files
COPY config/ /home/jovyan/.jupyter/

USER ${NB_UID}

WORKDIR /home/jovyan/work

EXPOSE 8888

CMD ["start-notebook.sh", "--NotebookApp.token=${JUPYTER_TOKEN:-openbricks}"]
