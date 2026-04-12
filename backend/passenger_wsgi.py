import sys
import os

# 1. Asegurar que Hostinger entienda en qué carpeta está parado el servidor
INTERP = os.path.join(os.environ.get("HOME", ""), ".local/bin/python3")
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.append(os.getcwd())

# 2. Convertir tu aplicación asíncrona moderna (FastAPI/ASGI) 
# al formato clásico y anticuado que exige CPanel/Hostinger (WSGI) usando a2wsgi.
from a2wsgi import ASGIMiddleware
from app.main import app

application = ASGIMiddleware(app)
