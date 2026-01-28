#!/bin/bash

################################################################################
# 환경변수 검증 스크립트
# 
# .env 파일의 필수 환경변수가 모두 설정되어 있는지 확인합니다.
#
# 사용법:
#   chmod +x validate-env.sh
#   ./validate-env.sh
################################################################################

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "환경변수 검증"
echo "================================"

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# .env 파일 존재 확인
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ .env 파일을 찾을 수 없습니다: $ENV_FILE${NC}"
    echo ""
    echo "다음 명령어로 .env 파일을 생성하세요:"
    echo "  cp $SCRIPT_DIR/.env.example $ENV_FILE"
    exit 1
fi

echo "✓ .env 파일 찾음: $ENV_FILE"
echo ""

# .env 파일 로드
set -a
source "$ENV_FILE"
set +a

# 검증할 필수 환경변수 목록
REQUIRED_VARS=(
    "DJANGO_SECRET_KEY"
    "DJANGO_ALLOWED_HOSTS"
    "QDRANT_HOST"
    "QDRANT_PORT"
    "OPENAI_API_KEY"
)

# 선택적 환경변수 (경고만 표시)
OPTIONAL_VARS=(
    "TAVILY_API_KEY"
    "LANGCHAIN_API_KEY"
)

# 검증 결과
MISSING_VARS=()
EMPTY_VARS=()
WARNINGS=()

echo "필수 환경변수 검증:"
echo "---"

# 필수 환경변수 검증
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}✗ $var: 설정되지 않음${NC}"
        MISSING_VARS+=("$var")
    elif [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"change-in-production"* ]]; then
        echo -e "${RED}✗ $var: 기본값 사용 중 (변경 필요)${NC}"
        EMPTY_VARS+=("$var")
    else
        # 민감한 정보는 일부만 표시
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]]; then
            echo -e "${GREEN}✓ $var: 설정됨 (${!var:0:10}...)${NC}"
        else
            echo -e "${GREEN}✓ $var: ${!var}${NC}"
        fi
    fi
done

echo ""
echo "선택적 환경변수 검증:"
echo "---"

# 선택적 환경변수 검증
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠ $var: 설정되지 않음 (선택사항)${NC}"
        WARNINGS+=("$var")
    elif [[ "${!var}" == *"your-"* ]]; then
        echo -e "${YELLOW}⚠ $var: 기본값 사용 중${NC}"
        WARNINGS+=("$var")
    else
        if [[ "$var" == *"KEY"* ]]; then
            echo -e "${GREEN}✓ $var: 설정됨 (${!var:0:10}...)${NC}"
        else
            echo -e "${GREEN}✓ $var: ${!var}${NC}"
        fi
    fi
done

# 특정 값 검증
echo ""
echo "값 유효성 검증:"
echo "---"

# DEBUG 모드 확인
if [ "$DJANGO_DEBUG" = "True" ]; then
    echo -e "${YELLOW}⚠ DJANGO_DEBUG=True (프로덕션에서는 False 권장)${NC}"
fi

# ALLOWED_HOSTS 확인
if [[ "$DJANGO_ALLOWED_HOSTS" == *"your-ec2-ip-here"* ]]; then
    echo -e "${YELLOW}⚠ DJANGO_ALLOWED_HOSTS에 EC2 IP 또는 도메인을 추가하세요${NC}"
fi

# Qdrant 포트 확인
if [ "$QDRANT_PORT" != "6333" ]; then
    echo -e "${YELLOW}⚠ QDRANT_PORT가 기본값(6333)과 다릅니다: $QDRANT_PORT${NC}"
fi

# 결과 요약
echo ""
echo "================================"
echo "검증 결과"
echo "================================"

if [ ${#MISSING_VARS[@]} -gt 0 ] || [ ${#EMPTY_VARS[@]} -gt 0 ]; then
    echo -e "${RED}✗ 검증 실패!${NC}"
    echo ""
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo "설정되지 않은 필수 환경변수:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        echo ""
    fi
    
    if [ ${#EMPTY_VARS[@]} -gt 0 ]; then
        echo "기본값을 사용 중인 환경변수 (변경 필요):"
        for var in "${EMPTY_VARS[@]}"; do
            echo "  - $var"
        done
        echo ""
    fi
    
    echo ".env 파일을 수정한 후 다시 실행하세요:"
    echo "  vim $ENV_FILE"
    exit 1
else
    echo -e "${GREEN}✓ 모든 필수 환경변수가 올바르게 설정되었습니다!${NC}"
    
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}경고 ${#WARNINGS[@]}개:${NC}"
        for var in "${WARNINGS[@]}"; do
            echo "  - $var (선택사항)"
        done
    fi
    
    echo ""
    exit 0
fi
