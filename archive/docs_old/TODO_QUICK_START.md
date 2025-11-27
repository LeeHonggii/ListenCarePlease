# 🚀 TODO 기능 빠른 시작 가이드

## ✅ 이미 완료된 사항

1. ✅ **Backend 패키지**: `requirements.txt:62`에 `openai==2.8.1` 포함
2. ✅ **환경 변수**: `.env:31`에 `OPENAI_API_KEY` 설정됨
3. ✅ **Frontend 패키지**: `package.json`에 `react-big-calendar`, `moment` 추가됨
4. ✅ **코드 통합**: 모든 파일 작성 완료

## 📦 설치 (한 번만)

### 1. Frontend 패키지 설치
```bash
cd frontend
npm install
```

### 2. 데이터베이스 마이그레이션

#### Docker 사용 시
```bash
docker-compose up -d mysql
docker-compose exec backend alembic upgrade head
```

#### 로컬 개발 시
```bash
cd backend
alembic upgrade head
```

---

## 🎯 실행

### Docker로 실행 (권장)

```bash
# 전체 서비스 실행
docker-compose up -d

# Backend 로그 확인
docker-compose logs -f backend
```

### 로컬 개발

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 💡 사용 방법

1. **회의록 결과 페이지**로 이동
   - URL: `http://localhost:3000/result/{fileId}`

2. 하단 **"TODO"** 버튼 클릭

3. **"TODO 추출"** 버튼 클릭
   - 회의록에서 날짜 키워드 자동 인식
   - GPT-4o로 TODO 생성

4. **캘린더에서 확인**
   - 🔴 High (빨강)
   - 🟠 Medium (주황)
   - 🟢 Low (녹색)

5. TODO 클릭하여 **상세 정보** 확인 및 삭제

---

## 🔧 핵심 기능

### 자동 인식 키워드
- **상대 날짜**: 오늘, 내일, 모레, 이번 주, 다음 주
- **요일**: 월요일, 화요일, 수요일, ...
- **날짜 패턴**: 11/25, 11월 25일, 3일 후, 2주 뒤

### 똑똑한 추출
- 날짜 키워드 문장 + **앞뒤 3문장씩** 컨텍스트 추출
- 전체 회의록이 아닌 **관련 부분만** GPT에 전달
- GPT 비용 절감 + 정확도 향상

---

## 📁 생성된 주요 파일

### Backend
- `backend/app/services/todo_extractor.py` - TODO 추출 로직
- `backend/app/models/todo.py` - 데이터베이스 모델
- `backend/app/api/v1/todo.py` - API 엔드포인트

### Frontend
- `frontend/src/pages/TodoPage.jsx` - 캘린더 UI
- `frontend/src/services/api.js:117-143` - API 함수

---

## 🐛 문제 해결

### "TODO 추출에 실패했습니다"
- `.env` 파일의 `OPENAI_API_KEY` 확인
- Backend 로그 확인: `docker-compose logs backend`

### "회의록이 아직 생성되지 않았습니다"
- 파일 처리가 완료되었는지 확인
- `/result/:fileId` 페이지 접근 가능 여부 확인

### 캘린더가 표시되지 않음
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 데이터베이스 테이블이 없음
```bash
# Docker
docker-compose exec backend alembic upgrade head

# 로컬
cd backend
alembic upgrade head
```

---

## 🎉 완료!

이제 회의록에서 자동으로 TODO를 추출하고 캘린더로 관리할 수 있습니다!

**다음 단계 (선택사항)**:
- [ ] 구글 캘린더 연동
- [ ] TODO 수정 기능
- [ ] 알림 기능
- [ ] 담당자별 필터링
