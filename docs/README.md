# 📚 프로젝트 문서

ListenCarePlease 프로젝트의 모든 기술 문서는 이 폴더에서 확인할 수 있습니다.

---

## 📖 문서 구조

### 🌟 **[완전 가이드 - COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** ⭐ 신규!
**대상**: 모든 사용자 (개발자, 기획자, PM, 운영자)

**내용**: 프로젝트의 모든 내용을 하나의 문서에 통합
- 1. 프로젝트 개요
- 2. 시스템 아키텍처
- 3. 기술 스택 (표 형식)
- 4. 전체 파이프라인 (사용자 플로우 + 데이터 플로우)
- 5. 데이터베이스 구조 (ERD + 스키마)
- 6. 백엔드 상세 (8개 API, 10개 서비스, LangGraph Agent)
- 7. 프론트엔드 상세 (13개 페이지, 컴포넌트, Context)
- 8. 주요 기능 (인증, 화자 태깅, 효율성, RAG)
- 9. API 문서 (요청/응답 예시)
- 10. 배포 및 운영
- 11. 트러블슈팅
- 부록: 핵심 알고리즘, 성능 지표, 비용 분석, 향후 개선

**언제 읽어야 하나요?**
- **프로젝트를 처음 접할 때 - 가장 먼저 읽어야 할 문서!** 📚
- 전체 구조를 빠르게 파악하고 싶을 때
- 특정 기능의 구현 방식을 찾을 때
- API 스펙을 확인할 때

---

### 1️⃣ **[환경 설정 가이드](./setup.md)**
**대상**: 개발자, 운영자

**내용**:
- Mac / GPU / CPU 환경별 설치 방법
- Docker 환경 설정 및 실행
- 데이터베이스 관리 (MySQL, Alembic)
- 프론트엔드/백엔드 개발 가이드
- 환경 변수 설정
- 유용한 Docker 명령어
- 트러블슈팅

**언제 읽어야 하나요?**
- 처음 프로젝트를 시작할 때
- 새로운 환경에서 설정할 때
- Docker 명령어를 잊어버렸을 때

---

### 2️⃣ **[시스템 아키텍처](./architecture.md)** (PDR)
**대상**: 기획자, 개발자, PM

**내용**:
- 프로젝트 목표 및 요구사항
- 전체 파이프라인 구조
- 핵심 모듈별 설계 (STT, Diarization, NER, Agent)
- 기술 스택 상세
- 프로젝트 디렉토리 구조
- 개발 로드맵 (Phase 1~3)
- UI/UX 설계 (Wireframe)
- 진행 상황 및 완료 내역

**언제 읽어야 하나요?**
- 프로젝트 전체 흐름을 이해하고 싶을 때
- 새로운 기능을 추가하기 전
- 프로젝트 소개 자료를 만들 때

---

### 3️⃣ **[파이프라인 I/O](./pipeline-io.md)**
**대상**: 백엔드 개발자

**내용**:
- 각 단계별 Input/Output 정의
  1. Audio Input
  2. Preprocessing (전처리)
  3. STT (Whisper)
  4. Diarization (화자 분리)
  5. Tagger & Merge (태깅 및 병합)
  6. Application Router (응용)
- 2가지 화자 태깅 방식:
  - 방식 1: 이름 기반 태깅 (멀티턴 LLM)
  - 방식 2: 역할 기반 클러스터링
- 멀티턴 LLM 추론 예시
- 유사/동명 처리 로직
- 사용자 검증 플로우

**언제 읽어야 하나요?**
- API를 개발할 때
- 각 단계의 데이터 형식을 확인하고 싶을 때
- STT, Diarization, NER 결과를 디버깅할 때

---

### 4️⃣ **[Agent 워크플로우](./agent-workflow.md)**
**대상**: AI/ML 개발자, 백엔드 개발자

**내용**:
- LangGraph 기반 에이전틱 파이프라인
- AgentState 정의
- Tools 정의 (4개)
  1. LoadProfilesTool
  2. VoiceSimilarityTool
  3. TextSimilarityTool
  4. SaveSpeakerProfileTool
- Graph 구조 (Mermaid 다이어그램)
- 노드별 상세 로직 (7개)
  1. load_profiles_node
  2. embedding_match_node
  3. name_extraction_node
  4. name_based_tagging_node
  5. role_based_tagging_node
  6. merge_results_node
  7. save_profiles_node
- 조건부 분기 로직
- FastAPI 통합 방법
- LangSmith 추적 설정
- **구현 계획 (Phase 1~6)**

**언제 읽어야 하나요?**
- LangGraph Agent를 구현할 때
- 화자 매핑 로직을 이해하고 싶을 때
- 멀티턴 LLM 추론을 디버깅할 때

---

### 5️⃣ **[데이터베이스 스키마](./database-schema.md)**
**대상**: 백엔드 개발자, DB 관리자

**내용**:
- ERD (Entity Relationship Diagram)
- 12개 테이블 상세 정의
  1. users (사용자)
  2. audio_files (오디오 파일)
  3. preprocessing_results (전처리 결과)
  4. stt_results (STT 결과)
  5. diarization_results (화자 분리 결과)
  6. detected_names (감지된 이름)
  7. user_confirmations (사용자 확정 정보)
  8. speaker_mappings (화자 태깅 결과)
  9. final_transcripts (최종 대본)
  10. summaries (요약 결과)
  11. **speaker_profiles** (화자 프로필 - 자동 인식) ⭐ 신규!
  12. **meeting_efficiency_analysis** (효율성 분석) ⭐ 신규!
- 데이터 흐름 예시 (전체 파이프라인)
- 주요 알고리즘과 DB 관계
- 테이블별 데이터 크기 예상
- 인덱스 전략
- 마이그레이션 가이드 (Alembic)

**언제 읽어야 하나요?**
- 데이터베이스 구조를 이해하고 싶을 때
- 새로운 테이블을 추가할 때
- 쿼리 최적화가 필요할 때
- 마이그레이션을 실행할 때

---

## 🔍 코드 구조 상세 분석

### 📁 Backend 구조

#### **1. API 엔드포인트** (`backend/app/api/v1/`)

##### `upload.py` - 파일 업로드
```python
POST /api/v1/upload
- 기능: 오디오 파일 업로드 (mp3, m4a, wav 등)
- 입력: multipart/form-data
- 출력: file_id, message
- 저장 위치: /app/uploads/{uuid}.{extension}
```

##### `processing.py` - AI 처리 파이프라인
```python
POST /api/v1/process/{file_id}
- 기능: STT + Diarization + NER + 닉네임 태깅 실행
- 파라미터:
  - whisper_mode: "local" | "api"
  - diarization_mode: "senko" | "nemo"
- 처리 단계:
  1. 전처리 (VAD, 노이즈 제거)
  2. Whisper STT (타임스탬프 포함)
  3. Senko/NeMo Diarization (임베딩 추출)
  4. NER (Korean PII Masking BERT)
  5. 닉네임 생성 (LLM 기반)
  6. DB 저장 (9개 테이블)
- BackgroundTasks로 비동기 처리

GET /api/v1/status/{file_id}
- 기능: 처리 상태 및 진행률 조회
- 출력:
  - status: "queued" | "preprocessing" | "stt" | "diarization" | "ner" | "completed" | "failed"
  - progress: 0~100
  - detected_names: ["민서", "인서", ...]
  - detected_nicknames: ["진행 담당자", "기술 전문가", ...]
  - speaker_count: 3

GET /api/v1/merged/{file_id}
- 기능: STT + Diarization + NER 병합 결과
- 출력: [{speaker, start, end, text, has_name, name}, ...]
- 우선순위: DB → 메모리
```

##### `tagging.py` - 화자 태깅 (LangGraph Agent)
```python
GET /api/v1/tagging/speaker-info/{file_id}
- 기능: 화자 정보 조회 (화자 수 + 감지된 이름 + 닉네임)
- DB 조회:
  - SpeakerMapping: speaker_count
  - DetectedName: detected_names (중복 제거)
  - SpeakerMapping.nickname: detected_nicknames
- 출력: {speaker_count, detected_names, detected_nicknames}

POST /api/v1/tagging/speaker-info/confirm
- 기능: 사용자가 수정한 화자 정보 저장
- 입력: {file_id, speaker_count, detected_names, detected_nicknames}
- DB 저장: UserConfirmation 테이블 (업데이트 또는 생성)

POST /api/v1/tagging/analyze/{file_id}
- 기능: LangGraph Agent 실행 (화자 이름 자동 매핑)
- 처리:
  1. DB에서 데이터 로드 (agent_data_loader)
  2. AgentState 구성
  3. LangGraph 실행 (5개 노드)
     - load_profiles → embedding_match → name_extraction → name_based_tagging → merge_results
  4. 결과 저장 (SpeakerMapping 업데이트)
- BackgroundTasks로 비동기 처리

GET /api/v1/tagging/{file_id}
- 기능: 화자 태깅 제안 조회
- 출력:
  - suggested_mappings: [{speaker_label, suggested_name, nickname, name_confidence, needs_manual_review}, ...]
  - transcript: [{speaker, start, end, text}, ...]
  - detected_names: ["민서", "인서"]

POST /api/v1/tagging/confirm
- 기능: 사용자가 확정한 태깅 저장
- 입력: {file_id, mappings: [{speaker_label, final_name}, ...]}
- DB 업데이트:
  - SpeakerMapping.final_name
  - SpeakerMapping.is_modified
  - AudioFile.status → CONFIRMED
```

##### `auth.py` & `oauth.py` - 인증
```python
POST /api/v1/auth/register
- 기능: 이메일/비밀번호 회원가입

POST /api/v1/auth/login
- 기능: 이메일/비밀번호 로그인
- 출력: {access_token, refresh_token, token_type: "bearer"}

GET /api/v1/oauth/google
- 기능: Google OAuth 시작

GET /api/v1/oauth/google/callback
- 기능: Google OAuth 콜백 처리

GET /api/v1/oauth/kakao
GET /api/v1/oauth/kakao/callback
- 기능: Kakao OAuth
```

---

#### **2. 서비스 레이어** (`backend/app/services/`)

##### `preprocessing.py` - 오디오 전처리
```python
def preprocess_audio(input_path, output_path):
    - VAD (Voice Activity Detection)
    - 노이즈 제거
    - 샘플레이트 정규화 (16kHz)
    - 반환: (output_path, original_duration, processed_duration)
```

##### `stt.py` - Whisper STT
```python
def run_stt_pipeline(audio_path, output_dir, openai_api_key, use_local_whisper, model_size, device):
    - 로컬 Whisper: whisper.load_model("large-v3")
    - API Whisper: OpenAI API (30분 타임아웃)
    - 병렬 처리: 4개 청크 동시 전사
    - 출력: 타임스탬프 포함 텍스트 파일
```

##### `diarization.py` - 화자 분리 (Senko)
```python
def run_diarization(audio_path, device, mode="senko"):
    - Senko: pyannote.audio 기반 GPU 가속
    - 임베딩 추출: 192차원 벡터
    - 출력:
      {
        "turns": [{"speaker_label": "SPEAKER_00", "start": 0.4, "end": 3.5}, ...],
        "embeddings": {"SPEAKER_00": [0.12, -0.45, ...], ...}
      }
```

##### `ner_service.py` - 이름 추출
```python
class NERService:
    - 모델: seungkukim/korean-pii-masking (BERT)
    - extract_person_names(): PERSON 엔티티 추출 (score >= 0.8)
    - cluster_names(): Levenshtein 거리 기반 군집화
      예: "민서", "인서", "김민서" → "김민서" 대표명
    - process_segments(): 전체 세그먼트 처리
      출력:
      {
        "final_namelist": ["김민서", "박철수"],
        "name_clusters": {"김민서": ["민서", "인서"]},
        "segments_with_names": [{"text": "...", "has_name": true, "name": ["민서"]}, ...]
      }
```

##### `nickname_service.py` - 닉네임 생성
```python
class NicknameService:
    - LLM: OpenAI GPT-4
    - Smart Selection: 대표 발화 선택
      - 긴 발화 (20자 이상)
      - 키워드 발화 ("제 생각", "저는")
      - 시점별 발화 (시작, 중간, 끝)
    - generate_nickname(): 화자별 닉네임 생성
      출력:
      {
        "nickname": "진행 담당자",
        "nickname_metadata": {
          "display_label": "진행 담당자",
          "one_liner": "회의 진행을 주도하는 역할",
          "keywords": ["시작", "안건", "마무리"]
        }
      }
```

##### `agent_data_loader.py` - Agent 입력 데이터 로더
```python
def load_agent_input_data_by_file_id(file_id, db):
    - DB 조회:
      1. AudioFile (file_id로 검색)
      2. STTResult (시간순 정렬)
      3. DiarizationResult (임베딩 포함)
      4. DetectedName (context_before/after 포함)
    - 출력:
      {
        "audio_file_id": 123,
        "stt_result": [{text, start, end, speaker}, ...],
        "diar_result": {embeddings: {...}, turns: [...]},
        "name_mentions": [{name, context_before, context_after, time}, ...]
      }
```

---

#### **3. Agent 노드** (`backend/app/agents/nodes/`)

##### `load_profiles.py`
```python
async def load_profiles_node(state: AgentState):
    - 현재: 빈 리스트 반환 (프로필 테이블 미구현)
    - 향후: user_speaker_profiles에서 기존 화자 로드
```

##### `embedding_match.py`
```python
async def embedding_match_node(state: AgentState):
    - VoiceSimilarityTool: 음성 임베딩 코사인 유사도 (임계값 0.85)
    - TextSimilarityTool: 텍스트 임베딩 유사도 (임계값 0.85)
    - 두 Tool 모두 통과 → auto_matched
```

##### `name_extraction.py`
```python
async def name_extraction_node(state: AgentState):
    - DetectedName 데이터 활용 (NER 결과)
    - context_before/after는 DB에 이미 저장됨
    - name_mentions 구성:
      [{"name": "민서", "context": [...], "time": 10.5}, ...]
    - speaker_utterances 구성 (화자별 발화 그룹화)
```

##### `name_based_tagging.py` (핵심!)
```python
async def name_based_tagging_node(state: AgentState):
    - LLM: gpt-5-mini-2025-08-07 (temperature=1.0)
    - 멀티턴 추론:
      1. Turn 1: 첫 번째 이름 언급 분석
         - 프롬프트: context_before/after + participant_names
         - 출력: {speaker: "SPEAKER_00", name: "민서", confidence: 0.85, reasoning: "..."}
      2. Turn 2: 같은 이름 재언급 시
         - 이전 분석 결과 요약 포함
         - 일관성 확인 (consistency: true/false)
      3. Turn N: 모순 발견 시
         - conflict_detected: true
         - needs_manual_review: true
    - PydanticOutputParser로 구조화된 응답 파싱
    - mapping_history에 모든 추론 결과 누적
```

##### `merge_results.py`
```python
async def merge_results_node(state: AgentState):
    - 자동 매칭된 화자는 그대로 사용
    - name_based_results 집계:
      - 화자별로 가장 많이 언급된 이름 선택
      - 평균 confidence 계산
    - 중복 제거:
      - 같은 이름이 여러 화자에 매핑 → 가장 높은 confidence 선택
    - 소거법 적용:
      - 남은 화자 = 남은 이름이 1:1일 때 자동 매핑
      - 최소 발화 횟수: 3회 이상
      - 신뢰도: 0.50 (낮음)
    - 스코어 기반 매핑:
      - count * 0.5 + avg_confidence * 0.5
      - 높은 스코어 순으로 매핑 (중복 방지)
    - final_mappings 생성:
      [{speaker_label, name, confidence, match_method, needs_review}, ...]
```

---

#### **4. DB 모델** (`backend/app/models/`)

##### `audio_file.py`
```python
class AudioFile:
    - status: UPLOADING | PREPROCESSING | PROCESSING | COMPLETED | FAILED | CONFIRMED
    - file_path, original_filename, file_size, duration
    - created_at, updated_at
```

##### `stt.py`
```python
class STTResult:
    - text: TEXT (긴 세그먼트 지원)
    - start_time, end_time
    - confidence (Whisper는 미제공)
```

##### `diarization.py`
```python
class DiarizationResult:
    - speaker_label: "SPEAKER_00"
    - start_time, end_time
    - embedding: JSON (192차원 벡터)
```

##### `tagging.py`
```python
class DetectedName:
    - detected_name: "민서"
    - speaker_label: "SPEAKER_00"
    - time_detected: 10.5
    - context_before: JSON (앞 5문장)
    - context_after: JSON (뒤 5문장)
    - llm_reasoning: 멀티턴 LLM 추론 결과 (향후)
    - is_consistent: 이전 추론과 일치 여부 (향후)

class SpeakerMapping:
    - speaker_label: "SPEAKER_00"
    - suggested_name: "민서" (LLM 추론)
    - nickname: "진행 담당자" (LLM 생성)
    - nickname_metadata: JSON
    - name_confidence: 0.85
    - name_mentions: 3
    - conflict_detected: false
    - needs_manual_review: true/false
    - final_name: "김민서" (사용자 확정)
    - is_modified: true/false
```

##### `user_confirmation.py`
```python
class UserConfirmation:
    - confirmed_speaker_count: 3
    - confirmed_names: ["민서", "인서", "김팀장"]
    - confirmed_nicknames: ["진행 담당자", "기술 전문가"]
```

---

### 📁 Frontend 구조

#### **1. 페이지 컴포넌트** (`frontend/src/pages/`)

##### `UploadPage.jsx` - 파일 업로드
```jsx
기능:
- 드래그앤드롭 / 파일 선택
- 파일 검증 (포맷, 크기)
- 업로드 진행률 표시
- API: POST /api/v1/upload

상태:
- file: 선택된 파일
- uploading: 업로드 중 여부
- uploadProgress: 0~100
```

##### `ProcessingPage.jsx` - AI 처리 중
```jsx
기능:
- 처리 상태 폴링 (1초마다)
- 진행률 바 표시
- 단계별 상태 표시:
  - queued → preprocessing → stt → diarization → ner → completed
- 완료 시 /confirm/{fileId}로 이동

상태:
- status: 처리 상태
- progress: 0~100
- step: 현재 단계 설명
```

##### `SpeakerInfoConfirmPage.jsx` - 화자 정보 확인
```jsx
기능:
- 화자 수 표시/수정
- 감지된 이름 목록 표시/수정
  - 추가 (+), 삭제 (-), 수정
  - 체크박스로 선택/해제
- 감지된 닉네임 목록 표시/수정
  - 추가 (+), 삭제 (-), 수정
  - 체크박스로 선택/해제
- API:
  - GET /api/v1/tagging/speaker-info/{fileId}
  - POST /api/v1/tagging/speaker-info/confirm

상태:
- speakerCount: 화자 수
- detectedNames: ["민서", "인서"]
- selectedNames: 선택된 이름 배열
- detectedNicknames: ["진행 담당자", "기술 전문가"]
- selectedNicknames: 선택된 닉네임 배열
- isEditing: 편집 모드 여부
```

##### `TaggingAnalyzingPage.jsx` - AI 분석 중
```jsx
기능:
- LangGraph Agent 실행 시작
- 3초 로딩 애니메이션
- 자동으로 /tagging/{fileId}로 이동
- API: POST /api/v1/tagging/analyze/{fileId}

상태:
- analyzing: 분석 중 여부
```

##### `TaggingPageNew.jsx` - 화자 태깅
```jsx
기능:
- 시스템 제안 표시:
  - 화자별 suggested_name, nickname, confidence
  - needs_manual_review 플래그 표시
- 사용자 수정:
  - 드롭다운으로 이름 선택 (detected_names에서)
  - 직접 입력 가능
- 태그 완료 버튼
- API:
  - GET /api/v1/tagging/{fileId}
  - POST /api/v1/tagging/confirm

상태:
- suggestedMappings: [{speaker_label, suggested_name, nickname, confidence, needs_manual_review}, ...]
- editedMappings: {SPEAKER_00: "김민서", ...}
```

##### `ResultPageNew.jsx` - 결과
```jsx
기능:
- 화자별 통계:
  - 발화 횟수, 발화 시간
  - 차트 표시 (옵션)
- 전체 회의록:
  - [00:10] [김민서]: 오늘 회의 안건은...
  - [00:12] [박철수]: 네, 제가 먼저...
- 다운로드 버튼 (JSON, TXT)
- 다음 단계 선택:
  - 요약 생성
  - RAG 대화
  - 자막 생성
- API:
  - GET /api/v1/merged/{fileId}
  - GET /api/v1/export/{fileId}

상태:
- transcript: [{speaker_name, start, end, text}, ...]
- statistics: {SPEAKER_00: {name, count, duration}, ...}
```

---

#### **2. 서비스 레이어** (`frontend/src/services/`)

##### `api.js` - API 호출
```javascript
주요 함수:
- uploadAudioFile(file, onUploadProgress)
- startProcessing(fileId, whisperMode, diarizationMode)
- getProcessingStatus(fileId)
- confirmSpeakerInfo(fileId, speakerCount, detectedNames, detectedNicknames)
- analyzeTagging(fileId)
- getTaggingSuggestion(fileId)
- confirmTagging(fileId, mappings)
- getMergedResult(fileId)

설정:
- baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
- headers: {'Content-Type': 'application/json'}
```

---

#### **3. Context & 상태 관리** (`frontend/src/contexts/`)

##### `AuthContext.jsx`
```javascript
제공:
- user: 현재 로그인 사용자
- login(email, password)
- logout()
- register(email, password, name)
- isAuthenticated: 로그인 여부

저장:
- localStorage: access_token, refresh_token
```

##### `ThemeContext.jsx`
```javascript
제공:
- theme: "light" | "dark"
- toggleTheme()

저장:
- localStorage: theme
```

---

#### **4. 라우팅** (`frontend/src/App.jsx`)

```jsx
공개 라우트:
- /login - 로그인
- /register - 회원가입
- /oauth/callback - OAuth 콜백

보호된 라우트 (인증 필요):
- / - 파일 업로드
- /processing/:fileId - AI 처리 중
- /confirm/:fileId - 화자 정보 확인
- /analyzing/:fileId - AI 분석 중
- /tagging/:fileId - 화자 태깅
- /result/:fileId - 결과

페이지 플로우:
1. / (업로드)
   ↓
2. /processing/:fileId (STT, Diarization, NER)
   ↓
3. /confirm/:fileId (화자 수, 이름 확인)
   ↓
4. /analyzing/:fileId (LangGraph Agent 실행)
   ↓
5. /tagging/:fileId (시스템 제안 확인/수정)
   ↓
6. /result/:fileId (최종 회의록)
```

---

## 🔑 핵심 알고리즘 상세

### 1. NER + 군집화 (Levenshtein Distance)
```python
입력: ["민서", "인서", "김민서", "박철수", "철수"]

단계:
1. NER 추출: PS_NAME 엔티티 (score >= 0.8)
2. 레벤슈타인 거리 계산:
   - "민서" vs "인서": 거리 1
   - "민서" vs "김민서": 거리 2
   - "박철수" vs "철수": 거리 2
3. 계층적 군집화 (threshold=1.5):
   - Cluster 1: ["민서", "인서"]
   - Cluster 2: ["김민서"]
   - Cluster 3: ["박철수", "철수"]
4. 대표명 선정 (최대 score 또는 가장 긴 이름):
   - Cluster 1 → "민서" (score 우선)
   - Cluster 2 → "김민서"
   - Cluster 3 → "박철수"

출력: ["민서", "김민서", "박철수"]
```

### 2. 멀티턴 LLM 추론
```python
Turn 1: 첫 번째 "민서" 언급
  입력:
    - context_before: 앞 5문장
    - context_after: 뒤 5문장
    - participant_names: ["민서", "인서", "김팀장"]
  프롬프트:
    "다음 대화에서 '민서'는 SPEAKER_00과 SPEAKER_01 중 누구일까요?
     - SPEAKER_01: 민서씨, 이번 회의 안건 발표해주세요
     - SPEAKER_00: 네, 알겠습니다
     ..."
  LLM 응답:
    {speaker: "SPEAKER_00", confidence: 0.85, reasoning: "SPEAKER_01이 호칭 후 SPEAKER_00이 응답"}

Turn 2: 두 번째 "민서" 언급
  입력:
    - 이전 분석 요약: "Turn 1: 민서=SPEAKER_00 (confidence: 0.85)"
    - 새 context
  프롬프트:
    "[Turn 1] 민서는 SPEAKER_00일 확률 85%였습니다.

     [Turn 2 새 문맥]
     - SPEAKER_01: 민서씨 의견에 동의합니다
     - SPEAKER_00: 네, 감사합니다

     이 문맥에서도 민서가 SPEAKER_00이 맞나요?"
  LLM 응답:
    {speaker: "SPEAKER_00", confidence: 0.95, consistency: true}

Turn 3: 모순 발견
  입력:
    - 이전 분석 요약: "Turn 1~2: 민서=SPEAKER_00 (confidence: 0.90)"
    - 새 context
  프롬프트:
    "[이전 분석] 민서는 SPEAKER_00일 확률 90%였습니다.

     [Turn 3 새 문맥]
     - SPEAKER_00: 민서씨는 어떻게 생각하세요?
     - SPEAKER_01: 저는 이렇게 생각합니다

     이 문맥은 이전 분석과 모순되나요?"
  LLM 응답:
    {speaker: "SPEAKER_01", confidence: 0.80, consistency: false, conflict_detected: true}

최종 스코어 조정:
  - SPEAKER_00: 0.90 * 0.7 = 0.63 (하향)
  - SPEAKER_01: 0.10 + 0.80 * 0.3 = 0.34 (상향)
  - needs_manual_review: true
```

### 3. 소거법
```python
상황:
- 전체 화자: [SPEAKER_00, SPEAKER_01, SPEAKER_02]
- 매핑된 화자: {SPEAKER_00: "민서"}
- 남은 화자: [SPEAKER_01, SPEAKER_02]
- 사용자 선택 이름: ["민서", "인서", "김팀장"]
- 남은 이름: ["인서", "김팀장"]

조건:
- len(남은 화자) == len(남은 이름) = 2
- 각 화자의 발화 횟수 >= 3회

실행:
1. 발화 횟수 확인:
   - SPEAKER_01: 15회 발화
   - SPEAKER_02: 8회 발화
2. 발화 많은 순으로 매핑:
   - SPEAKER_01 → "인서" (confidence: 0.50, method: "소거법")
   - SPEAKER_02 → "김팀장" (confidence: 0.50, method: "소거법")
3. needs_manual_review: true (낮은 신뢰도)
```

### 4. 스코어 기반 매핑
```python
상황:
- 매핑되지 않은 화자: [SPEAKER_01, SPEAKER_02, SPEAKER_03]
- name_based_results:
  {
    "인서": [
      {speaker: "SPEAKER_01", confidence: 0.75},
      {speaker: "SPEAKER_01", confidence: 0.80}
    ],
    "김팀장": [
      {speaker: "SPEAKER_02", confidence: 0.65},
      {speaker: "SPEAKER_03", confidence: 0.90}
    ]
  }

계산:
1. 화자별 집계:
   - SPEAKER_01 + "인서": count=2, avg_confidence=0.775
   - SPEAKER_02 + "김팀장": count=1, avg_confidence=0.65
   - SPEAKER_03 + "김팀장": count=1, avg_confidence=0.90

2. 스코어 계산 (count * 0.5 + avg_confidence * 0.5):
   - SPEAKER_01 + "인서": 2*0.5 + 0.775*0.5 = 1.3875
   - SPEAKER_03 + "김팀장": 1*0.5 + 0.90*0.5 = 0.95
   - SPEAKER_02 + "김팀장": 1*0.5 + 0.65*0.5 = 0.825

3. 스코어 높은 순 정렬:
   [
     {speaker: SPEAKER_01, name: "인서", score: 1.3875},
     {speaker: SPEAKER_03, name: "김팀장", score: 0.95},
     {speaker: SPEAKER_02, name: "김팀장", score: 0.825}
   ]

4. 중복 제거하며 매핑:
   - SPEAKER_01 → "인서" (score: 1.3875)
   - SPEAKER_03 → "김팀장" (score: 0.95) ✓ 선택
   - SPEAKER_02 → "김팀장" (중복, 스킵)

5. 남은 화자 처리:
   - SPEAKER_02: 소거법 또는 Unknown
```

---

## 🗂️ 기타 문서

### [database_schema.md](../database_schema.md)
**대상**: 백엔드 개발자, DB 관리자

**내용**:
- 전체 ERD (9개 테이블)
- 각 테이블별 상세 스키마
  - users, audio_files, preprocessing_results
  - stt_results, diarization_results
  - detected_names, speaker_mappings
  - user_confirmation, final_transcripts
- 관계 및 제약조건
- 인덱스 및 최적화

**언제 읽어야 하나요?**
- DB 마이그레이션을 생성할 때
- 새로운 테이블을 추가할 때
- 쿼리 성능을 최적화할 때

---

### [COMMANDS.md](../COMMANDS.md)
**대상**: 개발자, 운영자

**내용**:
- Docker 명령어 모음
- MySQL 접속 및 쿼리
- Alembic 마이그레이션 명령어
- 파일 관리 명령어
- 트러블슈팅 팁

**언제 읽어야 하나요?**
- 자주 사용하는 명령어를 빠르게 찾을 때
- setup.md보다 빠른 레퍼런스가 필요할 때

---

### [MOCK_TO_REAL.md](../MOCK_TO_REAL.md)
**대상**: 백엔드 개발자

**내용**:
- Phase 2 (AI 모듈 통합) 가이드
- Mock API → Real AI 전환 방법
- 각 모듈별 통합 체크리스트

**언제 읽어야 하나요?**
- Phase 1 완료 후 Phase 2로 넘어갈 때
- AI 모델을 실제로 연동할 때

---

### [2025-11-04.md](../2025-11-04.md)
**대상**: 연구자, 기획자

**내용**:
- 초기 조사 자료
- STT, Diarization 모델 후보군
- 성능 벤치마크 비교

**언제 읽어야 하나요?**
- 프로젝트 배경을 이해하고 싶을 때
- 다른 모델로 변경을 검토할 때

---

## 📌 문서 읽기 순서 추천

### 신규 개발자
```
1. README.md (프로젝트 루트)
   ↓
2. docs/setup.md (환경 설정)
   ↓
3. docs/architecture.md (전체 흐름 이해)
   ↓
4. docs/pipeline-io.md (데이터 형식 이해)
   ↓
5. database_schema.md (DB 구조 이해)
   ↓
6. 실제 코드 탐색:
   - backend/app/api/v1/processing.py (파이프라인)
   - backend/app/services/ner_service.py (NER)
   - frontend/src/App.jsx (라우팅)
   - frontend/src/pages/SpeakerInfoConfirmPage.jsx (화자 확인)
```

### AI 개발자
```
1. README.md
   ↓
2. docs/architecture.md (AI 모듈 부분)
   ↓
3. docs/pipeline-io.md (I/O 이해)
   ↓
4. docs/agent-workflow.md (Agent 구현)
   ↓
5. 실제 Agent 코드 탐색:
   - backend/app/agents/graph.py
   - backend/app/agents/nodes/name_based_tagging.py
   - backend/app/agents/nodes/merge_results.py
   - backend/app/services/ner_service.py
   - backend/app/services/nickname_service.py
```

### 프론트엔드 개발자
```
1. README.md
   ↓
2. docs/setup.md (Frontend 부분)
   ↓
3. docs/architecture.md (UI/UX 설계 부분)
   ↓
4. docs/pipeline-io.md (API 응답 형식 확인)
   ↓
5. 실제 컴포넌트 탐색:
   - frontend/src/App.jsx (라우팅)
   - frontend/src/services/api.js (API 호출)
   - frontend/src/pages/UploadPage.jsx
   - frontend/src/pages/SpeakerInfoConfirmPage.jsx
   - frontend/src/pages/TaggingPageNew.jsx
   - frontend/src/pages/ResultPageNew.jsx
```

---

## 🔄 문서 업데이트 규칙

### 언제 업데이트하나요?
- 새로운 기능 추가 시
- API 스펙 변경 시
- DB 스키마 변경 시
- 환경 설정 방법 변경 시
- 알고리즘 로직 수정 시

### 어떻게 업데이트하나요?
1. 해당 문서 찾기
2. 변경 내용 작성
3. 날짜 기록 (문서 하단)
4. PR에 문서 변경사항 명시

---

## 📞 문의

문서 관련 질문이나 개선 제안은 GitHub Issues로 남겨주세요!

- **Issues**: [GitHub Issues](https://github.com/yourusername/ListenCarePlease/issues)

---

## 🔄 최신 업데이트

**[2025-12-01]** 문서 업데이트 - 실제 구현 코드 및 DB 스키마 추가
- ✅ **AI-Pipeline-Code.md 생성** - 전체 4개 Phase의 실제 구현 코드 정리
- ✅ **COMPLETE_GUIDE.md 업데이트** - 12. 핵심 구현 코드 예제 섹션 추가
  - Phase 1: VAD, STT 병렬 처리, Diarization (Senko) GPU 가속
  - Phase 2: NER (BERT + Levenshtein), 닉네임 생성 (Smart Selection 70% 비용 절감)
  - Phase 3: LangGraph Agent (5개 노드, Tool, 멀티턴 LLM, 소거법)
  - Phase 4: 효율성 분석 (TTR, PPL), RAG (ChromaDB, 화자 자동 추출)
- ✅ **database-schema.md 업데이트** - 신규 테이블 2개 추가
  - 11. speaker_profiles: 화자 자동 인식 (음성/텍스트 임베딩 기반)
  - 12. meeting_efficiency_analysis: 5가지 지표 기반 효율성 분석 (Entropy, TTR, Info Content, Sentence Prob, PPL)
- 📄 참고: [AI-Pipeline-Code.md](../AI-Pipeline-Code.md) | [database-schema.md](./database-schema.md)

**[2025-11-27]** 회의 효율성 분석 기능 구현 완료
- ✅ 전체 회의 지표 4종 추가 (TTR, 정보량, 문장 확률, PPL)
- ✅ AI 인사이트 생성 (GPT-4o-mini 기반 한줄 평)
- ✅ 자동 효율성 분석 트리거 (화자 태깅 완료 후)
- ✅ 결과 캐싱 구현 (force 파라미터)
- ✅ 에러 처리 개선 (NaN/Infinity 필터링, dict 타입 처리)
- ✅ UI/UX 개선 (중복 섹션 제거, 폴링 제한)
- 📄 상세 내용: [EFFICIENCY_ANALYSIS.md](./EFFICIENCY_ANALYSIS.md), [CHANGELOG.md](./CHANGELOG.md)

**[2025-11-24]** UI/UX 개선 및 버그 수정
- ✅ 다크모드 테마 통합 완료 (모든 페이지 색상 스킴 통일)
- ✅ 대시보드 통계 표시 버그 수정 (API 응답 구조 변경 반영)
- ✅ 화자 카운팅 버그 수정 (speaker_label 기반으로 변경)
- ✅ RAG 페이지 fileId 타입 오류 수정 (UUID → 정수 ID 변환)
- ✅ Processing 페이지 모델 정보 조건부 표시
- 📄 상세 내용: [CHANGELOG.md](./CHANGELOG.md)

---

**Last Updated**: 2025-11-27
