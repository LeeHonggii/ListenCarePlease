# TODO 기능 설치 및 실행 가이드

## ✅ 구현 완료 내용

### Backend
1. **TODO 추출 서비스** (`backend/app/services/todo_extractor.py`)
   - 날짜/요일 키워드 기반 문장 추출 (내일, 모레, 월요일 등)
   - 해당 문장 + 앞뒤 3문장씩 컨텍스트 추출
   - GPT-4o로 TODO 생성

2. **데이터베이스 모델** (`backend/app/models/todo.py`)
   - TodoItem, TodoPriority 모델 추가
   - AudioFile과 relationship 설정

3. **API 엔드포인트** (`backend/app/api/v1/todo.py`)
   - `POST /api/v1/todos/extract/{file_id}` - TODO 추출 및 저장
   - `GET /api/v1/todos/{file_id}` - TODO 리스트 조회
   - `DELETE /api/v1/todos/{file_id}` - 모든 TODO 삭제
   - `DELETE /api/v1/todos/{file_id}/{todo_id}` - 특정 TODO 삭제

### Frontend
1. **API 서비스** (`frontend/src/services/api.js`)
   - extractTodos, getTodos, deleteAllTodos, deleteTodo 함수 추가

2. **TODO 페이지** (`frontend/src/pages/TodoPage.jsx`)
   - 캘린더 UI (react-big-calendar)
   - TODO 추출 버튼
   - 날짜별 TODO 표시
   - TODO 상세 모달
   - TODO 삭제 기능

3. **라우터 설정** (`frontend/src/App.jsx`)
   - `/todo/:fileId` 라우트 추가

4. **ResultPage 통합** (`frontend/src/pages/ResultPageNew.jsx`)
   - TODO 버튼 이미 존재 (215-222줄)

---

## 📦 설치 방법

### 1. Frontend 패키지 설치

`package.json`에 이미 추가되어 있습니다. 설치만 하면 됩니다:

```bash
cd frontend
npm install
```

### 2. Backend 패키지 (이미 설치됨)

`backend/requirements.txt:62`에 이미 포함:
- openai==2.8.1

Docker를 사용하므로 이미지 빌드 시 자동 설치됩니다.

### 3. 환경 변수 (이미 설정됨)

`.env`에 이미 `OPENAI_API_KEY`가 설정되어 있습니다:

```env
OPENAI_API_KEY=your-openai-api-key-here
```

**⚠️ 주의**: 실제 API 키는 `.env` 파일에서 확인하세요. 절대 공개 저장소에 실제 키를 커밋하지 마세요!

---

## 🗄️ 데이터베이스 마이그레이션

TODO 테이블을 생성하기 위해 다음 중 하나를 실행하세요:

### 방법 1: Alembic 마이그레이션 (권장)

```bash
cd backend
alembic revision --autogenerate -m "Add TODO table"
alembic upgrade head
```

### 방법 2: 자동 생성 (개발 환경)

FastAPI 앱을 실행하면 자동으로 테이블이 생성됩니다:

```bash
cd backend
uvicorn app.main:app --reload
```

---

## 🚀 실행

### 로컬 개발 (Docker 없이)

#### Backend
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install  # 처음 한 번만
npm run dev
```

### Docker로 실행 (권장)

```bash
# 데이터베이스 마이그레이션 (처음 한 번만)
docker-compose up -d mysql
docker-compose exec backend alembic upgrade head

# 전체 서비스 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
```

### 3. TODO 기능 사용

1. 회의록 결과 페이지 (`/result/:fileId`)로 이동
2. 하단의 **"TODO"** 버튼 클릭
3. **"TODO 추출"** 버튼 클릭
4. 캘린더에서 날짜별 TODO 확인

---

## 🎯 핵심 기능

### 1. 날짜 키워드 자동 인식

다음 키워드를 자동으로 인식합니다:
- 상대적 날짜: 오늘, 내일, 모레, 이번 주, 다음 주
- 요일: 월요일, 화요일, 수요일, 목요일, 금요일, 토요일, 일요일
- 숫자 패턴: 3일 후, 2주 뒤, 11월 25일, 11/25

### 2. 컨텍스트 기반 추출

- 날짜 키워드가 포함된 문장 찾기
- **앞 3문장 + 해당 문장 + 뒤 3문장** (총 7문장) 추출
- 전체 회의록이 아닌 관련 부분만 GPT에 전달 (비용 절감)

### 3. 캘린더 UI

- 날짜별 TODO 시각화
- 우선순위별 색상 구분:
  - 🔴 High: 빨강
  - 🟠 Medium: 주황
  - 🟢 Low: 녹색
- TODO 클릭 시 상세 정보 표시
- TODO 삭제 기능

### 4. 회의 날짜 자동 인식

- 파일 업로드 날짜를 회의 날짜로 자동 설정
- "내일", "모레" 등의 상대적 날짜를 절대 날짜로 변환

---

## 🔧 API 사용 예시

### TODO 추출

```bash
curl -X POST "http://localhost:8000/api/v1/todos/extract/1" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_date": "2025-11-25"
  }'
```

### TODO 조회

```bash
curl "http://localhost:8000/api/v1/todos/1"
```

### TODO 삭제

```bash
curl -X DELETE "http://localhost:8000/api/v1/todos/1/5"
```

---

## 📝 주의사항

1. **OpenAI API 키 필수**: GPT-4o를 사용하므로 API 키가 필요합니다.
2. **회의록 생성 완료 후 사용**: TODO 추출은 최종 회의록(`FinalTranscript`)이 있어야 작동합니다.
3. **구글 캘린더 연동은 제외**: 일단 자체 캘린더 UI만 구현했습니다.

---

## 🐛 트러블슈팅

### "TODO 추출에 실패했습니다"

- `.env` 파일에 `OPENAI_API_KEY`가 설정되어 있는지 확인
- Backend 로그에서 에러 메시지 확인

### "회의록이 아직 생성되지 않았습니다"

- 파일 처리가 완료되었는지 확인 (`/result/:fileId` 접근 가능 여부)
- 태깅까지 완료된 파일만 TODO 추출 가능

### 캘린더가 표시되지 않음

```bash
cd frontend
npm install react-big-calendar moment
npm run dev
```

---

## 📊 데이터베이스 스키마

```sql
CREATE TABLE todo_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_id INT NOT NULL,
    task TEXT NOT NULL,
    assignee VARCHAR(100),
    due_date DATETIME,
    priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
    created_at DATETIME NOT NULL,
    FOREIGN KEY (file_id) REFERENCES audio_files(id) ON DELETE CASCADE
);
```

---

## ✨ 완료!

이제 회의록에서 자동으로 TODO를 추출하고 캘린더에서 확인할 수 있습니다!
