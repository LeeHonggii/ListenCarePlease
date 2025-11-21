# 환경 설정 가이드

## 📦 설치 방법

### 1️⃣ Mac (Apple Silicon M1/M2/M3)

```bash
# 의존성 설치
pip install -r backend/requirements-base.txt
pip install -r backend/requirements-mac.txt

# Docker 사용 시
docker build -f backend/Dockerfile.mac -t listencare-backend-mac .
```

### 2️⃣ GPU Server (NVIDIA CUDA)

```bash
# 의존성 설치
pip install -r backend/requirements-base.txt
pip install -r backend/requirements-gpu.txt

# Docker 사용 시
docker build -f backend/Dockerfile.gpu -t listencare-backend-gpu .
```

### 3️⃣ CPU Only (Fallback)

```bash
# 의존성 설치
pip install -r backend/requirements-base.txt
pip install -r backend/requirements-mac.txt  # CPU에서도 Mac 버전 사용
```

---

## 🖥️ 디바이스 확인

Python에서 현재 사용 중인 디바이스 확인:

```python
from app.core.device import print_device_info

print_device_info()
```

출력 예시:
```
==================================================
🖥️  Device Configuration
==================================================
device              : mps
platform            : Darwin
machine             : arm64
torch_version       : 2.1.0
mps_available       : True
recommendation      : Apple Silicon detected - using Metal Performance Shaders
==================================================
```

---

## 📋 Requirements 파일 구조

- **requirements-base.txt** - 공통 의존성 (FastAPI, MySQL, OpenAI 등)
- **requirements-mac.txt** - Mac 전용 (PyTorch MPS, Diarization)
- **requirements-gpu.txt** - GPU 전용 (PyTorch CUDA, Diarization)

---

## 🐳 Docker 환경 설정

### 처음 시작하기

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/ListenCarePlease

# Docker 컨테이너 빌드 및 실행
docker compose up --build

# 또는 백그라운드 실행
docker compose up -d --build
```

### 접속 주소
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Backend API Docs:** http://localhost:8000/docs
- **MySQL:** localhost:3306

---

## 🔧 Docker Compose 설정

### Mac 환경
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.mac
```

### GPU 환경
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.gpu
  runtime: nvidia
  environment:
    - NVIDIA_VISIBLE_DEVICES=all
```

---

## 🗄️ 데이터베이스 관리

### MySQL 접속

```bash
# 방법 1: Docker 컨테이너를 통해 바로 접속
docker exec -it listencare_mysql mysql -u listencare_user -plistencare_pass123 listencare

# 방법 2: bash로 먼저 접속 후 mysql 실행
docker exec -it listencare_mysql bash
mysql -u listencare_user -plistencare_pass123 listencare
```

### MySQL 기본 명령어

```sql
-- 데이터베이스 선택
USE listencare;

-- 테이블 목록 확인
SHOW TABLES;

-- 테이블 구조 확인
DESC users;
DESC audio_files;

-- 데이터 조회
SELECT * FROM users;
SELECT * FROM audio_files LIMIT 10;

-- 테이블 데이터 개수 확인
SELECT COUNT(*) FROM users;

-- 종료
exit;
```

### Alembic 마이그레이션

```bash
# Backend 컨테이너 접속
docker exec -it listencare_backend bash

# 현재 마이그레이션 상태 확인
alembic current

# 마이그레이션 히스토리 확인
alembic history

# 새 마이그레이션 생성 (모델 변경 후)
alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
alembic upgrade head

# 마이그레이션 롤백 (1단계)
alembic downgrade -1

# 특정 버전으로 롤백
alembic downgrade <revision_id>

# 컨테이너에서 나가기
exit
```

---

## 🎨 프론트엔드 개발

### 로컬 개발 (Docker 없이)

```bash
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드된 파일 미리보기
npm run preview
```

### 코드 수정 후

Docker를 사용 중이면 자동으로 핫 리로드됩니다.
변경사항이 반영 안되면:

```bash
docker compose restart frontend
```

---

## 🔧 백엔드 개발

### 로컬 개발 (Docker 없이)

```bash
cd backend

# 가상환경 생성 (처음만)
python -m venv venv

# 가상환경 활성화
source venv/bin/activate  # Mac/Linux
# 또는
venv\Scripts\activate     # Windows

# 패키지 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API 문서 확인

```bash
# 브라우저에서 열기
open http://localhost:8000/docs
```

### 코드 수정 후

Docker를 사용 중이면 자동으로 핫 리로드됩니다.
변경사항이 반영 안되면:

```bash
docker compose restart backend
```

---

## 🔐 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
# .env 파일
# Database
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=listencare
MYSQL_USER=listencare_user
MYSQL_PASSWORD=listencare_pass123

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# LangSmith (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=speaker-tagging-agent

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Whisper & Diarization
WHISPER_MODE=local  # "local" or "api"
DIARIZATION_MODE=senko  # "senko" or "nemo"

# LLM Model
LLM_MODEL_NAME=gpt-5-mini-2025-08-07
```

---

## 🚀 성능 비교

| 환경 | 디바이스 | 속도 (상대적) | 추천 |
|------|---------|-------------|------|
| Mac M1/M2/M3 | MPS | ⚡⚡⚡ 빠름 | 개발/테스트 |
| NVIDIA GPU | CUDA | ⚡⚡⚡⚡ 매우 빠름 | 프로덕션 |
| CPU only | CPU | ⚡ 느림 | 비추천 |

---

## ⚠️ 주의사항

1. **Mac에서 CUDA 사용 불가** - M1/M2/M3는 MPS 사용
2. **GPU 서버에서 MPS 사용 불가** - NVIDIA GPU만 CUDA 지원
3. **CPU fallback** - GPU/MPS 없으면 자동으로 CPU 사용 (느림)

---

## 🛠️ 유용한 명령어

### Docker 관리

```bash
# 컨테이너 시작
docker compose up

# 백그라운드로 시작
docker compose up -d

# 컨테이너 중지
docker compose down

# 컨테이너 재시작
docker compose restart

# 특정 서비스만 재시작
docker compose restart backend
docker compose restart frontend
docker compose restart mysql

# 로그 확인
docker compose logs
docker compose logs backend
docker compose logs -f backend  # 실시간

# 컨테이너 접속
docker exec -it listencare_backend bash
docker exec -it listencare_frontend sh
docker exec -it listencare_mysql bash

# 컨테이너 상태 확인
docker ps
docker ps -a
docker compose ps
```

### 완전 초기화

```bash
# 컨테이너 중지 및 삭제
docker compose down

# 볼륨까지 모두 삭제 (DB 데이터 삭제됨 주의!)
docker compose down -v

# 이미지까지 삭제
docker compose down --rmi all

# 완전 초기화 후 재시작
docker compose down -v
docker compose up --build
```

### 파일 업로드 디렉토리 확인

```bash
# Backend 컨테이너 접속
docker exec -it listencare_backend bash

# 업로드된 파일 확인
ls -lh /app/uploads

# 용량 확인
du -sh /app/uploads

# 파일 삭제 (주의!)
rm -rf /app/uploads/*

exit
```

### 환경 변수 확인

```bash
# Backend 환경 변수 확인
docker exec -it listencare_backend env | grep MYSQL

# Frontend 환경 변수 확인
docker exec -it listencare_frontend env
```

### 디스크 정리

```bash
# 사용하지 않는 Docker 이미지 삭제
docker image prune

# 사용하지 않는 컨테이너 삭제
docker container prune

# 사용하지 않는 볼륨 삭제
docker volume prune

# 모든 미사용 리소스 삭제
docker system prune -a
```

---

## 🔥 트러블슈팅

### 포트가 이미 사용 중일 때

```bash
# 포트 사용 확인 (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :3306

# 포트 사용 확인 (Mac/Linux)
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :3306  # MySQL

# 프로세스 종료 (Mac/Linux)
kill -9 <PID>

# 프로세스 종료 (Windows)
taskkill /PID <PID> /F
```

### Docker 캐시 문제

```bash
# 캐시 무시하고 빌드
docker compose build --no-cache

# 완전히 새로 시작
docker compose down -v
docker compose build --no-cache
docker compose up
```

### 권한 문제

```bash
# 업로드 디렉토리 권한 수정
docker exec -it listencare_backend bash
chmod -R 777 /app/uploads
exit
```

### 패키지 설치 오류

```bash
# Backend 패키지 재설치
docker compose down
docker compose build --no-cache backend
docker compose up

# Frontend 패키지 재설치
docker compose down
docker compose build --no-cache frontend
docker compose up
```

---

## 💡 개발 팁

### VS Code에서 작업할 때

**터미널 1:** Docker 로그
```bash
docker compose logs -f
```

**터미널 2:** 명령어 실행용
```bash
# 필요시 컨테이너 접속 등
```

### 자주 사용하는 개발 플로우

```bash
# 1. 백그라운드 실행
docker compose up -d

# 2. 로그 모니터링 (새 터미널에서)
docker compose logs -f backend

# 3. API 문서 열기 (브라우저)
open http://localhost:8000/docs

# 4. Frontend 열기 (브라우저)
open http://localhost:3000
```

---

## 📚 참고 문서

- [프로젝트 아키텍처](./architecture.md)
- [파이프라인 I/O](./pipeline-io.md)
- [Agent 워크플로우](./agent-workflow.md)
- [DB 스키마](../database_schema.md)
