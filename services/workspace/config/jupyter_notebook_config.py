# Jupyter configuration for OpenBricks Workspace

c = get_config()

# Allow all origins for development
c.NotebookApp.allow_origin = '*'

# Disable token authentication for development (override via env var)
c.NotebookApp.token = ''

# Server settings
c.NotebookApp.ip = '0.0.0.0'
c.NotebookApp.port = 8888
c.NotebookApp.open_browser = False

# Working directory
c.NotebookApp.notebook_dir = '/home/jovyan/work'

# Terminal settings
c.NotebookApp.terminals_enabled = True

# File upload limit
c.NotebookApp.max_buffer_size = 512 * 1024 * 1024  # 512MB
