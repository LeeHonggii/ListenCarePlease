# 📝 Change Log

프로젝트의 주요 변경사항과 업데이트 이력을 기록합니다.

---

## [2025-01-XX] RAG 시스템 구현 완료

### ✅ 완료된 작업

#### 1. **RAG 시스템 구현 (Pinecone → ChromaDB 전환)**
- **벡터 DB 변경**: Pinecone에서 ChromaDB로 전환
  - 로컬 파일 시스템 기반 (`./chroma_db` 디렉토리)
  - 컬렉션 명명 규칙: `meeting_{file_id}`
  - 임베딩 모델: OpenAI Embeddings (1536차원)
- **주요 기능**:
  - 벡터 DB 초기화 (`POST /api/v1/rag/{file_id}/initialize`)
  - 질문 및 답변 (`POST /api/v1/rag/{file_id}/chat`)
  - 화자 목록 조회 (`GET /api/v1/rag/{file_id}/speakers`)
  - RAG 상태 조회 (`GET /api/v1/rag/{file_id}/status`)
  - 벡터 DB 삭제 (`DELETE /api/v1/rag/{file_id}`)

#### 2. **벡터 DB 상태 관리**
- **DB 스키마 확장**: `audio_files` 테이블에 RAG 상태 필드 추가
  - `rag_collection_name`: ChromaDB 컬렉션 이름
  - `rag_initialized`: 초기화 여부 (Boolean)
  - `rag_initialized_at`: 초기화 시간
- **Alembic 마이그레이션**: `add_rag_status_fields_to_audio_file.py` 생성 및 적용
- **상태 저장**: 초기화 성공 시 DB에 상태 저장하여 다음 요청 시 재초기화 불필요

#### 3. **화자명 변경 시 벡터 DB 자동 관리**
- **자동 삭제**: 태깅 확정 시 화자명 변경 감지
  - 기존 `SpeakerMapping`과 새 매핑 비교
  - 변경 감지 시 기존 벡터 DB 컬렉션 자동 삭제
  - `audio_files.rag_initialized = false`로 설정
- **재생성**: 사용자가 RAG를 다시 사용하려면 초기화 필요

#### 4. **FinalTranscript 생성 로직 추가**
- **태깅 확정 시 생성**: `POST /api/v1/tagging/confirm`에서 `FinalTranscript` 생성
  - `STTResult` + `DiarizationResult` + `SpeakerMapping` 조합
  - 화자명이 확정된 최종 회의록 저장
- **동적 생성**: RAG 초기화 시 `FinalTranscript`가 없으면 동적으로 생성
  - `final_name` 우선 사용, 없으면 `suggested_name` 사용
  - 생성한 결과를 `FinalTranscript`에 저장하여 다음번 재사용

#### 5. **질문 분석 기능 추가**
- **화자 필터 자동 감지**: LLM을 사용하여 질문에서 화자 이름 추출
  - 유사도 기반 화자 매칭 (SequenceMatcher 사용)
  - 화자 필터가 감지되면 자동으로 필터링된 검색 수행
- **개선된 검색**: 중복 제거, 정렬, 토큰 제한 적용

#### 6. **프론트엔드 RAG 페이지 개선**
- **자동 초기화**: 벡터 DB가 초기화되지 않은 경우 자동 초기화 시도
- **에러 처리**: 회의록이 없는 경우 명확한 메시지 표시
- **상태 관리**: 초기화 상태 확인 및 UI 반영

### 🔧 기술 개선

#### 1. **RAG 서비스 개선**
- `rag_service.py`에 질문 분석 로직 추가
- `get_vectorstore()` 에러 처리 개선
- `store_transcript()` 기존 컬렉션 삭제 후 재생성 로직 추가
- OpenAI 클라이언트 초기화 및 LangSmith 통합 개선

#### 2. **API 엔드포인트 추가**
- `GET /api/v1/rag/{file_id}/status`: RAG 초기화 상태 조회
- 모든 엔드포인트에서 벡터 DB 초기화 상태 확인

### 📊 영향받은 파일

#### Backend
```
backend/app/models/audio_file.py
backend/app/api/v1/rag.py
backend/app/api/v1/tagging.py
backend/app/services/rag_service.py
backend/alembic/versions/add_rag_status_fields_to_audio_file.py
```

#### Frontend
```
frontend/src/pages/RagPage.jsx
```

### 🎯 주요 성과

1. **RAG 시스템 완전 구현**: ChromaDB 기반 벡터 검색 및 질문/답변 기능 완성
2. **상태 관리 체계화**: DB에 벡터 DB 상태 저장으로 일관성 확보
3. **자동화**: 화자명 변경 시 벡터 DB 자동 관리
4. **사용자 경험 개선**: 자동 초기화 및 명확한 에러 메시지

---

## [2025-11-24] UI/UX 개선 및 버그 수정

### ✅ 완료된 작업

#### 1. **다크모드 테마 통합 완료**
- **대상 페이지**: SpeakerInfoConfirmPage, TaggingAnalyzingPage, ProcessingPage
- **변경 내용**:
  - 기존 gradient 배경 제거 (indigo/purple 계열)
  - 통일된 테마 변수로 변경:
    - `bg-bg-tertiary dark:bg-bg-tertiary-dark`
    - `accent-blue` (기존 indigo/purple 대체)
    - `border-bg-accent/30`
  - 모든 버튼, 카드, 입력 필드에 dark mode 지원 추가
- **영향받은 파일**:
  - `frontend/src/pages/SpeakerInfoConfirmPage.jsx`
  - `frontend/src/pages/TaggingAnalyzingPage.jsx`
  - `frontend/src/pages/ProcessingPage.jsx`
- **결과**: 모든 페이지가 동일한 색상 팔레트를 사용하여 일관된 사용자 경험 제공

#### 2. **대시보드 통계 표시 버그 수정**
- **문제**: 총 파일 수, 처리 중 파일 수 등 모든 통계가 0으로 표시
- **원인**: 백엔드 API 응답 구조가 중첩 구조 `{current: {...}, comparison: {...}}`로 변경되었으나 프론트엔드는 flat 구조 기대
- **수정 내용**:
  - `DashboardPageNew.jsx`의 모든 stat 참조 변경:
    - `stats.total_files` → `stats.current.total_files`
    - `stats.processing` → `stats.current.processing`
    - `stats.completed` → `stats.current.completed`
    - `stats.failed` → `stats.current.failed`
    - `stats.total_duration` → `stats.current.total_duration`
  - 디버그 로그 추가 (API 응답 확인용)
- **영향받은 파일**:
  - `frontend/src/pages/DashboardPageNew.jsx` (라인 20-173)
- **결과**: 대시보드에서 정상적으로 통계 표시

#### 3. **화자 카운팅 버그 수정 (동일 이름 화자 중복 카운트)**
- **문제**:
  - 3명의 화자 중 2명이 같은 닉네임을 가진 경우, 결과 페이지에서 2명으로 표시
  - 예: SPEAKER_00(민서), SPEAKER_01(홍기), SPEAKER_02(민서) → 2명으로 집계
- **원인**: `calculateStats()` 함수에서 `speaker_name`을 키로 사용하여 동일 이름 화자가 병합됨
- **수정 내용**:
  - 키를 `speaker_name` → `speaker_label`로 변경
  - stats 객체에 `name`과 `label` 모두 저장:
    ```javascript
    speakerStats[speakerKey] = {
      name: segment.speaker_name,  // 표시용 이름
      label: segment.speaker_label,  // 구분용 라벨
      count: 0,
      totalDuration: 0
    }
    ```
  - UI 표시 시 이름과 라벨 모두 출력:
    ```jsx
    <h3>{stat.name}</h3>
    <p>{stat.label}</p>
    ```
- **영향받은 파일**:
  - `frontend/src/pages/ResultPageNew.jsx` (라인 39-62, 126-153)
- **결과**: 동일 이름을 가진 서로 다른 화자가 정확히 구분되어 표시

#### 4. **Processing 페이지 모델 정보 표시 조건 개선**
- **문제**: 홈에서 바로 Processing 페이지로 이동 시 기본값(Senko, Local Whisper)이 표시됨
- **원인**: `location.state`가 undefined여도 fallback 값을 사용하여 항상 표시
- **수정 내용**:
  - 모델 정보 섹션을 `{location.state && (...)}` 조건으로 감싸기
  - `location.state`가 있을 때만 화자 분리 모델 및 음성 인식 모델 정보 표시
- **영향받은 파일**:
  - `frontend/src/pages/ProcessingPage.jsx` (라인 137-154)
- **결과**: 업로드 페이지에서 직접 업로드한 경우에만 모델 정보 표시

#### 5. **RAG 페이지 fileId 타입 오류 수정**
- **문제**:
  - RAG 페이지에서 질문 시 422 Unprocessable Entity 에러
  - `GET http://localhost:8000/api/v1/rag/NaN/speakers 422`
  - fileId가 UUID 문자열인데 백엔드는 정수 ID 기대
- **원인**:
  - ResultPageNew에서 `fileId` (UUID)를 그대로 RAG 페이지로 전달
  - 백엔드 RAG API는 `audio_file_id` (정수)를 필요로 함
- **수정 내용**:
  1. **백엔드**: `/result` 엔드포인트 응답에 `audio_file_id` 추가
     ```python
     return {
       "file_id": file_id,  # UUID
       "audio_file_id": audio_file.id,  # 정수 ID
       ...
     }
     ```
  2. **프론트엔드 ResultPageNew**: RAG 버튼 클릭 시 `audio_file_id` 사용
     ```javascript
     onClick={() => navigate(`/rag/${data?.audio_file_id || fileId}`,
                            { state: { resultFileId: fileId } })}
     ```
  3. **프론트엔드 RagPage**:
     - "결과로 돌아가기" 버튼에서 `location.state.resultFileId` (UUID) 사용
     - `useLocation` hook 추가
     - 디버그 로그 추가 (fileId 타입 확인용)
- **영향받은 파일**:
  - `backend/app/api/v1/tagging.py` (라인 520-527)
  - `frontend/src/pages/ResultPageNew.jsx` (라인 22, 199)
  - `frontend/src/pages/RagPage.jsx` (라인 2, 10, 24-31, 174)
- **결과**: RAG 페이지에서 정상적으로 화자 목록 조회 및 질문 기능 작동

#### 6. **404 자동 리다이렉트 개선**
- **문제**: 태깅 완료 전 결과 페이지 접근 시 404 에러만 표시, 태깅 페이지로 이동 안 됨
- **수정 내용**:
  - ResultPageNew에서 404 에러 감지 시 자동으로 `/tagging/${fileId}` 리다이렉트
  - 콘솔 로그 추가 ("태깅이 완료되지 않았습니다...")
- **영향받은 파일**:
  - `frontend/src/pages/ResultPageNew.jsx` (라인 29-33)
- **결과**: 사용자가 태깅 페이지로 자동 이동하여 태깅 완료 가능

---

### 🔧 기술 부채 해결

#### 1. **컴포넌트 리렌더링 최적화**
- RagPage에 fileId 유효성 검증 로직 추가
- 잘못된 fileId(NaN, undefined 등) 조기 감지 및 에러 처리

#### 2. **타입 안정성 개선**
- URL 파라미터의 문자열 → 정수 변환 명시적으로 처리
- `parseInt()` 사용 전 검증 로직 추가

#### 3. **API 응답 구조 표준화**
- `/result` 엔드포인트에 `audio_file_id` 필드 추가
- UUID(파일 식별용)와 정수 ID(데이터베이스 조회용) 명확히 분리

---

### 📊 영향받은 파일 요약

#### Backend
```
backend/app/api/v1/tagging.py
```

#### Frontend
```
frontend/src/pages/DashboardPageNew.jsx
frontend/src/pages/ResultPageNew.jsx
frontend/src/pages/RagPage.jsx
frontend/src/pages/ProcessingPage.jsx
frontend/src/pages/SpeakerInfoConfirmPage.jsx
frontend/src/pages/TaggingAnalyzingPage.jsx
```

---

### 🎯 다음 단계

1. **RAG 기능 완성**
   - 질문-답변 기능 테스트
   - 화자 필터 기능 검증

2. **사용자 피드백 수집**
   - 테마 일관성 확인
   - 통계 정확도 검증

3. **성능 최적화**
   - 불필요한 리렌더링 제거
   - API 호출 최적화

---

## [2025-11-20] 닉네임 태깅 기능 통합 완료

(이전 내용 생략)

---

## [2025-11-18] NER 및 DB 저장 구현

(이전 내용 생략)

---

## [2025-11-16] CUDA/GPU 환경 구축

(이전 내용 생략)
