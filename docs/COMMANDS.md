# ListenCarePlease - 명령어 사용법

## 목차
- [개발 환경 실행](#개발-환경-실행)
- [Docker 관리](#docker-관리)
- [데이터베이스 관리](#데이터베이스-관리)
- [프론트엔드](#프론트엔드)
- [백엔드](#백엔드)
- [유용한 명령어](#유용한-명령어)

---

## 개발 환경 실행

### 처음 시작하기

```bash
# 프로젝트 디렉토리로 이동
cd /Users/lee-hong-gi/Desktop/ListenCarePlease

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

## Docker 관리

### 시작/중지/재시작

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
```

### 로그 확인

```bash
# 모든 컨테이너 로그 확인
docker compose logs

# 특정 서비스 로그 확인
docker compose logs backend
docker compose logs frontend
docker compose logs mysql

# 실시간 로그 확인 (-f: follow)
docker compose logs -f backend

# 마지막 100줄만 보기
docker compose logs --tail=100 backend
```

### 컨테이너 접속

```bash
# Backend 컨테이너 접속
docker exec -it listencare_backend bash

# Frontend 컨테이너 접속
docker exec -it listencare_frontend sh

# MySQL 컨테이너 접속
docker exec -it listencare_mysql bash
```

### 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a

# 컨테이너 상세 정보
docker compose ps
```

### 완전 초기화

```bash
# 컨테이너 중지 및 삭제
docker compose down

# 볼륨까지 모두 삭제 (DB 데이터 삭제됨 주의!)
docker compose down -v

# 이미지까지 삭제

# 완전 초기화 후 재시작
docker compose down -v
docker compose up --build
```

---

## 데이터베이스 관리

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

## 프론트엔드

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

## 백엔드

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

## 유용한 명령어

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

### 프로젝트 구조 확인

```bash
# 전체 구조 보기 (tree 설치 필요)
tree -L 3 -I 'node_modules|__pycache__|.git'

# 또는
ls -R
```

---

## 트러블슈팅

### 포트가 이미 사용 중일 때

```bash
# 포트 사용 확인
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :3306  # MySQL

# 프로세스 종료
kill -9 <PID>
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

## 팁

### 개발 시 자주 사용하는 명령어

```bash
# 백그라운드 실행
docker compose up -d

# 로그 모니터링 (새 터미널에서)
docker compose logs -f backend

# API 문서 열기
open http://localhost:8000/docs

# Frontend 열기
open http://localhost:3000
```

### VS Code에서 작업할 때

1. **터미널 1:** Docker 로그
```bash
docker compose logs -f
```

2. **터미널 2:** 명령어 실행용
```bash
# 필요시 컨테이너 접속 등
```

---

## 참고 문서

- **프로젝트 설계:** `pdr.md`
- **파이프라인 I/O:** `I,O.md`
- **DB 스키마:** `database_schema.md`
- **Docker Compose 설정:** `docker-compose.yml`
