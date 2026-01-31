# Django 애플리케이션 Dockerfile
FROM python:3.12-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
# 1. CPU 전용 Torch 먼저 설치 (용량 절약)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Gunicorn 설치
RUN pip install gunicorn

# 프로젝트 파일 복사
COPY . .

# PYTHONPATH 설정 (Django 모듈 인식용)
ENV PYTHONPATH=/app

# 포트 노출
EXPOSE 8000

# Gunicorn으로 Django 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "app.config.wsgi:application"]
