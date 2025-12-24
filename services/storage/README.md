# Storage Service

The storage service uses MinIO as an S3-compatible object storage layer for the data lakehouse.

## Configuration

MinIO is deployed as a Docker container with the following default settings:

- API Port: 9000
- Console Port: 9001
- Default credentials (change in production):
  - Username: `openbricks`
  - Password: `openbricks123`

## Features

- S3-compatible API
- Web-based console UI
- Delta Lake table storage
- Data versioning support

## Usage

Access the MinIO console at http://localhost:9001

Configure AWS SDK or S3-compatible clients:
```
Endpoint: http://localhost:9000
Access Key: openbricks
Secret Key: openbricks123
```
