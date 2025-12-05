# 🧹 완전 초기화 및 재빌드 가이드

## ⚠️ 주의: 모든 데이터가 삭제됩니다!

이 과정은 다음을 완전히 삭제합니다:
- 모든 Docker 컨테이너
- 모든 Docker 이미지
- 모든 Docker 볼륨 (DB 데이터 포함)
- 모든 업로드된 파일

---

## 🗑️ 완전 초기화

```bash
# 1. 모든 컨테이너 중지 및 삭제 (볼륨 포함)
docker-compose down -v

# 2. 이미지 삭제
docker rmi listencareplease-backend listencareplease-frontend listencareplease-mysql

# 3. 업로드 폴더 삭제 (선택사항)
rm -rf backend/uploads backend/temp backend/.cache

# 4. Docker 시스템 정리 (선택사항 - 다른 프로젝트에도 영향)
docker system prune -af --volumes
```

---

## 🔄 재빌드 및 실행

### 1. Backend 재빌드 (TODO 기능 포함)

```bash
docker-compose build --no-cache backend
```

### 2. 전체 서비스 실행

```bash
docker-compose up -d
```

### 3. 로그 확인

```bash
# Backend 로그
docker-compose logs -f backend

# 전체 로그
docker-compose logs -f
```

---

## ✅ 확인

### 서비스 상태 확인
```bash
docker-compose ps
```

예상 출력:
```
NAME                    STATUS          PORTS
listencare_backend      Up             0.0.0.0:8000->8000/tcp
listencare_frontend     Up             0.0.0.0:3000->3000/tcp
listencare_mysql        Up             0.0.0.0:3306->3306/tcp
```

### 접속 확인
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## 📊 데이터베이스 자동 생성

FastAPI 앱 시작 시 자동으로 테이블이 생성됩니다:
- ✅ users
- ✅ audio_files
- ✅ preprocessing_results
- ✅ stt_results
- ✅ diarization_results
- ✅ detected_names
- ✅ speaker_mappings
- ✅ final_transcripts
- ✅ summaries
- ✅ **todos** ← 새로 추가됨

Backend 로그에서 확인:
```
🔧 Creating database tables...
✅ Database tables created successfully
```

---

## 🎯 TODO 기능 사용

1. 파일 업로드 및 처리 완료
2. `/result/{fileId}` 페이지 접속
3. 하단 "TODO" 버튼 클릭
4. "TODO 추출" 버튼 클릭
5. 캘린더에서 확인

---

## 🐛 문제 해결

### "Cannot connect to MySQL"
```bash
# MySQL 컨테이너 상태 확인
docker-compose ps mysql

# MySQL 로그 확인
docker-compose logs mysql

# MySQL 재시작
docker-compose restart mysql
```

### "Module not found: todo_extractor"
```bash
# Backend 재빌드
docker-compose build --no-cache backend
docker-compose up -d backend
```

### "react-big-calendar not found"
```bash
# Frontend 컨테이너 접속
docker-compose exec frontend sh

# 패키지 재설치
npm install
exit

# Frontend 재시작
docker-compose restart frontend
```

---

## 📝 체크리스트

빌드 전:
- [ ] `.env` 파일 존재 확인
- [ ] `OPENAI_API_KEY` 설정 확인
- [ ] Docker Desktop 실행 확인

빌드 후:
- [ ] 3개 컨테이너 모두 Up 상태
- [ ] Backend 로그에 "Database tables created" 확인
- [ ] http://localhost:8000/health 접속 성공
- [ ] http://localhost:3000 접속 성공

---

## 🎉 완료!

이제 깨끗한 환경에서 TODO 기능을 포함한 ListenCarePlease가 실행됩니다!
