#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys


def main():
    """Run administrative tasks."""
    # 현재 파일(manage.py)의 상위 상위 디렉토리를 sys.path에 추가
    # 이렇게 하면 'django_app'을 패키지로 인식할 수 있습니다.
    from pathlib import Path
    current_path = Path(__file__).resolve().parent
    sys.path.append(str(current_path.parent))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_app.config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
