# PyMate 프로젝트 시작 가이드

## 1. 가상환경 생성 및 활성화
python -m venv .venv --python=3.12
source .venv/bin/activate  # Windows: .venv\Scripts\activate

## 2. 의존성 설치
pip install -r requirements.txt

## 3. 환경 변수 설정
### .env.local

[pymate_deploy/.env.local.example](pymate_deploy/.env.local.example) 참고

## 4. 로컬 서버 실행 (Docker)
Docker Compose를 사용하여 Django, PostgreSQL, Qdrant, Nginx 컨테이너를 통합 실행합니다.

```bash
# 컨테이너 빌드 및 실행 (로그 확인 가능)
docker compose -f pymate_deploy/docker-compose.local.yml up --build

# 백그라운드 실행을 원하면 -d 옵션 추가
# docker compose -f pymate_deploy/docker-compose.local.yml up -d --build
```

**실행 확인:**
- **Django 웹사이트**: [http://localhost](http://localhost) (Nginx 포트 80)
- **Qdrant 대시보드**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

## 5. 데이터베이스 초기화
Qdrant 벡터 DB에 필요한 컬렉션(`learning_ai`, `quizzes`)을 다운로드하고 초기화해야 합니다.

**방법 A: 로컬 터미널에서 실행 (uv 사용 추천)**
```bash
# 1. 의존성 설치 (최초 1회)
uv sync

# 2. 초기화 스크립트 실행
uv run python rag/init_setting.py
```

**방법 B: Docker 컨테이너 내부에서 실행**
```bash
docker compose -f pymate_deploy/docker-compose.local.yml exec django python rag/init_setting.py
```

## 6. EC2 배포 (Production)
운영 환경(AWS EC2) 배포를 위한 가이드는 아래 문서를 참고하세요.

- **📜 상세 배포 가이드**: [pymate_deploy/DEPLOYMENT.md](pymate_deploy/DEPLOYMENT.md)
- **🚀 배포 스크립트**: `pymate_deploy/deploy.sh`

**간단 배포 절차:**
1. EC2 인스턴스 접속 (`ssh`)
2. 코드 클론: `git clone ...`
3. 환경 설정: `.env` 파일 [pymate_deploy/.env.example](pymate_deploy/.env.example) 참고
4. static 파일 복사: `python manage.py collectstatic`
5. 초기 설정: `pymate_deploy/setup-ec2.sh` 실행
6. 배포: `pymate_deploy/deploy.sh` 실행