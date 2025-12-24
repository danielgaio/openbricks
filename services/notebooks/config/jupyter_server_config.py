# OpenBricks Jupyter Configuration
c = get_config()

# Server settings
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_origin = '*'
c.ServerApp.allow_root = True

# ============================================================================
# SECURITY WARNING: Development-only settings below
# ============================================================================
# The following settings disable authentication for development purposes.
# DO NOT use these settings in production!
#
# For production deployments:
# 1. Set a secure token: c.ServerApp.token = 'your-secure-token'
# 2. Or use password authentication: jupyter server password
# 3. Enable XSRF protection: c.ServerApp.disable_check_xsrf = False
# 4. Configure proper CORS: c.ServerApp.allow_origin = 'https://your-domain.com'
#
# See: https://jupyter-server.readthedocs.io/en/latest/operators/security.html
# ============================================================================

# Development-only: Disable authentication (CHANGE IN PRODUCTION!)
c.ServerApp.token = ''
c.ServerApp.password = ''

# Development-only: Disable XSRF protection (CHANGE IN PRODUCTION!)
c.ServerApp.disable_check_xsrf = True

# Enable JupyterLab
c.ServerApp.default_url = '/lab'

# Notebook settings
c.FileContentsManager.delete_to_trash = False

# Terminal settings
c.ServerApp.terminals_enabled = True
