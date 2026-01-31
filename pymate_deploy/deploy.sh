#!/bin/bash

################################################################################
# 애플리케이션 배포 스크립트
# 
# 이 스크립트는 코드 업데이트 및 재배포 시 사용됩니다.
# setup-ec2.sh를 먼저 실행한 후 사용하세요.
#
# 사용법:
#   chmod +x deploy.sh
#   ./deploy.sh
################################################################################

set -e  # 에러 발생 시 즉시 중단

echo "================================"
echo "배포 시작"
echo "================================"

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "프로젝트 경로: $PROJECT_ROOT"

# 1. Git 최신 코드 가져오기
echo ""
echo "[1/6] Git 최신 코드 가져오기..."
cd "$PROJECT_ROOT"
if [ -d ".git" ]; then
    git pull origin main || git pull origin master
    echo "✓ 최신 코드 업데이트 완료"
else
    echo "! Git 저장소가 아닙니다. 수동으로 코드를 업데이트하세요."
fi

# 2. 환경변수 파일 확인
echo ""
echo "[2/6] 환경변수 파일 확인..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "✗ .env 파일이 없습니다!"
    echo "  .env.example을 복사하여 .env 파일을 생성하고 설정하세요:"
    echo "  cp pymate_deploy/.env.example .env"
    echo "  vim .env"
    exit 1
fi

# 환경변수 검증 스크립트 실행 (있는 경우)
if [ -f "$SCRIPT_DIR/validate-env.sh" ]; then
    echo "환경변수 검증 중..."
    bash "$SCRIPT_DIR/validate-env.sh"
fi

echo "✓ 환경변수 파일 확인 완료"

# 3. 기존 컨테이너 정리
echo ""
echo "[3/6] 기존 컨테이너 정리..."
cd "$SCRIPT_DIR"

# 실행 중인 컨테이너 확인
if docker compose ps | grep -q "Up"; then
    echo "기존 컨테이너 중지 중..."
    docker compose down
    echo "✓ 컨테이너 중지 완료"
else
    echo "✓ 실행 중인 컨테이너가 없습니다"
fi

# 4. Docker 이미지 빌드
echo ""
echo "[4/6] Docker 이미지 빌드..."
docker compose build --no-cache
echo "✓ 이미지 빌드 완료"

# 5. 컨테이너 시작
echo ""
echo "[5/6] 컨테이너 시작..."
docker compose up -d
echo "✓ 컨테이너 시작 완료"

# 6. 헬스체크
echo ""
echo "[6/6] 서비스 상태 확인..."
sleep 5  # 컨테이너 시작 대기

# 컨테이너 상태 확인
echo ""
echo "컨테이너 상태:"
docker compose ps

# Qdrant 헬스체크
echo ""
echo "Qdrant 헬스체크..."
QDRANT_HEALTH=$(curl -s http://localhost:6333/healthz || echo "FAIL")
if [ "$QDRANT_HEALTH" == "FAIL" ]; then
    echo "⚠ Qdrant 서버가 응답하지 않습니다."
else
    echo "✓ Qdrant: $QDRANT_HEALTH"
fi

# Django 헬스체크 (Django 서버가 준비되면 활성화)
# echo ""
# echo "Django 헬스체크..."
# DJANGO_HEALTH=$(curl -s http://localhost:8000/health || echo "FAIL")
# if [ "$DJANGO_HEALTH" == "FAIL" ]; then
#     echo "⚠ Django 서버가 응답하지 않습니다."
# else
#     echo "✓ Django: OK"
# fi

# 완료
echo ""
echo "================================"
echo "✓ 배포 완료!"
echo "================================"
echo ""
echo "서비스 URL:"
echo "  - Qdrant Dashboard: http://localhost:6333/dashboard"
echo "  - Django (예정): http://localhost:8000"
echo "  - Nginx (예정): http://localhost:80"
echo ""
echo "로그 확인:"
echo "  docker compose logs -f [서비스명]"
echo ""
echo "중지:"
echo "  docker compose down"
echo ""
