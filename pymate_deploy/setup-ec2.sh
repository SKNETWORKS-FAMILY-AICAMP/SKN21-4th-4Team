#!/bin/bash

################################################################################
# EC2 인스턴스 초기 설정 스크립트
# 
# 이 스크립트는 새로운 EC2 인스턴스에서 최초 1회만 실행됩니다.
# Ubuntu 24.04 LTS 기준으로 작성되었습니다.
#
# 사용법:
#   chmod +x setup-ec2.sh
#   sudo ./setup-ec2.sh
################################################################################

set -e  # 에러 발생 시 즉시 중단

echo "================================"
echo "EC2 초기 설정 시작"
echo "================================"

# 1. 시스템 패키지 업데이트
echo "[1/7] 시스템 패키지 업데이트 중..."
apt-get update
apt-get upgrade -y

# 2. 필수 패키지 설치
echo "[2/7] 필수 패키지 설치 중..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ca-certificates \
    gnupg \
    lsb-release

# 3. Docker 설치
echo "[3/7] Docker 설치 중..."
if ! command -v docker &> /dev/null; then
    # Docker 공식 GPG 키 추가
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Docker Repository 추가
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Docker 설치
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Docker 서비스 시작 및 자동 시작 설정
    systemctl start docker
    systemctl enable docker
    
    echo "✓ Docker 설치 완료"
else
    echo "✓ Docker가 이미 설치되어 있습니다."
fi

# 4. Docker Compose 설치 확인
echo "[4/7] Docker Compose 확인 중..."
if docker compose version &> /dev/null; then
    echo "✓ Docker Compose 설치 완료"
else
    echo "✗ Docker Compose 설치 실패"
    exit 1
fi

# 5. 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 사용)
echo "[5/7] Docker 권한 설정 중..."
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    echo "✓ $SUDO_USER 사용자를 docker 그룹에 추가했습니다."
    echo "  로그아웃 후 다시 로그인하면 sudo 없이 docker를 사용할 수 있습니다."
fi

# 6. 방화벽 설정 (UFW)
echo "[6/7] 방화벽 설정 중..."
if command -v ufw &> /dev/null; then
    # 기본 정책 설정
    ufw default deny incoming
    ufw default allow outgoing
    
    # SSH 허용 (22번 포트)
    ufw allow ssh
    
    # HTTP/HTTPS 허용 (80, 443번 포트)
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Qdrant 포트 (로컬에서만 접근 가능하도록 설정)
    # EC2 보안 그룹에서 제어하므로 여기서는 열지 않음
    
    # 방화벽 활성화
    echo "y" | ufw enable
    
    echo "✓ 방화벽 설정 완료"
else
    echo "! UFW가 설치되지 않았습니다. 필요시 수동으로 설치하세요."
fi

# 7. 프로젝트 디렉토리 생성
echo "[7/7] 프로젝트 디렉토리 생성 중..."
PROJECT_DIR="/home/$SUDO_USER/app"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
    if [ -n "$SUDO_USER" ]; then
        chown -R $SUDO_USER:$SUDO_USER $PROJECT_DIR
    fi
    echo "✓ 프로젝트 디렉토리 생성: $PROJECT_DIR"
else
    echo "✓ 프로젝트 디렉토리가 이미 존재합니다: $PROJECT_DIR"
fi

# 완료
echo ""
echo "================================"
echo "✓ EC2 초기 설정 완료!"
echo "================================"
echo ""
echo "다음 단계:"
echo "1. 로그아웃 후 다시 로그인 (docker 권한 적용)"
echo "2. 프로젝트 코드를 $PROJECT_DIR 에 클론"
echo "   git clone <repository-url> $PROJECT_DIR"
echo "3. .env 파일 설정"
echo "4. deploy.sh 스크립트로 배포 실행"
echo ""
echo "설치된 버전:"
echo "  - Docker: $(docker --version)"
echo "  - Docker Compose: $(docker compose version)"
echo ""
