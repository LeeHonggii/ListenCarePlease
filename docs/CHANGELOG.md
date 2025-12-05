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

## [2025-11-27] 회의 효율성 분석 기능 구현 완료

### ✅ 완료된 작업

#### 1. **전체 회의 지표 계산 및 AI 인사이트 추가**
- **전체 회의 지표 4종 구현**:
  - TTR (Type-Token Ratio): 전체 회의의 어휘 다양성
  - 정보량 (Information Content): 코사인 유사도 기반 의미적 거리
  - 문장 확률 (Sentence Probability): HDBSCAN 군집화 기반 이례적 발언 감지
  - PPL (Perplexity): KoGPT-2 기반 대화 복잡도
- **AI 인사이트 생성**: GPT-4o-mini를 활용한 지표별 한줄 평
  - 개별 화자 5개 지표 × N명
  - 전체 회의 5개 지표 (엔트로피 + 위 4종)
- **DB 스키마 확장**: `meeting_efficiency_analysis` 테이블에 4개 JSON 컬럼 추가
  - `overall_ttr`
  - `overall_information_content`
  - `overall_sentence_probability`
  - `overall_perplexity`

#### 2. **자동 효율성 분석 트리거 구현**
- **화자 태깅 완료 후 자동 실행**: `POST /api/v1/tagging/confirm` 엔드포인트에서 BackgroundTasks로 자동 실행
- **중복 트리거 제거**: 프론트엔드에서 수동 호출 제거, 백엔드에서만 관리
- **워크플로우**:
  ```
  화자 태깅 확정
    ↓
  BackgroundTasks로 효율성 분석 시작
    ↓
  5가지 지표 계산 (화자별 + 전체 회의)
    ↓
  AI 인사이트 생성
    ↓
  DB 저장
  ```

#### 3. **결과 캐싱 구현**
- **캐싱 로직**: `force` 파라미터를 통한 선택적 재분석
  - `force=false` (기본값): 기존 결과가 있으면 캐싱된 결과 반환
  - `force=true`: 기존 결과 무시하고 재분석
- **성능 개선**: 불필요한 재분석 방지로 응답 속도 향상
- **API 응답**:
  ```json
  {
    "message": "Efficiency analysis already completed",
    "status": "completed",
    "analyzed_at": "2025-11-27T10:30:00Z"
  }
  ```

#### 4. **에러 처리 개선**
- **NaN/Infinity 필터링**:
  - PPL 계산 중 발생하는 NaN/Infinity 값 제거
  - 통계 계산 후에도 검증하여 0.0으로 대체
  ```python
  if not np.isnan(ppl) and not np.isinf(ppl):
      ppl_values.append({"window_index": i, "ppl": float(ppl)})

  if np.isnan(ppl_avg) or np.isinf(ppl_avg):
      ppl_avg = 0.0
  ```
- **dict 타입 처리**:
  - `generate_insight()` 함수에서 dict 값 건너뛰기
  - 숫자 값만 추출하여 추세 계산
  ```python
  numeric_values = []
  for v in values:
      if isinstance(v, (int, float)):
          numeric_values.append(v)
  ```

#### 5. **UI/UX 개선**
- **중복 섹션 제거**: "전체 회의 종합 분석" 섹션 삭제
  - "화자별 효율성 지표" 섹션의 "전체 회의" 탭으로 통합
- **폴링 제한**: 무한 로딩 방지
  - 최대 60회 (3초 × 60 = 3분)
  - 타임아웃 시 명확한 에러 메시지
- **AI 인사이트 표시**: 모든 지표에 GPT-4o-mini 생성 코멘트 표시

### 🔧 기술 개선

#### 1. **Backend 서비스 확장**
- **efficiency_analyzer.py**: 4개 메서드 추가
  - `_calc_overall_ttr()` (lines 617-661)
  - `_calc_overall_information_content()` (lines 663-709)
  - `_calc_overall_sentence_probability()` (lines 711-745)
  - `_calc_overall_perplexity()` (lines 747-785)

#### 2. **API 엔드포인트 개선**
- **efficiency.py**:
  - `generate_insight()`: dict 타입 처리 추가 (lines 36-56)
  - `trigger_efficiency_analysis()`: 캐싱 로직 추가 (lines 124-175)
  - `get_efficiency_result()`: 전체 회의 지표 + 인사이트 포함 (lines 256-300, 360-399)

#### 3. **프론트엔드 개선**
- **EfficiencyPage.jsx**:
  - `calculateOverallMetrics()`: 백엔드 overall 지표 사용 (lines 54-91)
  - 폴링 제한 추가 (lines 42-43, 115-133)
  - 중복 섹션 제거 (lines 357-361)
- **TaggingPageNew.jsx**:
  - 중복 트리거 제거 (lines 75-77)

### 📊 영향받은 파일

#### Backend
```
backend/app/services/efficiency_analyzer.py
backend/app/models/efficiency.py
backend/app/api/v1/efficiency.py
backend/app/api/v1/tagging.py
```

#### Frontend
```
frontend/src/pages/EfficiencyPage.jsx
frontend/src/pages/TaggingPageNew.jsx
```

#### Documentation
```
docs/EFFICIENCY_ANALYSIS.md (신규 생성)
```

### 🎯 주요 성과

1. **완전한 효율성 분석 시스템**: 5가지 지표 (엔트로피, TTR, 정보량, 문장 확률, PPL) 완전 구현
2. **AI 코멘터리**: 모든 지표에 대한 GPT-4o-mini 기반 인사이트 제공
3. **자동화**: 화자 태깅 완료 후 자동 분석 실행
4. **성능 최적화**: 결과 캐싱으로 불필요한 재계산 방지
5. **안정성**: NaN/Infinity 처리, dict 타입 처리 등 예외 상황 대응
6. **문서화**: 상세 기능 문서 작성 (EFFICIENCY_ANALYSIS.md)

### 📝 기술 스택
- **AI 모델**:
  - GPT-4o-mini: 인사이트 생성
  - KoGPT-2 (skt/kogpt2-base-v2): Perplexity 계산
  - Sentence Transformers (paraphrase-multilingual-MiniLM-L12-v2): 정보량 계산
  - Mecab: 형태소 분석 (TTR, 엔트로피)
- **군집화**: HDBSCAN (문장 확률)
- **수치 처리**: NumPy, PyTorch

---

## [2025-11-24] Docker 구성 GPU 전용 통합

### ✅ 완료된 작업

#### 1. **Docker 구성 단순화 (GPU 전용)**
- **문제**: CPU/Mac/CUDA 플랫폼 조건부 로직으로 인한 복잡성
- **변경 내용**:
  - `backend/Dockerfile`에서 ARG PLATFORM 제거
  - 모든 조건부 if 문 제거
  - **requirements 파일 통합**: `requirements-base.txt` + `requirements-gpu.txt` → `requirements.txt` (단일 파일)
  - GPU 전용 의존성 항상 설치:
    - PyTorch 2.1.0+cu118 (CUDA 11.8)
    - Senko with NVIDIA support
    - NeMo Toolkit with ASR (GPU 전용)
    - CUDA 라이브러리 심볼릭 링크 항상 생성
  - `docker-compose.yml`에서 PLATFORM 빌드 인자 제거
  - `.env`에서 DOCKER_PLATFORM 변수 제거
- **결과**:
  - 빌드 프로세스 단순화
  - GPU 환경에 최적화된 단일 구성
  - 유지보수 용이성 향상
  - 의존성 관리 단순화 (하나의 requirements.txt 파일)

#### 2. **최신 의존성 포함**
- **LangChain 스택**:
  - langchain==1.0.8
  - langchain-openai==1.0.3
  - langchain-community==0.4.1
  - langgraph==1.0.3
  - langsmith==0.4.46
- **RAG 시스템**:
  - chromadb==1.3.5
  - langchain-chroma==1.0.0
- **AI/ML 도구**:
  - transformers==4.36.0
  - openai==2.8.1
  - pyannote.audio==3.1.1

### 📊 영향받은 파일

#### Docker Configuration
```
backend/Dockerfile (ARG 및 조건부 로직 제거)
backend/requirements.txt (통합 파일 생성)
docker-compose.yml (PLATFORM 빌드 인자 제거)
.env (DOCKER_PLATFORM 변수 제거)
```

### 🎯 주요 성과

1. **단순화**: 조건부 로직 완전 제거로 빌드 프로세스 단순화
2. **최적화**: GPU 환경에 특화된 구성
3. **최신 상태**: LangChain, ChromaDB 등 최신 의존성 포함
4. **유지보수성**: 단일 구성으로 관리 용이

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
