# 💻 로컬 개발 환경 가이드

> **대상**: 팀원들이 자신의 컴퓨터에서 프로젝트를 개발/테스트할 때 사용

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [빠른 시작 (3단계)](#빠른-시작-3단계)
3. [상세 설명](#상세-설명)
4. [유용한 명령어](#유용한-명령어)
5. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### ✅ 설치 필요

1. **Git**
   - [다운로드](https://git-scm.com/downloads)
   - 설치 확인: `git --version`

2. **Docker Desktop**
   - **Windows**: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
     - WSL 2 백엔드 사용 권장
   - **Mac**: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
   - **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)
   - 설치 확인: `docker --version`, `docker compose version`

> [!IMPORTANT]
> Docker Desktop을 설치한 후 **컴퓨터를 재시작**하세요!

### 💡 권장 사양

- **RAM**: 최소 8GB (16GB 권장)
- **디스크**: 최소 10GB 여유 공간
- **인터넷**: API 키 발급 및 Docker 이미지 다운로드용

---

## 빠른 시작 (3단계)

### Step 1: 프로젝트 클론

```bash
# GitHub에서 프로젝트 클론
git clone https://github.com/<사용자명>/SKN21-4th-4Team.git
cd SKN21-4th-4Team
```

### Step 2: 환경 변수 설정

```bash
# 1. 예제 파일 복사
cp deploy/.env.local.example .env.local

# 2. 편집기로 .env.local 파일 열기
notepad .env.local  # Windows
# 또는
code .env.local     # VSCode 사용 시

# 3. OPENAI_API_KEY 입력 (필수!)
# OPENAI_API_KEY=sk-proj-your-actual-key-here
```

> [!TIP]
> OpenAI API 키 발급: https://platform.openai.com/api-keys

### Step 3: 실행!

```bash
# Docker 컨테이너 시작
docker compose -f deploy/docker-compose.local.yml --env-file .env.local up

# 또는 백그라운드 실행 (-d 옵션)
docker compose -f deploy/docker-compose.local.yml --env-file .env.local up -d
```

**실행 중 출력 예시**:
```
[+] Running 2/2
 ✔ Container qdrant_local  Started
 ✔ Container django_local  Started
```

### 🎉 접속 테스트

브라우저에서:
- **Django 앱**: http://localhost:8000
- **Qdrant 대시보드**: http://localhost:6333/dashboard

> [!NOTE]
> 처음 실행 시 Docker 이미지 다운로드 및 빌드로 5-10분 소요될 수 있습니다.

---

## 상세 설명

### 🔄 로컬 vs EC2 배포 차이

| 항목 | 로컬 개발 | EC2 배포 |
|------|-----------|----------|
| **파일** | `docker-compose.local.yml` | `docker-compose.yml` |
| **환경변수** | `.env.local` | `.env` |
| **실행 위치** | 내 컴퓨터 | AWS 클라우드 |
| **접속** | `localhost:8000` | `http://<EC2-IP>` |
| **Django 모드** | DEBUG=True (개발) | DEBUG=False (프로덕션) |
| **서버** | `runserver` (hot-reload) | Gunicorn + Nginx |
| **용도** | 개발 & 테스트 | 실제 서비스 제공 |

### 📁 파일 구조

```
SKN21-4th-4Team/
├── deploy/
│   ├── docker-compose.yml          # EC2 배포용 ✈️
│   ├── docker-compose.local.yml    # 로컬 개발용 💻 ← 이걸 사용!
│   ├── .env.example                # EC2용 환경변수 예제
│   └── .env.local.example          # 로컬용 환경변수 예제 ← 복사해서 사용!
│
├── .env.local                       # 로컬용 환경변수 (직접 생성, .gitignore에 포함)
├── django_app/                      # Django 프로젝트
├── src/                             # RAG 시스템
└── main.py                          # RAG 메인 로직
```

### 🔥 Hot-reload (자동 재시작)

로컬 개발 환경에서는 코드를 수정하면 **자동으로 Django 서버가 재시작**됩니다!

```bash
# 1. Docker 컨테이너 실행 중
docker compose -f deploy/docker-compose.local.yml up

# 2. VSCode 등에서 Django 코드 수정
# django_app/apps/chat/views.py 수정

# 3. 저장하면 자동으로 재시작됨!
# Watching for file changes with StatReloader
# Performing system checks...
# Django version 4.2.x, using settings 'config.settings'
# Starting development server at http://0.0.0.0:8000/
```

---

## 유용한 명령어

### Docker 컨테이너 관리

```bash
# 컨테이너 시작 (포그라운드 - 로그가 바로 보임)
docker compose -f deploy/docker-compose.local.yml --env-file .env.local up

# 컨테이너 시작 (백그라운드 - 터미널 사용 가능)
docker compose -f deploy/docker-compose.local.yml --env-file .env.local up -d

# 컨테이너 중지
docker compose -f deploy/docker-compose.local.yml down

# 컨테이너 재시작
docker compose -f deploy/docker-compose.local.yml restart

# 컨테이너 상태 확인
docker compose -f deploy/docker-compose.local.yml ps
```

### 로그 확인

```bash
# 전체 로그
docker compose -f deploy/docker-compose.local.yml logs

# Django 로그만
docker compose -f deploy/docker-compose.local.yml logs django

# Qdrant 로그만
docker compose -f deploy/docker-compose.local.yml logs qdrant

# 실시간 로그 모니터링 (Ctrl+C로 종료)
docker compose -f deploy/docker-compose.local.yml logs -f
```

### Django 관리 명령어

```bash
# Django 컨테이너 안으로 들어가기
docker exec -it django_local bash

# 컨테이너 안에서 실행 가능한 명령어들
python django_app/manage.py migrate          # DB 마이그레이션
python django_app/manage.py createsuperuser  # 관리자 계정 생성
python django_app/manage.py shell            # Django shell
```

### 데이터 초기화

```bash
# 컨테이너 + 볼륨 모두 삭제 (완전 초기화)
docker compose -f deploy/docker-compose.local.yml down -v

# 다시 시작
docker compose -f deploy/docker-compose.local.yml up
```

---

## 트러블슈팅

### ❌ 포트가 이미 사용 중

**문제**: `Error: port is already allocated`

**원인**: 다른 프로그램이 8000 또는 6333 포트를 사용 중

**해결**:
```bash
# Windows - 포트 사용 프로세스 확인
netstat -ano | findstr :8000
netstat -ano | findstr :6333

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID번호> /F

# Mac/Linux
lsof -i :8000
kill -9 <PID>
```

### ❌ Docker Desktop이 실행되지 않음

**문제**: `Cannot connect to the Docker daemon`

**해결**:
1. Docker Desktop 애플리케이션 실행
2. 시스템 트레이에서 Docker 아이콘 확인 (고래 모양)
3. "Docker Desktop is running" 상태 확인

### ❌ 컨테이너가 계속 재시작됨

**문제**: `Status: Restarting`

**해결**:
```bash
# 로그에서 에러 원인 확인
docker compose -f deploy/docker-compose.local.yml logs django

# 주요 원인:
# 1. .env.local 파일 누락 → 파일 생성 확인
# 2. OPENAI_API_KEY 누락 → API 키 입력 확인
# 3. 문법 오류 → 로그에서 에러 메시지 확인
```

### ❌ Hot-reload가 작동하지 않음

**문제**: 코드를 수정해도 자동 재시작되지 않음

**해결**:
```bash
# 1. 볼륨 마운트 확인
docker compose -f deploy/docker-compose.local.yml config

# 2. 컨테이너 재시작
docker compose -f deploy/docker-compose.local.yml restart django

# 3. 여전히 안 되면 완전 재시작
docker compose -f deploy/docker-compose.local.yml down
docker compose -f deploy/docker-compose.local.yml up
```

### ❌ OPENAI_API_KEY 에러

**문제**: `AuthenticationError: No API key provided`

**해결**:
1. `.env.local` 파일 확인
2. `OPENAI_API_KEY=sk-proj-...` 형식으로 입력되었는지 확인 (따옴표 없이!)
3. 컨테이너 재시작

```bash
docker compose -f deploy/docker-compose.local.yml restart
```

### ❌ 디스크 공간 부족

**문제**: Docker 이미지/컨테이너가 많아서 디스크 공간 부족

**해결**:
```bash
# 사용하지 않는 이미지/컨테이너 정리
docker system prune -a

# 볼륨까지 모두 정리 (주의: 데이터 삭제됨!)
docker system prune -a --volumes
```

---

## 💡 개발 팁

### VSCode에서 개발하기

1. **확장 프로그램 설치**
   - Docker
   - Python
   - Django

2. **작업 흐름**
   ```bash
   # 1. Docker 컨테이너 시작
   docker compose -f deploy/docker-compose.local.yml up -d
   
   # 2. VSCode로 코드 열기
   code .
   
   # 3. 코드 수정 → 자동 저장 → 자동 재시작!
   
   # 4. 브라우저에서 테스트
   # http://localhost:8000
   ```

### Git 작업 흐름

```bash
# 1. 새 브랜치 생성
git checkout -b feature/quiz-api

# 2. 로컬에서 개발 & 테스트
docker compose -f deploy/docker-compose.local.yml up

# 3. 코드 수정 후 커밋
git add .
git commit -m "Quiz API 구현"

# 4. GitHub에 푸시
git push origin feature/quiz-api

# 5. Pull Request 생성
```

---

## 다음 단계

- [ ] 코드 수정 후 hot-reload 동작 확인
- [ ] Django 관리자 페이지 접속 (`/admin`)
- [ ] API 테스트 (`/api/chat/`, `/api/quiz/`)
- [ ] Qdrant 대시보드에서 벡터 데이터 확인

---

## 참고 자료

- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Django 공식 문서](https://docs.djangoproject.com/)
- [Qdrant 공식 문서](https://qdrant.tech/documentation/)
- **EC2 배포 가이드**: [DEPLOYMENT.md](./DEPLOYMENT.md)
