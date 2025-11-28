# OpenBricks Jupyter Configuration
c = get_config()

# Server settings
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_origin = '*'
c.ServerApp.allow_root = True

# No authentication for development (configure in production)
c.ServerApp.token = ''
c.ServerApp.password = ''

# Disable XSRF protection for API access (configure properly in production)
c.ServerApp.disable_check_xsrf = True

# Enable JupyterLab
c.ServerApp.default_url = '/lab'

# Notebook settings
c.FileContentsManager.delete_to_trash = False

# Terminal settings
c.ServerApp.terminals_enabled = True
