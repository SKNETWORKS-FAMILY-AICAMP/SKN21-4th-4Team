"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드 (프로젝트 루트 경로 찾기: config -> app -> Root)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(env_path)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.config.settings")

application = get_wsgi_application()
