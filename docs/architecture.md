# [PDR] 발화자 자동 태깅 및 음성 요약 서비스

## 1. 프로젝트 개요

### 1.1. 프로젝트명

발화자 자동 태깅 및 음성 요약 서비스

### 1.2. 프로젝트 목표

사용자가 업로드한 음성 파일(회의록 등)을 입력받아, 다음의 핵심 기능을 제공한다:

1. **STT (Speech-to-Text):** 음성을 텍스트로 변환
2. **화자 분리 (Speaker Diarization):** 텍스트를 화자별(Speaker A, B)로 분리
3. **화자 태깅 (Speaker Tagging):** 분리된 화자에게 실제 이름(김팀장, 이대리)을 매칭
4. **응용 기능:** 태깅된 최종 대본을 기반으로 **핵심 요약**, **Q&A(RAG)**, **자막 생성** 기능 제공

---

## 2. 요구사항

### 2.1. 기능적 요구사항

- 사용자는 다양한 오디오 포맷(mp3, m4a 등)을 업로드할 수 있다.
- 시스템은 입력된 모든 오디오를 **WAV 포맷으로 변환**하여 처리해야 한다.
- 시스템은 STT, 화자 분리, 화자 태깅을 순차적으로 수행해야 한다.
- 사용자는 시스템이 제안하는 화자 태깅(이름 감지)을 검토하고 수정/확정할 수 있어야 한다.
- 화자 태깅이 완료된 후, 사용자는 요약, RAG, 자막 생성 기능을 선택할 수 있어야 한다.

### 2.2. 비기능적 요구사항

- **핵심 성과 지표 (KPI):**
    - **STT 정확도 (WER):** 90% 이상 (단어 오류율 10% 미만)
    - **화자 인식 정확도 (DER):** 90% 이상 (화자 인식 오류율 10% 미만)
- **대상 환경:** **다소 소음이 있는 회의** 환경을 주 대상으로 한다.
- **처리 속도:** 실시간 처리를 요구하지 않으며(배치 처리), 처리 속도보다 **성능(정확도)을 우선**으로 한다.

---

## 3. 시스템 아키텍처 및 설계

### 3.1. 전체 파이프라인

1. **[Input] 녹음 파일 입력**
    - 모든 오디오 포맷을 WAV로 일괄 변환
2. **[Pre-processing] 음성 전처리**
    - 소음 환경에서의 성능 확보를 위한 전처리 수행 (상세 로직은 5.1 참조)
3. **[STT] 음성 인식 (Whisper)**
    - 음성을 타임스탬프가 포함된 텍스트로 변환
4. **[Diarization] 화자 분리**
    - 음성 신호를 기반으로 화자별(Speaker A, B) 타임스탬프 분리
5. **[Merge] 병합 로직**
    - STT 결과(텍스트)와 Diarization 결과(화자)를 타임스탬프 기준으로 병합
6. **[Tagging] 화자 태깅**
    - STT 텍스트에서 이름(e.g., "김팀장님")을 감지하고, 사용자 확인을 거쳐 `Speaker A`를 `김팀장님`으로 매칭
7. **[Router] 응용 분기**
    - 태깅 완료된 텍스트를 사용자가 선택한 기능(요약, RAG 등)으로 전달
8. **[Output] 최종 결과**
    - 요약, Q&A 답변, 자막 파일(.srt)

### 3.2. 핵심 모듈별 설계 현황

- **[2. 음성 전처리]**
    - **현황:** 설계 중 (미확정)
    - **내용:** 소음이 있는 회의 환경에서 화자 분리(Diarization) 성능이 전처리 방식에 크게 좌우됨. 노이즈 제거, 묵음 구간 제거(VAD) 등의 전처리 방식을 우선 확정해야 함.
    - **I/O 구조 (I,O.md 참조):**
        - Input: 원본 파일 경로
        - Output: 두 개의 전처리 파일 생성
            - `stt_input_path`: VAD만 적용 (STT용)
            - `diar_input_path`: VAD + 노이즈 제거 적용 (화자 분리용)
- **[3. STT Engine]**
    - **현황:** 선정 완료
    - **모델:** **Whisper** (타임스탬프 제공 기능 활용)
    - **I/O 구조:**
        - Input: `stt_input_path`
        - Output: 단어 레벨 타임스탬프 리스트 `[{text, start, end}, ...]`
- **[4. Speaker Diarization]**
    - **현황:** ✅ 선정 완료 (2025-11-16)
    - **모델:** **Senko** (pyannote.audio 기반)
    - **설정:**
        - GPU 가속 지원 (CUDA 11.8 + PyTorch 2.1.0)
        - Senko[nvidia] 버전 사용 (pyannote.audio 3.1.1 포함)
        - 음성 임베딩 추출 기능 내장
    - **I/O 구조:**
        - Input: `diar_input_path` (전처리된 WAV 파일)
        - Output: 화자별 타임스탬프 + 임베딩 벡터 `{turns: [{speaker_label, start, end}], embeddings: {SPEAKER_XX: [vector]}}`
- **[5. 병합 로직]**
    - **현황:** 설계 완료
    - **로직:** **최대 겹침 (Max Overlap)**
    - **설명:** STT가 반환한 단어별 타임스탬프(`[3.0s~4.0s]`)와 화자 분리가 반환한 화자별 타임스탬프(`[2.9s~4.1s] Speaker B`)를 비교하여, **겹치는(Overlap) 시간이 가장 긴 화자**를 해당 단어의 최종 화자로 할당한다.
- **[6. 화자 태깅]**
    - **현황:** 설계 완료 (I,O.md, graph.md 참조)
    - **아키텍처:** **LangGraph 기반 에이전틱 파이프라인**
        - **프레임워크**: LangChain + LangGraph
        - **LLM**: GPT-4 (OpenAI)
        - **모니터링**: LangSmith
        - **비동기**: FastAPI BackgroundTasks
    - **로직 (5a~5f 단계):**
        1. **[자동 매칭]** 기존 화자 프로필 로드 (DB: `user_speaker_profiles`)
            - 음성 임베딩 + 텍스트 임베딩 유사도 계산
            - 임계값(0.85) 이상이면 자동 매칭 성공
        2. **[5a~5c 내부 처리 - 2가지 방식 병렬 실행]**
            - **방식 1: 이름 기반 태깅 (LLM 대화 흐름 분석)**
                - 이름 감지 (NER 결과 활용)
                - **닉네임 생성 (LLM 기반 역할/특징 분석)** - NER와 동시 처리
                - 전후 5문장 문맥 추출
                - LLM 추론: "민서는 SPEAKER_00? SPEAKER_01?"
            - **방식 2: 역할 기반 클러스터링 (LLM 발화 패턴 분석)**
                - 발화량 분석 (시간, 횟수)
                - LLM 추론: "SPEAKER_00은 진행자? 발표자?"
        3. **[교차 검증]** 방식1, 방식2 결과 비교
            - 일치 시 → 신뢰도 상승
            - 모순 시 → needs_manual_review 플래그
        4. **[5d UI 제안]** 백엔드가 판단한 결과를 사용자에게 제시:
            - `detected_names`: 감지된 모든 이름 리스트
            - `detected_nicknames`: LLM이 생성한 닉네임 리스트 (역할/특징 기반)
            - `suggested_mappings`: 각 SPEAKER_XX에 대한 추천 이름 + 닉네임 + 역할
            - `name_confidence`: LLM 판단 신뢰도
            - `role_confidence`: 역할 추론 신뢰도
            - `auto_matched`: 임베딩 자동 매칭 여부
            - `conflict_detected`: 모순 발견 여부
            - `needs_manual_review`: 수동 확인 필요 플래그
        5. **[5e 사용자 확정]** 사용자가 제안을 검토하고 수정/확정:
            - Input: `{speaker_count: 3, detected_names: ["민서", "인서"], detected_nicknames: ["진행 담당자", "기술 전문가"]}`
        6. **[프로필 저장]** 새 화자를 `user_speaker_profiles`에 저장
            - 다음 오디오에서 자동 매칭에 활용
        7. **[5f 최종 병합]** 확정된 이름으로 최종 transcript 생성:
            - Output: `[{speaker_name, start_time, end_time, text}, ...]`
- **[8. 요약/RAG/자막]**
    - **현황:** 선정 완료 (우선순위)
    - **모델:** 상용 **LLM API** (GPT, Claude 등) 사용을 우선한다. (추후 로컬 모델 고려)
    - **I/O 구조:**
        - Input: 5f의 최종 transcript
        - Output:
            - 요약: String (요약문)
            - RAG: Vector DB 저장 (임베딩)
            - 자막: String (.srt 또는 .vtt 포맷)

### 3.3. 기술 스택

- **Frontend:** React + Vite + TailwindCSS
    - 파일 업로드, 화자 태깅 UI, 결과 대시보드
    - 다크모드 지원 (ThemeContext)
- **Backend:** FastAPI
    - RESTful API, 비즈니스 로직, AI 모델 통합
- **AI/ML:**
    - **LangChain + LangGraph**: 에이전틱 파이프라인
    - **OpenAI GPT-4**: 화자 추론 LLM
    - **LangSmith**: Agent 추적 및 디버깅
    - **Whisper large-v3**: STT 모델 (OpenAI API + 로컬 대안)
    - **Senko**: 화자 분리 (pyannote.audio 기반, GPU 가속 지원)
- **Database:** MySQL 8.0
    - 사용자 정보, 파일 메타데이터, 처리 결과 저장
    - `user_speaker_profiles`: 화자 임베딩 저장 (자동 매칭용)
- **Authentication:** OAuth 2.0 (Google, Kakao) + JWT
    - 하이브리드 인증 (이메일/비밀번호 + 소셜 로그인)
- **Deployment:** Docker (docker-compose)
    - 멀티 컨테이너 구성 (frontend / backend / mysql 분리)

### 3.4. 프로젝트 구조

```
ListenCarePlease/
├── frontend/                  # React 애플리케이션
│   ├── public/
│   ├── src/
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   │   ├── FileUpload/
│   │   │   ├── TaggingUI/
│   │   │   └── Dashboard/
│   │   ├── pages/            # 페이지 컴포넌트
│   │   │   ├── LoginPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── TaggingPage.jsx
│   │   │   └── ResultPage.jsx
│   │   ├── services/         # API 호출 로직
│   │   │   ├── api.js
│   │   │   └── auth.js
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── utils/            # 유틸리티 함수
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
│
├── backend/                   # FastAPI 애플리케이션
│   ├── app/
│   │   ├── api/              # API 라우터
│   │   │   ├── v1/
│   │   │   │   ├── auth.py       # OAuth 로그인 (Google, Kakao)
│   │   │   │   ├── upload.py     # 파일 업로드
│   │   │   │   ├── process.py    # AI 처리 (STT, Diarization)
│   │   │   │   ├── tagging.py    # 화자 태깅 (Agent 호출)
│   │   │   │   └── application.py # 요약/RAG/자막
│   │   │   └── deps.py       # 의존성 (DB 세션, 인증 등)
│   │   ├── agents/           # 🤖 LangGraph Agent (NEW!)
│   │   │   ├── graph.py      # StateGraph 정의
│   │   │   ├── nodes/        # Agent 노드들
│   │   │   │   ├── load_profiles.py
│   │   │   │   ├── embedding_match.py
│   │   │   │   ├── name_extraction.py
│   │   │   │   ├── name_based_tagging.py  # 방식1
│   │   │   │   ├── role_based_tagging.py  # 방식2
│   │   │   │   ├── merge_results.py
│   │   │   │   └── save_profiles.py
│   │   │   ├── tools/        # LangChain Tools
│   │   │   │   ├── load_profiles_tool.py
│   │   │   │   ├── voice_similarity_tool.py
│   │   │   │   ├── text_similarity_tool.py
│   │   │   │   └── save_profile_tool.py
│   │   │   └── prompts/      # LLM 프롬프트 템플릿
│   │   │       └── tagger_prompts.py
│   │   ├── core/             # 핵심 설정
│   │   │   ├── config.py     # 환경 변수
│   │   │   └── security.py   # JWT, OAuth
│   │   ├── models/           # SQLAlchemy 모델 (DB 테이블)
│   │   │   ├── user.py
│   │   │   ├── audio_file.py
│   │   │   ├── speaker_profile.py  # 🆕 user_speaker_profiles
│   │   │   └── transcript.py
│   │   ├── schemas/          # Pydantic 스키마 (I/O 검증)
│   │   │   ├── audio.py      # I,O.md 기반 스키마
│   │   │   ├── tagging.py
│   │   │   └── transcript.py
│   │   ├── services/         # 비즈니스 로직
│   │   │   ├── preprocessing.py
│   │   │   ├── stt_service.py
│   │   │   ├── diarization_service.py
│   │   │   ├── agent_service.py     # 🆕 Agent 호출 레이어
│   │   │   └── llm_service.py
│   │   ├── db/               # 데이터베이스
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   └── main.py           # FastAPI 앱 진입점
│   ├── tests/                # 테스트 코드
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml        # 멀티 컨테이너 오케스트레이션
├── .env                      # 환경 변수 (gitignore)
├── pdr.md                    # 프로젝트 설계 문서 (본 문서)
├── I,O.md                    # 파이프라인 I/O 정의
├── graph.md                  # 🆕 LangGraph Agent 아키텍처
└── database_schema.md        # DB 스키마 상세 문서
```

**Docker 구성:**
```yaml
services:
  frontend:
    - React 개발 서버 또는 Nginx + 빌드된 정적 파일
    - 포트: 3000

  backend:
    - FastAPI 서버 (uvicorn)
    - 포트: 8000
    - 볼륨: 업로드된 파일 저장 공간

  mysql:
    - MySQL 8.0
    - 포트: 3306
    - 볼륨: 데이터 영속성 보장
```

### 3.5. 개발 로드맵

#### Phase 1: 웹 인프라 구축 (AI 모델 독립)
**목표:** AI 모델이 확정되지 않아도 웹 애플리케이션을 먼저 구현

**[완료] Step 1: Docker 환경 구축**
- ✅ Docker Compose 멀티 컨테이너 구성
    - Frontend (React + Vite + TailwindCSS) - Port 3000
    - Backend (FastAPI + Uvicorn) - Port 8000
    - MySQL 8.0 - Port 3306
- ✅ 프로젝트 디렉토리 구조 생성
- ✅ 개발 환경 설정 완료
- ✅ 실행 확인 완료 (http://localhost:3000, http://localhost:8000)

**[완료] Step 2: DB 스키마 설계 및 초기화**
- ✅ ERD 설계 (9개 테이블 + 관계 정의)
- ✅ SQLAlchemy 모델 작성:
    - `users` - 하이브리드 인증 (이메일 + OAuth)
    - `audio_files` - 파일 메타데이터 + 상태 관리
    - `preprocessing_results` - 전처리 결과 (I,O.md Step 2)
    - `stt_results` - STT 단어별 타임스탬프 (I,O.md Step 3)
    - `diarization_results` - 화자 분리 + 임베딩 (I,O.md Step 4)
    - `detected_names` - 시스템 감지 이름 (I,O.md Step 5a~5c)
    - `speaker_mappings` - 사용자 확정 태깅 (I,O.md Step 5d~5e)
    - `final_transcripts` - 최종 병합 대본 (I,O.md Step 5f)
    - `summaries` - 요약/자막 결과 (I,O.md Step 6)
- ✅ Alembic 마이그레이션 설정
- ✅ 초기 마이그레이션 생성 및 적용
- ✅ MySQL 테이블 생성 확인
- 📄 참고: `database_schema.md` 문서 작성 완료

**[완료] Step 3: 인증 시스템 구현**
- ✅ JWT 토큰 시스템 (Access + Refresh Token)
- ✅ 이메일/비밀번호 로그인 (회원가입, 로그인, 비밀번호 해싱)
- ✅ 하이브리드 OAuth 인증:
    - ✅ 구글 로그인
    - ✅ 카카오 로그인
- ✅ 인증 미들웨어 및 의존성 설정
- ✅ 프론트엔드 AuthContext 및 Protected Route

**[진행 예정] Step 4: 파일 업로드 API**
- 멀티파트 파일 업로드 엔드포인트
- 파일 검증 (포맷, 크기 제한)
- 파일 저장 및 메타데이터 DB 저장
- 업로드 상태 추적

**[진행 예정] Step 5: AI 처리 Mock API**
- I,O.md 기반 API 목업 구현
    - `/api/v1/process/analyze`: 파일 분석 시작 (mock)
    - `/api/v1/tagging/suggest`: 화자 태깅 제안 (mock 데이터 반환)
    - `/api/v1/tagging/confirm`: 사용자 확정 저장
    - `/api/v1/summary`: 요약 생성 (mock)

**[완료] Step 6: React UI 구현**
- ✅ 로그인/회원가입 페이지
- ✅ OAuth 콜백 페이지
- ✅ 파일 업로드 페이지 (드래그앤드롭)
- ✅ 프로세싱 페이지 (진행률 표시)
- ✅ 화자 정보 확인 페이지 (화자 수 + 이름 확인)
- ✅ AI 분석 중 페이지 (멀티턴 LLM 분석)
- ✅ 화자 태깅 페이지 (요약 뷰 + 상세 뷰)
    - 📊 요약 뷰: 화자별 일괄 매핑
    - 📝 상세 뷰: 개별 발화 수정 가능
- ✅ 결과 페이지 (회의록 + 통계 + 다음 단계 선택)
- ✅ 세련된 디자인 적용 (TailwindCSS, 그라데이션, 애니메이션)

**페이지 플로우 (상세):**
```
1. 로그인/회원가입 (/login, /register)
   ↓
2. 파일 업로드 (/)
   - 드래그앤드롭 또는 파일 선택
   ↓
3. 프로세싱 (/processing/:fileId)
   - STT, Diarization 처리 중 (진행률 표시)
   ↓
4. 화자 정보 확인 (/confirm/:fileId)
   - 화자 수 확인/수정 (e.g., 3명)
   - 감지된 이름 확인/수정 (e.g., ["민서", "인서", "김팀장"])
   - 확인 완료 버튼 클릭
   ↓
5. AI 분석 중 (/analyzing/:fileId)
   - 멀티턴 LLM 화자 분석 중 (3초 로딩)
   ↓
6. 화자 태깅 (/tagging/:fileId)
   - 요약 뷰: SPEAKER_XX → 실제 이름 일괄 매핑
   - 상세 뷰: 개별 발화별 화자 수정 가능
   - 태깅 완료 버튼 클릭
   ↓
7. 결과 페이지 (/result/:fileId)
   - 화자별 통계 (발화 횟수, 발화 시간)
   - 전체 회의록 표시 (다운로드 가능)
   - 다음 단계 선택:
     * 요약 생성 (/summary/:fileId)
     * RAG 대화 (/rag/:fileId)
     * 자막 생성 (/subtitle/:fileId)
```

**완료 조건:** 웹 애플리케이션이 목업 데이터로 E2E 동작

#### Phase 2: AI 모듈 통합
**목표:** 전처리/STT/Diarization 확정 후 실제 AI 모델 연동
- **전제 조건:** [5. 미결정 사항] 중 `[2. 음성 전처리]`, `[4. Speaker Diarization]` 확정
- **작업 내용:**
    - 음성 전처리 모듈 구현 (VAD, 노이즈 제거)
    - Whisper 연동 (로컬 모델 or OpenAI API)
    - Diarization 모델 연동 (선정된 모델)
    - 병합 로직 구현 (최대 겹침 알고리즘)
    - 화자 태깅 로직 구현 (이름 감지, 임베딩 유사도)
    - API 목업을 실제 AI 서비스로 교체
- **완료 조건:** 실제 음성 파일로 E2E 처리 성공, KPI 달성 (WER/DER 90%)

#### Phase 3: 응용 기능 고도화
**목표:** 요약/RAG/자막 기능 완성도 향상
- **작업 내용:**
    - LLM 연동 (GPT/Claude API)
    - Vector DB 구축 (RAG용 - Pinecone, Weaviate 등)
    - 자막 포맷 변환 (.srt, .vtt)
    - 성능 최적화 및 에러 핸들링
- **완료 조건:** 모든 응용 기능 안정적 동작

---

## 4. UX/UI 설계 (Wireframe)

### 4.1. [1단계] 파일 업로드

`+------------------------------------------------------+
| 🎙️ 발화자 자동 태깅 및 요약 서비스                   |
+------------------------------------------------------+
|                                                      |
|   [ + ]                                              |
|   여기에 녹음 파일을 드래그 앤 드롭 하거나 클릭하여    |
|   파일을 선택하세요.                                 |
|                                                      |
|   [ 분석 시작하기 ]                                  |
|                                                      |
+------------------------------------------------------+`

### 4.2. [2단계] 처리 중

*(로딩 화면)*

### 4.3. [3단계] 화자 태깅 및 검증 (핵심)

- 분석 완료 직후, 사용자에게 태깅을 요구하는 화면.

`+-------------------------------------------------------------------+
| 🎙️ [회의 제목.mp3] 분석 완료!                                     |
|   결과를 보기 전, 화자를 태깅해 주세요.                             |
+-------------------------------------------------------------------+
|                                                                   |
|   [!] "이 이름이 맞나요?"                                         |
|   대화에서 [김팀장님], [철수씨] (이)라는 이름이 감지되었습니다.     |
|   아래 스피커에 맞게 이름을 지정하거나 직접 입력해 주세요.          |
|                                                                   |
|   - Speaker A: [ (클릭하여 이름 선택) v ] (감지된 이름/직접입력)   |
|   - Speaker B: [ (클릭하여 이름 선택) v ] (감지된 이름/직접입력)   |
|   - Speaker C: [ (클릭하여 이름 선택) v ] (감지된 이름/직접입력)   |
|                                                                   |
|   [ 태깅 완료하고 결과 보기 ]                                     |
|                                                                   |
| --- (참고용: 스피커별 전사) -------------------------------------- |
| [00:10] [Speaker A]: 오늘 회의 안건은...                           |
| [00:12] [Speaker B]: 네, 제가 먼저...                            |
| [00:15] [Speaker A]: 아, 김팀장님...                             |
+-------------------------------------------------------------------+`

### 4.4. [4단계] 결과 대시보드

- 태깅이 완료된 후, 사용자가 응용 기능을 선택하는 화면.

`+-------------------------------------------------------------------+
| 🎙️ [회의 제목.mp3] 분석 결과                                       |
+-------------------------------------------------------------------+
| 원하는 작업을 선택하세요:                                         |
|                                                                   |
|   [ 📝 핵심 내용 요약하기 ]                                       |
|                                                                   |
|   [ ❓ Q&A (RAG) 시작하기 ]                                       |
|                                                                   |
|   [ 🎬 자막 파일로 내보내기 ]                                     |
|                                                                   |
| --- (최종 태깅된 전체 대화) ------------------------------------- |
| [00:10] [김팀장님]: 오늘 회의 안건은...                           |
| [00:12] [철수씨]: 네, 제가 먼저...                               |
| [00:15] [김팀장님]: 아, 김팀장님...                              |
+-------------------------------------------------------------------+`

---

## 5. 미결정 사항 및 위험 (Open Issues)

### AI 모델 관련 (Phase 2에서 해결)

1. **[Blocker] `[2. 음성 전처리]` 방식 미확정**
    - **내용:** 정확도 90% 달성을 위해 전처리가 필수적이나, 노이즈 제거/VAD 등의 구체적인 적용 방식이 미확정되었습니다.
    - **영향:** 이 방식이 확정되지 않으면 `[4. 화자 분리]` 모델의 성능 테스트 및 최종 선정이 불가능합니다.
    - **다음 단계:** 소음 환경 데이터셋을 구축하고, 다양한 전처리 기법(RNNoise, SpeexDSP 등)을 적용하여 테스트를 진행해야 합니다.
    - **웹 개발 영향:** Phase 1에서는 전처리를 Mock으로 처리하므로 블로킹되지 않음.

2. **[Risk] `[5. 병합 로직]`의 정확도 검증**
    - **내용:** '최대 겹침' 로직은 대부분의 경우 유효하지만, 발화가 매우 짧거나(e.g., "네.") 겹치는(Overlap) 구간에서 오류가 발생할 수 있습니다.
    - **다음 단계:** 실제 테스트 데이터를 통해 병합 로직의 정확도를 검증하고 예외 처리를 보강해야 합니다.

### 웹 개발 관련 (Phase 1에서 해결)

3. **[완료] DB 스키마 상세 설계**
    - **상태:** ✅ 완료 (2025-11-10)
    - **완료 내용:**
        - 9개 테이블 ERD 설계 완료
        - SQLAlchemy 모델 전체 구현 완료
        - Alembic 마이그레이션 적용 완료
        - MySQL 테이블 생성 확인 완료
    - **참고 문서:** `database_schema.md`

4. **[TODO] 하이브리드 OAuth 인증 연동**
    - **내용:** 구글, 카카오, GitHub OAuth 2.0 연동 필요.
    - **다음 단계:**
        - 각 플랫폼 개발자 앱 등록
        - REST API 키 발급
        - FastAPI OAuth 플로우 구현
        - JWT 토큰 시스템 구현

5. **[TODO] 파일 업로드 전략**
    - **내용:** 대용량 오디오 파일 업로드 시 청크 업로드, 진행률 표시 등 고려.
    - **다음 단계:** 멀티파트 업로드 구현 또는 AWS S3/MinIO 같은 객체 스토리지 활용 검토.

---

## 6. 진행 상황 요약 (Progress Summary)

### 📅 최근 업데이트: 2025-11-20 (닉네임 태깅 기능 통합 완료)

#### ✅ 완료된 작업
- **Step 1: Docker 환경 구축** (2025-11-10)
    - Docker Compose 멀티 컨테이너 설정
    - Frontend (React + Vite + TailwindCSS) 초기 구성
    - Backend (FastAPI) 초기 구성
    - MySQL 8.0 컨테이너 설정
    - 개발 환경 실행 확인

- **Step 2: DB 스키마 설계 및 초기화** (2025-11-10)
    - 9개 테이블 ERD 설계 (I,O.md 기반)
    - SQLAlchemy 모델 8개 파일 작성
    - Alembic 마이그레이션 설정 및 초기화
    - MySQL 테이블 생성 완료
    - `database_schema.md` 문서화

- **CUDA/GPU 환경 구축 및 화자 분리 모델 설정** (2025-11-16)
    - **Docker CUDA 환경 구축**:
        - PyTorch 2.1.0+cu118 (CUDA 11.8) 설치 완료
        - NVIDIA GPU 지원 docker-compose.yml 설정
        - Whisper large-v3 모델 사전 다운로드 (3GB)
    - **Senko (화자 분리 라이브러리) 설정**:
        - Senko[nvidia] 버전 설치 (pyannote.audio 포함)
        - CUDA 라이브러리 심볼릭 링크 생성 (`libnvrtc.so` 에러 해결)
        - LD_LIBRARY_PATH 환경 변수 설정
    - **STT 및 화자 분리 파이프라인 테스트**:
        - OpenAI Whisper API 타임아웃 30분으로 증가
        - Whisper 병렬 처리 구현 (4개 청크 동시 전사)
        - Senko 화자 분리 GPU 모드 정상 작동 확인
    - **Docker 최적화**:
        - 빌드 캐시 정리 및 디스크 공간 80GB 확보
        - 멀티 플랫폼 빌드 지원 (cpu, cuda, mac)
    - **결과**: STT + 화자 분리 파이프라인 E2E 테스트 성공

- **🆕 NER (Named Entity Recognition) 및 DB 저장 구현** (2025-11-18)
    - **NER 모델 통합**:
        - `seungkukim/korean-pii-masking` BERT 모델 사용
        - Levenshtein Distance 기반 유사 이름 클러스터링 구현
        - 이름 감지 + 화자 레이블 매핑 완료
    - **DB 저장 로직 구현**:
        - `stt_results`: 전사 텍스트 저장 (TEXT 컬럼으로 긴 세그먼트 지원)
        - `diarization_results`: 화자 구간 + 임베딩 벡터 저장 (JSON)
        - `detected_names`: 감지된 이름 + 앞뒤 5문장 context 저장 (I,O.md 5a~5c 스펙)
        - `speaker_mappings`: 화자별 초기 레코드 생성 (suggested_name=None)
    - **Alembic 마이그레이션**:
        - `stt_results.text` VARCHAR(100) → TEXT 변경 마이그레이션 생성 및 적용
    - **Context 추출 로직**:
        - 이름이 언급된 문장 기준 앞뒤 5문장 추출
        - index, speaker, text, time 정보를 JSON 형태로 저장
        - 향후 멀티턴 LLM 추론에 활용 예정
    - **결과**: STT → Diarization → NER → DB 저장 파이프라인 E2E 성공

- **🆕 닉네임 태깅 기능 통합** (2025-11-20)
    - **LLM 기반 닉네임 생성**:
        - `NicknameService`: 화자별 역할/특징 기반 닉네임 생성
        - Smart Selection 알고리즘: 대표 발화 선택 (긴 발화, 키워드 발화, 시점별 발화)
        - OpenAI GPT-4 API 호출로 닉네임 생성
    - **DB 스키마 확장**:
        - `SpeakerMapping.nickname`: String(100) - 생성된 닉네임 저장
        - `SpeakerMapping.nickname_metadata`: JSON - 닉네임 메타데이터 (display_label, one_liner, keywords)
        - `UserConfirmation.confirmed_nicknames`: JSON - 사용자가 확정한 닉네임 리스트
    - **프론트엔드 통합**:
        - 화자 정보 확인 페이지: 닉네임 선택/수정 기능 추가
        - 태깅 페이지: 이름과 닉네임을 별도로 선택 가능
        - 처리 상태 표시: "닉네임 태깅 중..." 단계 추가
    - **Alembic 마이그레이션**:
        - `add_nickname_fields_to_speaker_mapping.py`: nickname, nickname_metadata 컬럼 추가
        - `c2b235bed6aa_add_confirmed_nicknames_to_user_.py`: confirmed_nicknames 컬럼 추가
    - **결과**: NER와 동시에 닉네임 태깅 수행, 사용자가 이름과 닉네임을 모두 선택/확정 가능

- **🆕 LangSmith 추적 기능 개선** (2025-11-20)
    - `LANGSMITH_API_KEY` 자동 인식 및 `LANGCHAIN_API_KEY`로 복사
    - API 키 없을 시 추적 자동 비활성화하여 에러 방지
    - 앱 시작 시 추적 상태 로그 출력

- **🆕 LLM 모델 호환성 개선** (2025-11-20)
    - `gpt-5-mini-2025-08-07` 모델의 temperature 파라미터 이슈 해결
    - 모델별 조건부 temperature 설정 (gpt-5-mini: 1.0, 기타: 0.3)
    - 멀티턴 요약 개선: 최근 10개 결과 고려, 화자별 그룹화, 모든 스코어 포함

#### 🔄 진행 중인 작업
- 없음 (다음 단계: 멀티턴 LLM 추론 구현)

#### ⏭️ 다음 단계
- **Step 3: 인증 시스템 구현**
    - JWT 토큰 시스템
    - 이메일/비밀번호 로그인
    - 하이브리드 OAuth (구글, 카카오, GitHub)

#### 📊 전체 진행률
- **Phase 1 (웹 인프라):** 50% (3/6 단계 완료)
- **Phase 2 (AI 모듈):** 75% (STT, Diarization, NER, 닉네임 태깅, DB 저장 완료 / LLM 추론 구현 대기 중)
- **Phase 3 (응용 기능):** 0% (대기 중)

#### 📁 생성된 주요 파일
```
ListenCarePlease/
├── pdr.md                          # 프로젝트 설계 문서 (본 문서)
├── I,O.md                          # 파이프라인 I/O 정의
├── database_schema.md              # DB 스키마 상세 문서
├── docker-compose.yml              # Docker 오케스트레이션
├── .env                            # 환경 변수
├── backend/
│   ├── alembic/                    # DB 마이그레이션
│   │   └── versions/
│   │       └── 9eb8318e9141_initial_migration.py
│   ├── app/
│   │   ├── models/                 # SQLAlchemy 모델 (8개 파일)
│   │   ├── core/config.py          # 설정
│   │   ├── db/base.py              # DB 연결
│   │   └── main.py                 # FastAPI 앱
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx                 # 메인 앱 (임시 랜딩 페이지)
    │   ├── index.css               # TailwindCSS 설정
    │   └── main.jsx
    ├── tailwind.config.js
    └── package.json
```

#### 🎯 핵심 성과
1. **Docker 기반 개발 환경 구축** - 팀원 간 환경 일관성 확보
2. **체계적인 DB 설계** - I,O.md 기반 세분화된 테이블 구조로 디버깅 및 재처리 용이
3. **명확한 문서화** - PDR, I/O, DB Schema, Graph 문서로 프로젝트 이해도 향상
4. **CUDA/GPU 환경 완전 구축** (2025-11-16):
    - PyTorch + CUDA 11.8 환경 설정 완료
    - Senko 화자 분리 라이브러리 GPU 모드 정상 작동
    - cuDNN 라이브러리 심볼릭 링크 문제 해결
    - STT + 화자 분리 E2E 파이프라인 테스트 성공
5. **화자 분리 모델 확정** - Senko (pyannote.audio 기반) 선정 및 통합 완료
6. **🆕 NER 및 DB 저장 완전 구현** (2025-11-18):
    - 한국어 이름 감지 NER 모델 통합 (`seungkukim/korean-pii-masking`)
    - Levenshtein Distance 기반 유사 이름 클러스터링
    - DetectedName 테이블에 context (앞뒤 5문장) 저장
    - SpeakerMapping 초기 레코드 생성 (향후 LLM 추론 대기)
    - STT → Diarization → NER → DB 저장 전체 파이프라인 완성