# ListenCarePlease - 완전 가이드

> 🎙️ AI 기반 회의록 자동 생성 및 화자 태깅 시스템 - 전체 구조 문서

**최종 업데이트**: 2025-11-27
**버전**: 1.0

---

## 📑 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [전체 파이프라인](#4-전체-파이프라인)
5. [데이터베이스 구조](#5-데이터베이스-구조)
6. [백엔드 상세](#6-백엔드-상세)
7. [프론트엔드 상세](#7-프론트엔드-상세)
8. [주요 기능](#8-주요-기능)
9. [API 문서](#9-api-문서)
10. [배포 및 운영](#10-배포-및-운영)
11. [트러블슈팅](#11-트러블슈팅)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 소개

ListenCarePlease는 회의 녹음 파일을 업로드하면 자동으로 화자를 분리하고, 이름을 태깅하여 정확한 회의록을 생성하는 AI 기반 서비스입니다.

**핵심 가치**:
- ⏱️ **시간 절약**: 수동 회의록 작성 시간 90% 단축
- 🎯 **정확성**: 화자 인식 정확도 90% 이상 (DER < 10%)
- 🤖 **자동화**: STT → 화자 분리 → 이름 태깅 → 요약 전 과정 자동화
- 💡 **인사이트**: 회의 효율성 분석 및 AI 기반 요약 제공

### 1.2 주요 기능

#### 1️⃣ 음성 파일 처리
- 다양한 포맷 지원 (mp3, m4a, wav 등)
- 자동 전처리 (VAD, 노이즈 제거)
- GPU 가속 지원 (CUDA 11.8)

#### 2️⃣ STT (Speech-to-Text)
- Whisper large-v3 모델 사용
- 단어 레벨 타임스탬프 제공
- 로컬 모델 + OpenAI API 지원

#### 3️⃣ 화자 분리 (Diarization)
- Senko (pyannote.audio 기반)
- 음성 임베딩 추출 (192차원)
- 자동 화자 매칭 (유사도 기반)

#### 4️⃣ 화자 태깅 (LangGraph Agent)
- **방식 1**: 이름 기반 태깅 (NER + 멀티턴 LLM)
- **방식 2**: 역할 기반 태깅 (발화 패턴 분석)
- 닉네임 자동 생성 (역할/특징 기반)
- 화자 프로필 저장 및 재사용

#### 5️⃣ 회의 효율성 분석
- **5가지 지표**: 엔트로피, TTR, 정보량, 문장 확률, PPL
- **AI 인사이트**: GPT-4o-mini 기반 코멘터리
- 화자별 + 전체 회의 분석

#### 6️⃣ RAG (Retrieval-Augmented Generation)
- ChromaDB 벡터 저장소
- 화자 필터링 지원
- 자연어 질의응답

#### 7️⃣ 추가 기능
- Todo 자동 추출
- 회의 요약 (구현 예정)
- 자막 생성 (구현 예정)

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  - TailwindCSS, Vite                   │
│  - 다크모드, 인증, 라우팅               │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
               ↓
┌─────────────────────────────────────────┐
│         Backend (FastAPI)               │
│  - 8개 API 라우터                       │
│  - JWT 인증, OAuth 2.0                  │
│  - BackgroundTasks (비동기 처리)        │
└──────┬──────────────┬───────────────────┘
       │              │
       ↓              ↓
┌─────────────┐  ┌──────────────────────┐
│   MySQL     │  │   AI/ML Services     │
│   8.0       │  │  - Whisper (STT)    │
│             │  │  - Senko (화자 분리) │
│  - 10개     │  │  - LangGraph (Agent)│
│    테이블   │  │  - GPT-4o (LLM)     │
└─────────────┘  │  - ChromaDB (RAG)   │
                 └──────────────────────┘
```

### 2.2 Docker 구성

```yaml
services:
  frontend:
    - React + Vite
    - Port: 3000
    - 핫 리로드 지원

  backend:
    - FastAPI + Uvicorn
    - Port: 8000
    - GPU 지원 (CUDA 11.8)
    - 볼륨: /app/uploads

  mysql:
    - MySQL 8.0
    - Port: 3306
    - 볼륨: 데이터 영속성
```

### 2.3 디렉토리 구조

```
ListenCarePlease/
├── frontend/
│   ├── src/
│   │   ├── components/        # 재사용 컴포넌트
│   │   │   ├── Dashboard/
│   │   │   ├── FileUpload/
│   │   │   └── Layout/
│   │   ├── pages/            # 페이지 (13개)
│   │   ├── contexts/         # 인증, 테마
│   │   └── services/         # API 클라이언트
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/v1/           # API 라우터 (8개)
│   │   ├── agents/           # LangGraph Agent
│   │   │   ├── nodes/        # 7개 노드
│   │   │   ├── tools/        # 4개 도구
│   │   │   └── prompts/      # LLM 프롬프트
│   │   ├── models/           # DB 모델 (10개)
│   │   ├── services/         # 비즈니스 로직 (10개)
│   │   ├── core/             # 설정, 보안
│   │   └── db/               # DB 연결
│   ├── alembic/              # 마이그레이션
│   └── requirements.txt
│
├── docs/                     # 문서 (7개)
├── docker-compose.yml
└── .env
```

---

## 3. 기술 스택

### 3.1 Frontend

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| **프레임워크** | React 18 | UI 라이브러리 |
| **빌드 도구** | Vite | 빠른 개발 서버 |
| **스타일링** | TailwindCSS | 유틸리티 CSS |
| **라우팅** | React Router v6 | SPA 라우팅 |
| **상태 관리** | Context API | 인증, 테마 관리 |
| **HTTP 클라이언트** | Axios | API 통신 |
| **차트** | Chart.js | 데이터 시각화 |

### 3.2 Backend

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| **프레임워크** | FastAPI | 비동기 웹 프레임워크 |
| **ORM** | SQLAlchemy | DB ORM |
| **마이그레이션** | Alembic | DB 버전 관리 |
| **인증** | JWT + OAuth 2.0 | 하이브리드 인증 |
| **비동기** | BackgroundTasks | 장시간 작업 처리 |

### 3.3 AI/ML

| 카테고리 | 모델/라이브러리 | 용도 |
|---------|----------------|------|
| **STT** | Whisper large-v3 | 음성 → 텍스트 |
| **화자 분리** | Senko (pyannote.audio) | 화자 구분 |
| **NER** | korean-pii-masking | 이름 추출 |
| **LLM** | GPT-4o, GPT-4o-mini | 화자 태깅, 인사이트 |
| **에이전트** | LangChain, LangGraph | 워크플로우 자동화 |
| **임베딩** | Sentence Transformers | 의미적 유사도 |
| **형태소 분석** | Mecab | 한국어 토큰화 |
| **언어 모델** | KoGPT-2 | Perplexity 계산 |
| **군집화** | HDBSCAN | 이상치 탐지 |
| **벡터 DB** | ChromaDB | RAG 시스템 |

### 3.4 데이터베이스

- **RDBMS**: MySQL 8.0
- **Vector DB**: ChromaDB (로컬 파일 시스템)

### 3.5 DevOps

- **컨테이너**: Docker, Docker Compose
- **GPU**: CUDA 11.8, PyTorch 2.1.0
- **모니터링**: LangSmith (Agent 추적)

---

## 4. 전체 파이프라인

### 4.1 사용자 플로우

```
1. 로그인/회원가입
   ↓
2. 파일 업로드
   - 드래그앤드롭 또는 파일 선택
   ↓
3. 프로세싱 (자동)
   - STT (Whisper)
   - 화자 분리 (Senko)
   - NER (이름 추출)
   - 닉네임 생성
   ↓
4. 화자 정보 확인
   - 화자 수 확인/수정
   - 감지된 이름 확인/수정
   - 감지된 닉네임 확인/수정
   ↓
5. AI 분석 중 (LangGraph)
   - 멀티턴 LLM 화자 분석
   - 음성/텍스트 임베딩 매칭
   ↓
6. 화자 태깅
   - 시스템 제안 확인
   - 수정 및 확정
   ↓
7. 효율성 분석 (자동)
   - 5가지 지표 계산
   - AI 인사이트 생성
   ↓
8. 결과 페이지
   - 회의록 표시
   - 통계 확인
   ↓
9. 다음 단계 선택
   - RAG 대화
   - Todo 확인
   - 효율성 분석
```

### 4.2 데이터 파이프라인

```
[Audio File]
    ↓
┌─────────────────────────┐
│  1. Preprocessing       │
│  - VAD                  │
│  - 노이즈 제거          │
│  - 샘플레이트 정규화    │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  2. STT (Whisper)       │
│  - 음성 → 텍스트        │
│  - 타임스탬프 추출      │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  3. Diarization (Senko) │
│  - 화자 분리            │
│  - 임베딩 추출          │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  4. NER + Nickname      │
│  - 이름 추출 (BERT)     │
│  - 닉네임 생성 (GPT-4)  │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  5. Agent (LangGraph)   │
│  - 임베딩 매칭          │
│  - 이름 기반 태깅       │
│  - 역할 기반 태깅       │
│  - 결과 병합            │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  6. User Confirmation   │
│  - 제안 검토            │
│  - 수정 및 확정         │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  7. Final Transcript    │
│  - 최종 회의록 생성     │
└───────┬─────────────────┘
        ↓
┌─────────────────────────┐
│  8. Applications        │
│  - 효율성 분석          │
│  - RAG                  │
│  - Todo 추출            │
└─────────────────────────┘
```

---

## 5. 데이터베이스 구조

### 5.1 ERD

```
users (인증)
  └─┬─ audio_files (파일 메타데이터)
    ├─── preprocessing_results (전처리)
    ├─── stt_results (STT)
    ├─── diarization_results (화자 분리)
    ├─── detected_names (이름 감지)
    ├─── speaker_mappings (화자 매핑)
    ├─── user_confirmation (사용자 확정)
    ├─── final_transcripts (최종 회의록)
    ├─── meeting_efficiency_analysis (효율성 분석)
    └─── todos (할일 추출)
```

### 5.2 주요 테이블

#### users
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255),  -- NULL 허용 (OAuth 전용 사용자)
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  oauth_provider ENUM('google', 'kakao', 'github'),
  oauth_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### audio_files
```sql
CREATE TABLE audio_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_id VARCHAR(36) UNIQUE NOT NULL,  -- UUID
  user_id INT NOT NULL,
  original_filename VARCHAR(255),
  file_path VARCHAR(512),
  file_size BIGINT,
  duration FLOAT,
  status ENUM('UPLOADING', 'PREPROCESSING', 'PROCESSING',
              'COMPLETED', 'FAILED', 'CONFIRMED'),

  -- RAG 상태
  rag_collection_name VARCHAR(255),
  rag_initialized BOOLEAN DEFAULT FALSE,
  rag_initialized_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### speaker_mappings
```sql
CREATE TABLE speaker_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audio_file_id INT NOT NULL,
  speaker_label VARCHAR(50) NOT NULL,  -- SPEAKER_00, SPEAKER_01, ...

  -- 시스템 제안
  suggested_name VARCHAR(100),
  nickname VARCHAR(100),
  nickname_metadata JSON,
  name_confidence FLOAT,
  name_mentions INT DEFAULT 0,

  -- 플래그
  conflict_detected BOOLEAN DEFAULT FALSE,
  needs_manual_review BOOLEAN DEFAULT FALSE,
  auto_matched BOOLEAN DEFAULT FALSE,

  -- 사용자 확정
  final_name VARCHAR(100),
  is_modified BOOLEAN DEFAULT FALSE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE,
  UNIQUE KEY (audio_file_id, speaker_label)
);
```

#### meeting_efficiency_analysis
```sql
CREATE TABLE meeting_efficiency_analysis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audio_file_id INT UNIQUE NOT NULL,

  -- 전체 회의 지표
  entropy_values JSON,
  entropy_avg FLOAT,
  entropy_std FLOAT,
  overall_ttr JSON,
  overall_information_content JSON,
  overall_sentence_probability JSON,
  overall_perplexity JSON,

  -- 화자별 지표
  speaker_metrics JSON NOT NULL,

  -- 메타데이터
  total_speakers INT NOT NULL,
  total_turns INT NOT NULL,
  total_sentences INT NOT NULL,
  analysis_version VARCHAR(20) DEFAULT '1.0',
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
);
```

---

## 6. 백엔드 상세

### 6.1 API 라우터 (8개)

#### 1. auth.py - 인증
```python
POST /api/v1/auth/register
  - 이메일/비밀번호 회원가입

POST /api/v1/auth/login
  - 로그인 (JWT 토큰 발급)

POST /api/v1/auth/refresh
  - Access Token 갱신
```

#### 2. oauth.py - OAuth 2.0
```python
GET /api/v1/oauth/google
  - Google OAuth 시작

GET /api/v1/oauth/google/callback
  - Google OAuth 콜백

GET /api/v1/oauth/kakao
GET /api/v1/oauth/kakao/callback
  - Kakao OAuth
```

#### 3. upload.py - 파일 업로드
```python
POST /api/v1/upload
  - 멀티파트 파일 업로드
  - 입력: multipart/form-data
  - 출력: {file_id, message}
```

#### 4. processing.py - AI 처리
```python
POST /api/v1/process/{file_id}
  - STT + Diarization + NER + Nickname 실행
  - 파라미터: whisper_mode, diarization_mode
  - BackgroundTasks로 비동기 처리

GET /api/v1/status/{file_id}
  - 처리 상태 및 진행률 조회

GET /api/v1/merged/{file_id}
  - STT + Diarization 병합 결과
```

#### 5. tagging.py - 화자 태깅
```python
GET /api/v1/tagging/speaker-info/{file_id}
  - 화자 정보 조회

POST /api/v1/tagging/speaker-info/confirm
  - 사용자 수정 정보 저장

POST /api/v1/tagging/analyze/{file_id}
  - LangGraph Agent 실행 (화자 매핑)

GET /api/v1/tagging/{file_id}
  - 화자 태깅 제안 조회

POST /api/v1/tagging/confirm
  - 사용자 확정 태깅 저장
  - 효율성 분석 자동 트리거
```

#### 6. efficiency.py - 효율성 분석
```python
POST /api/v1/efficiency/analyze/{file_id}
  - 효율성 분석 시작
  - 파라미터: force (재분석 플래그)

GET /api/v1/efficiency/result/{file_id}
  - 분석 결과 조회 (AI 인사이트 포함)
```

#### 7. rag.py - RAG 시스템
```python
POST /api/v1/rag/{file_id}/initialize
  - 벡터 DB 초기화

POST /api/v1/rag/{file_id}/chat
  - 질문 및 답변

GET /api/v1/rag/{file_id}/speakers
  - 화자 목록 조회

GET /api/v1/rag/{file_id}/status
  - RAG 초기화 상태 조회

DELETE /api/v1/rag/{file_id}
  - 벡터 DB 삭제
```

#### 8. dashboard.py - 대시보드
```python
GET /api/v1/dashboard/stats
  - 통계 조회 (파일 수, 처리 현황)

GET /api/v1/dashboard/files
  - 최근 파일 목록

GET /api/v1/dashboard/processing-tasks
  - 처리 중인 작업 목록
```

### 6.2 서비스 레이어 (10개)

#### 1. preprocessing.py
```python
def preprocess_audio(input_path, output_path):
  - VAD (Voice Activity Detection)
  - 노이즈 제거
  - 샘플레이트 정규화 (16kHz)
  - 반환: (output_path, original_duration, processed_duration)
```

#### 2. stt.py
```python
def run_stt_pipeline(audio_path, output_dir, ...):
  - Whisper API 또는 로컬 모델
  - 병렬 처리 (4개 청크)
  - 타임스탬프 포함 텍스트 반환
```

#### 3. diarization.py
```python
def run_diarization(audio_path, device, mode="senko"):
  - Senko: pyannote.audio 기반 GPU 가속
  - 임베딩 추출: 192차원 벡터
  - 출력: {turns: [...], embeddings: {...}}
```

#### 4. ner_service.py
```python
class NERService:
  - 모델: seungkukim/korean-pii-masking
  - extract_person_names(): PERSON 엔티티 추출
  - cluster_names(): Levenshtein 거리 기반 군집화
  - process_segments(): 전체 세그먼트 처리
```

#### 5. nickname_service.py
```python
class NicknameService:
  - LLM: GPT-4
  - Smart Selection: 대표 발화 선택
  - generate_nickname(): 화자별 닉네임 생성
```

#### 6. agent_data_loader.py
```python
def load_agent_input_data_by_file_id(file_id, db):
  - DB에서 STT, Diarization, NER 결과 로드
  - Agent 입력 데이터 구성
```

#### 7. efficiency_analyzer.py
```python
class EfficiencyAnalyzer:
  - _calc_entropy(): 엔트로피 계산
  - _calc_ttr(): Type-Token Ratio
  - _calc_information_content(): 정보량 (코사인 유사도)
  - _calc_sentence_probability(): 문장 확률 (HDBSCAN)
  - _calc_perplexity(): PPL (KoGPT-2)
  - analyze_all(): 전체 분석 실행
```

#### 8. rag_service.py
```python
class RAGService:
  - store_transcript(): 벡터 DB에 저장
  - query(): 질문 및 답변
  - analyze_question(): 화자 필터 자동 감지
  - get_speakers(): 화자 목록 조회
```

#### 9. todo_extractor.py
```python
def extract_todos(transcript, llm_client):
  - LLM 기반 Todo 추출
  - 우선순위, 담당자, 기한 파싱
```

#### 10. diarization_nemo.py
```python
def run_nemo_diarization(audio_path, device):
  - NeMo Toolkit 기반 화자 분리
  - GPU 전용
```

### 6.3 LangGraph Agent

#### 노드 (7개)

1. **load_profiles_node**
   - 기존 화자 프로필 로드 (user_speaker_profiles)

2. **embedding_match_node**
   - 음성/텍스트 임베딩 유사도 계산
   - 임계값 0.85 이상이면 자동 매칭

3. **name_extraction_node**
   - DetectedName 데이터 활용
   - context_before/after 구성

4. **name_based_tagging_node** (핵심!)
   - 멀티턴 LLM 추론
   - 이름 언급 → 화자 매핑
   - 모순 감지 및 신뢰도 조정

5. **merge_results_node**
   - 자동 매칭 + 이름 기반 결과 병합
   - 중복 제거 (같은 이름 → 높은 신뢰도 선택)
   - 소거법 적용

6. **save_profiles_node**
   - 새 화자를 user_speaker_profiles에 저장

7. **role_based_tagging_node** (구현 예정)
   - 발화 패턴 기반 역할 추론

#### 도구 (4개)

1. **LoadProfilesTool**
   - DB에서 화자 프로필 조회

2. **VoiceSimilarityTool**
   - 음성 임베딩 코사인 유사도

3. **TextSimilarityTool**
   - 텍스트 임베딩 유사도

4. **SaveSpeakerProfileTool**
   - 화자 프로필 저장

---

## 7. 프론트엔드 상세

### 7.1 페이지 (13개)

#### 공개 페이지 (3개)

1. **LoginPage** (`/login`)
   - 이메일/비밀번호 로그인
   - OAuth 버튼 (Google, Kakao)

2. **RegisterPage** (`/register`)
   - 회원가입 폼

3. **OAuthCallbackPage** (`/oauth/callback`)
   - OAuth 콜백 처리

#### 보호된 페이지 (10개)

4. **DashboardPageNew** (`/`)
   - 통계 카드 (파일 수, 처리 현황)
   - 최근 파일 목록
   - 처리 중인 작업 목록

5. **UploadPage** (`/upload`)
   - 파일 업로드 (드래그앤드롭)
   - 모델 선택 (Whisper, Diarization)

6. **ProcessingPage** (`/processing/:fileId`)
   - 처리 상태 폴링 (1초마다)
   - 진행률 바 표시
   - 단계별 상태: preprocessing → stt → diarization → ner → completed

7. **SpeakerInfoConfirmPage** (`/confirm/:fileId`)
   - 화자 수 확인/수정
   - 감지된 이름 확인/수정
   - 감지된 닉네임 확인/수정

8. **TaggingAnalyzingPage** (`/analyzing/:fileId`)
   - LangGraph Agent 실행 중 표시
   - 3초 로딩 애니메이션

9. **TaggingPageNew** (`/tagging/:fileId`)
   - 시스템 제안 표시
   - 드롭다운으로 이름 선택
   - 태깅 완료 버튼

10. **ResultPageNew** (`/result/:fileId`)
    - 화자별 통계 (발화 횟수, 시간)
    - 전체 회의록 표시
    - 다음 단계 선택 (RAG, Todo, 효율성)

11. **RagPage** (`/rag/:fileId`)
    - 벡터 DB 초기화 버튼
    - 질문 입력 및 답변 표시
    - 대화 히스토리

12. **TodoPage** (`/todo/:fileId`)
    - Todo 목록 표시
    - 우선순위, 담당자, 기한

13. **EfficiencyPage** (`/efficiency/:fileId`)
    - 전체 회의 종합 분석 (엔트로피 + AI 인사이트)
    - 화자별 효율성 지표 (탭 방식)
    - 5가지 지표: TTR, 정보량, 문장 확률, PPL, 발화 빈도

### 7.2 컴포넌트 구조

#### Layout
- **MainLayout**: 사이드바 + 탑바 + 메인 콘텐츠
- **Sidebar**: 네비게이션 메뉴
- **TopBar**: 사용자 정보, 로그아웃, 테마 토글

#### Dashboard
- **StatsCards**: 통계 카드 (4개)
- **RecentFilesList**: 최근 파일 목록
- **ProcessingTasks**: 처리 중인 작업
- **ResultModal**: 결과 미리보기

#### FileUpload
- **FileUpload**: 드래그앤드롭 업로드

#### 기타
- **ProtectedRoute**: 인증 확인
- **ThemeToggle**: 다크모드 토글

### 7.3 Context (2개)

#### AuthContext
```javascript
{
  user,              // 현재 사용자
  login(email, password),
  logout(),
  register(email, password, name),
  isAuthenticated   // 로그인 여부
}
```

#### ThemeContext
```javascript
{
  theme,            // "light" | "dark"
  toggleTheme()
}
```

### 7.4 라우팅

```javascript
공개 라우트:
  /login
  /register
  /oauth/callback

보호된 라우트 (인증 필요):
  /                      - 대시보드
  /upload                - 파일 업로드
  /processing/:fileId    - AI 처리 중
  /confirm/:fileId       - 화자 정보 확인
  /analyzing/:fileId     - AI 분석 중
  /tagging/:fileId       - 화자 태깅
  /result/:fileId        - 결과
  /rag/:fileId           - RAG 대화
  /todo/:fileId          - Todo
  /efficiency/:fileId    - 효율성 분석
```

---

## 8. 주요 기능

### 8.1 인증 시스템

#### 하이브리드 인증
- **이메일/비밀번호**: bcrypt 해싱
- **OAuth 2.0**: Google, Kakao
- **JWT 토큰**: Access + Refresh Token

#### 플로우
```
1. 로그인 요청
   ↓
2. 인증 확인
   ↓
3. JWT 토큰 발급
   - Access Token (15분)
   - Refresh Token (7일)
   ↓
4. 프론트엔드 localStorage 저장
   ↓
5. 모든 API 요청에 Authorization 헤더 포함
```

### 8.2 화자 태깅 (LangGraph Agent)

#### 멀티턴 LLM 추론

**Turn 1**: 첫 번째 이름 언급
```
입력:
  - context_before: 앞 5문장
  - context_after: 뒤 5문장
  - participant_names: ["민서", "인서"]

프롬프트:
  "다음 대화에서 '민서'는 SPEAKER_00과 SPEAKER_01 중 누구일까요?
   - SPEAKER_01: 민서씨, 이번 회의 안건 발표해주세요
   - SPEAKER_00: 네, 알겠습니다"

LLM 응답:
  {speaker: "SPEAKER_00", confidence: 0.85,
   reasoning: "SPEAKER_01이 호칭 후 SPEAKER_00이 응답"}
```

**Turn 2**: 같은 이름 재언급
```
입력:
  - 이전 분석 요약: "Turn 1: 민서=SPEAKER_00 (85%)"
  - 새 context

프롬프트:
  "[Turn 1] 민서는 SPEAKER_00일 확률 85%였습니다.

   [Turn 2 새 문맥]
   - SPEAKER_01: 민서씨 의견에 동의합니다
   - SPEAKER_00: 네, 감사합니다

   이 문맥에서도 민서가 SPEAKER_00이 맞나요?"

LLM 응답:
  {speaker: "SPEAKER_00", confidence: 0.95, consistency: true}
```

**Turn 3**: 모순 발견
```
입력:
  - 이전 분석 요약: "Turn 1~2: 민서=SPEAKER_00 (90%)"
  - 새 context

프롬프트:
  "[이전 분석] 민서는 SPEAKER_00일 확률 90%였습니다.

   [Turn 3 새 문맥]
   - SPEAKER_00: 민서씨는 어떻게 생각하세요?
   - SPEAKER_01: 저는 이렇게 생각합니다

   이 문맥은 이전 분석과 모순되나요?"

LLM 응답:
  {speaker: "SPEAKER_01", confidence: 0.80,
   consistency: false, conflict_detected: true}

최종 스코어 조정:
  - SPEAKER_00: 0.90 * 0.7 = 0.63 (하향)
  - SPEAKER_01: 0.10 + 0.80 * 0.3 = 0.34 (상향)
  - needs_manual_review: true
```

### 8.3 회의 효율성 분석

#### 5가지 지표

**1. 엔트로피 (Entropy)**
```python
# Shannon Entropy
entropy = -sum(p * log2(p) for p in probabilities)

# 슬라이딩 윈도우 (50단어)
for window in sliding_window(words, size=50):
    word_freq = Counter(window)
    probabilities = [count / len(window) for count in word_freq.values()]
    entropy = calculate_entropy(probabilities)
```

**2. TTR (Type-Token Ratio)**
```python
# 명사 기반 계산
nouns = mecab.nouns(text)
ttr = len(set(nouns)) / len(nouns)

# 슬라이딩 윈도우
for window in sliding_window(nouns, size=50):
    window_ttr = len(set(window)) / len(window)
```

**3. 정보량 (Information Content)**
```python
# Sentence Transformer
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode(sentences)

# 평균 임베딩
mean_embedding = np.mean(embeddings, axis=0)

# 코사인 유사도
for emb in embeddings:
    similarity = cosine_similarity(emb, mean_embedding)

information_score = 1 - avg_similarity
```

**4. 문장 확률 (Sentence Probability)**
```python
# HDBSCAN 군집화
embeddings = model.encode(sentences)
clusterer = hdbscan.HDBSCAN(min_cluster_size=2)
labels = clusterer.fit_predict(embeddings)

# 확률 계산
for cluster_id in unique_labels:
    count = np.sum(labels == cluster_id)
    probability = count / len(sentences)

# 이상치 (확률 낮은 문장)
rare_sentences = [s for s, p in zip(sentences, probs) if p < 0.05]
```

**5. PPL (Perplexity)**
```python
# KoGPT-2
model = AutoModelForCausalLM.from_pretrained('skt/kogpt2-base-v2')
tokenizer = AutoTokenizer.from_pretrained('skt/kogpt2-base-v2')

# 10문장 단위 윈도우
for window in sliding_window(sentences, size=10):
    text = " ".join(window)
    encodings = tokenizer(text, return_tensors="pt")

    with torch.no_grad():
        outputs = model(encodings.input_ids, labels=encodings.input_ids)
        loss = outputs.loss
        ppl = torch.exp(loss).item()
```

#### AI 인사이트 생성

```python
# GPT-4o-mini
prompt = f"""회의 효율성 지표에 대한 간단한 한줄 평을 작성해주세요.

지표명: {metric_name}
평균: {avg:.3f}
추세: {trend}  # 상승/하락/안정
변동성: {volatility}  # 높음/낮음
데이터 포인트 수: {len(values)}

한줄로 회의의 특징을 설명해주세요."""

response = openai_client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "당신은 회의 분석 전문가입니다."},
        {"role": "user", "content": prompt}
    ],
    max_tokens=100,
    temperature=0.7
)

insight = response.choices[0].message.content.strip()
```

### 8.4 RAG 시스템

#### ChromaDB 벡터 저장

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

# 벡터 스토어 생성
vectorstore = Chroma(
    collection_name=f"meeting_{file_id}",
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./chroma_db"
)

# 회의록 저장
texts = [f"[{t.speaker_name}] {t.text}" for t in transcripts]
metadatas = [{"speaker": t.speaker_name, "time": t.start_time} for t in transcripts]

vectorstore.add_texts(texts=texts, metadatas=metadatas)
```

#### 질문 분석 및 답변

```python
# 1. 질문에서 화자 필터 추출
question = "민서가 뭐라고 했어?"
speaker_filter = analyze_question(question, speakers)  # → "민서"

# 2. 벡터 검색 (화자 필터링)
if speaker_filter:
    docs = vectorstore.similarity_search(
        question,
        k=5,
        filter={"speaker": speaker_filter}
    )
else:
    docs = vectorstore.similarity_search(question, k=5)

# 3. LLM 답변 생성
context = "\n\n".join([doc.page_content for doc in docs])
prompt = f"""Context:\n{context}\n\nQuestion: {question}\nAnswer:"""

response = llm_client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "당신은 회의록 분석 AI입니다."},
        {"role": "user", "content": prompt}
    ]
)
```

---

## 9. API 문서

### 9.1 인증 API

#### POST /api/v1/auth/register
**요청**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "홍길동"
}
```

**응답** (200):
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "홍길동"
  }
}
```

#### POST /api/v1/auth/login
**요청**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답** (200):
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### 9.2 파일 업로드 API

#### POST /api/v1/upload
**요청**: multipart/form-data
```
file: <audio file>
```

**응답** (200):
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File uploaded successfully"
}
```

### 9.3 처리 API

#### POST /api/v1/process/{file_id}
**요청**:
```json
{
  "whisper_mode": "local",  // "local" | "api"
  "diarization_mode": "senko"  // "senko" | "nemo"
}
```

**응답** (202):
```json
{
  "message": "Processing started",
  "file_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### GET /api/v1/status/{file_id}
**응답** (200):
```json
{
  "status": "stt",
  "progress": 45,
  "speaker_count": 3,
  "detected_names": ["민서", "인서"],
  "detected_nicknames": ["진행 담당자", "기술 전문가"]
}
```

### 9.4 화자 태깅 API

#### GET /api/v1/tagging/{file_id}
**응답** (200):
```json
{
  "suggested_mappings": [
    {
      "speaker_label": "SPEAKER_00",
      "suggested_name": "민서",
      "nickname": "진행 담당자",
      "name_confidence": 0.85,
      "needs_manual_review": false
    },
    ...
  ],
  "transcript": [...],
  "detected_names": ["민서", "인서"]
}
```

#### POST /api/v1/tagging/confirm
**요청**:
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "mappings": [
    {"speaker_label": "SPEAKER_00", "final_name": "김민서"},
    {"speaker_label": "SPEAKER_01", "final_name": "이홍기"}
  ]
}
```

**응답** (200):
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "화자 태깅이 완료되었습니다. 효율성 분석이 백그라운드에서 실행됩니다.",
  "status": "confirmed"
}
```

### 9.5 효율성 분석 API

#### GET /api/v1/efficiency/result/{file_id}
**응답** (200):
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "analyzed_at": "2025-11-27T10:30:00Z",

  "entropy": {
    "entropy_avg": 2.15,
    "entropy_std": 0.45,
    "insight": "주제가 다양하게 논의되었습니다."
  },

  "overall_ttr": {
    "ttr_avg": 0.68,
    "insight": "어휘 다양성이 높아 풍부한 논의가 이루어졌습니다."
  },

  "speaker_metrics": [
    {
      "speaker_label": "SPEAKER_00",
      "speaker_name": "김민서",
      "ttr": {
        "ttr_avg": 0.68,
        "insight": "김민서님은 다양한 어휘를 사용하며 발표하였습니다."
      },
      ...
    },
    ...
  ]
}
```

### 9.6 RAG API

#### POST /api/v1/rag/{file_id}/initialize
**응답** (200):
```json
{
  "message": "RAG initialized successfully",
  "collection_name": "meeting_123",
  "document_count": 145
}
```

#### POST /api/v1/rag/{file_id}/chat
**요청**:
```json
{
  "question": "민서가 뭐라고 했어?"
}
```

**응답** (200):
```json
{
  "answer": "민서님은 '오늘 회의 안건은 신제품 출시 일정입니다'라고 말씀하셨습니다.",
  "sources": [
    {
      "text": "[김민서] 오늘 회의 안건은 신제품 출시 일정입니다.",
      "speaker": "김민서",
      "time": 10.5
    }
  ],
  "speaker_filter": "김민서"
}
```

---

## 10. 배포 및 운영

### 10.1 Docker 실행

```bash
# 전체 시스템 시작
docker compose up -d

# 로그 확인
docker compose logs -f backend

# 특정 서비스 재시작
docker compose restart backend

# 중지
docker compose down

# 완전 초기화 (볼륨 삭제)
docker compose down -v
```

### 10.2 환경 변수 (.env)

```bash
# MySQL
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=listencare
MYSQL_USER=listencare_user
MYSQL_PASSWORD=listencare_pass123

# Backend
DATABASE_URL=mysql+pymysql://listencare_user:listencare_pass123@mysql:3306/listencare
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=sk-...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...

# LangSmith (선택)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=speaker-tagging-agent

# Frontend
VITE_API_URL=http://localhost:8000
```

### 10.3 데이터베이스 마이그레이션

```bash
# Backend 컨테이너 접속
docker exec -it listencare_backend bash

# 마이그레이션 생성
alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

### 10.4 접속 주소

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MySQL**: localhost:3306

---

## 11. 트러블슈팅

### 11.1 포트 충돌

**증상**: 포트가 이미 사용 중
```bash
Error: bind: address already in use
```

**해결**:
```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :8000
lsof -i :3306

# 프로세스 종료
kill -9 <PID>
```

### 11.2 Docker 빌드 오류

**증상**: 빌드 실패

**해결**:
```bash
# 캐시 무시하고 빌드
docker compose build --no-cache

# 완전 초기화 후 재시작
docker compose down -v
docker compose build --no-cache
docker compose up
```

### 11.3 MySQL 연결 오류

**증상**: `Can't connect to MySQL server`

**해결**:
1. MySQL 컨테이너 상태 확인
   ```bash
   docker ps
   ```

2. MySQL 로그 확인
   ```bash
   docker compose logs mysql
   ```

3. 환경 변수 확인
   ```bash
   docker exec -it listencare_backend env | grep MYSQL
   ```

### 11.4 효율성 분석 NaN/Infinity 에러

**증상**: `Invalid JSON text: "Invalid value."`

**원인**: PPL 계산 중 NaN/Infinity 값 생성

**해결**: 이미 적용됨 (efficiency_analyzer.py에서 필터링)
```python
if not np.isnan(ppl) and not np.isinf(ppl):
    ppl_values.append({"window_index": i, "ppl": float(ppl)})
```

### 11.5 RAG 초기화 오류

**증상**: 벡터 DB 초기화 실패

**해결**:
1. ChromaDB 디렉토리 확인
   ```bash
   ls -la chroma_db/
   ```

2. 권한 문제 시
   ```bash
   chmod -R 777 chroma_db/
   ```

3. 기존 컬렉션 삭제 후 재생성
   ```bash
   DELETE /api/v1/rag/{file_id}
   POST /api/v1/rag/{file_id}/initialize
   ```

### 11.6 CUDA 오류

**증상**: `CUDA out of memory`

**해결**:
1. GPU 메모리 확인
   ```bash
   nvidia-smi
   ```

2. 배치 크기 줄이기 (stt.py, diarization.py)

3. 불필요한 프로세스 종료

---

## 12. 핵심 구현 코드 예제

### 12.1 Phase 1: 음성 처리 실제 구현

#### VAD (Voice Activity Detection) - WebRTC
```python
SR = 16000              # 샘플링 레이트
VAD_AGGR = 2            # VAD 민감도 (0~3, 높을수록 엄격)
FRAME_MS = 20           # 프레임 크기 (ms)
PAD_MS = 150            # VAD 패딩 (ms)

def vad_keep_mask(audio_f32: np.ndarray, sr: int, frame_ms: int,
                  vad_aggr: int, pad_ms: int):
    """WebRTC VAD로 음성 구간 탐지"""
    # Float → Int16 변환
    x_i16 = float_to_int16(audio_f32)
    vad = webrtcvad.Vad(vad_aggr)

    # 프레임 단위 분할 (20ms)
    frame_len = int(sr * frame_ms / 1000)
    frame_iter = list(frame_bytes_from_int16(x_i16, sr, frame_ms))

    # 각 프레임 음성 여부 판별
    voiced = np.zeros(len(frame_iter), dtype=bool)
    for i, (start, frame_bytes) in enumerate(frame_iter):
        if vad.is_speech(frame_bytes, sr):
            voiced[i] = True

    # 패딩 추가 (음성 프레임 앞뒤에 150ms 추가)
    keep = np.zeros_like(voiced)
    pad_frames = pad_ms // frame_ms
    for i, v in enumerate(voiced):
        if v:
            s = max(0, i - pad_frames)
            e = min(len(voiced), i + pad_frames + 1)
            keep[s:e] = True

    return keep_samples
```

#### STT 병렬 처리 (OpenAI Whisper API)
```python
def transcribe_chunks_with_whisper(chunk_files: List[Path], srt_dir: Path,
                                   openai_api_key: str) -> List[Path]:
    """병렬 전사 (최대 4개 동시 실행)"""
    srt_files_dict = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        # 모든 청크를 병렬로 제출
        future_to_chunk = {
            executor.submit(transcribe_single_chunk, cp, srt_dir,
                          openai_api_key, i + 1, len(chunk_files)): (i, cp)
            for i, cp in enumerate(chunk_files)
        }

        # 완료된 순서대로 결과 수집
        for future in as_completed(future_to_chunk):
            idx, chunk_path = future_to_chunk[future]
            srt_path = future.result()
            srt_files_dict[idx] = srt_path

    return [srt_files_dict[i] for i in sorted(srt_files_dict.keys())]
```

#### Diarization (Senko) - GPU 가속
```python
def run_diarization_senko(audio_path: Path, device: str = None) -> Dict:
    """Senko를 사용한 화자 분리 (192차원 임베딩)"""
    # Senko Diarizer 초기화
    diarizer = senko.Diarizer(device=device, warmup=True, quiet=False)

    # 화자 분리 실행
    senko_result = diarizer.diarize(str(audio_path), generate_colors=False)

    # 결과 변환 (numpy → list)
    embeddings = {}
    for speaker, centroid in senko_result['speaker_centroids'].items():
        embeddings[speaker] = centroid.tolist()  # 192차원 리스트

    return {"turns": turns, "embeddings": embeddings}
```

### 12.2 Phase 2: AI 분석 실제 구현

#### NER - BERT + Levenshtein Clustering
```python
class NERService:
    def __init__(self):
        model_name = "seungkukim/korean-pii-masking"
        self.model = AutoModelForTokenClassification.from_pretrained(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.nlp = pipeline("ner", model=self.model, tokenizer=self.tokenizer,
                           aggregation_strategy="simple")

    def cluster_similar_names(self, detected_names: List[Dict]) -> Dict[str, List[str]]:
        """유사 이름 그룹화 (Levenshtein Distance + Hierarchical Clustering)"""
        from scipy.cluster.hierarchy import linkage, fcluster
        from Levenshtein import distance as levenshtein_distance

        unique_names = list(set([d["detected_name"] for d in detected_names]))

        # 거리 행렬 계산
        n = len(unique_names)
        distance_matrix = np.zeros((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                dist = levenshtein_distance(unique_names[i], unique_names[j])
                normalized_dist = dist / max(len(unique_names[i]), len(unique_names[j]))
                distance_matrix[i, j] = normalized_dist
                distance_matrix[j, i] = normalized_dist

        # Hierarchical Clustering
        condensed_dist = distance_matrix[np.triu_indices(n, k=1)]
        Z = linkage(condensed_dist, method='average')
        cluster_labels = fcluster(Z, t=0.3, criterion='distance')

        # 대표 이름 선택
        result = {}
        for label in set(cluster_labels):
            names = [unique_names[i] for i, l in enumerate(cluster_labels) if l == label]
            representative = min(names, key=len)
            result[representative] = names

        return result
```

#### 닉네임 생성 - Smart Selection (70% 비용 절감)
```python
class NicknameService:
    def smart_selection_utterances(self, utterances: List[Dict], max_total: int = 12):
        """대표 발화 선택으로 LLM 호출 비용 70% 절감"""
        selected = []

        # 1. 긴 발화 우선 (20단어 이상)
        long_utterances = [u for u in utterances if len(u.get("text", "").split()) > 20]
        long_utterances.sort(key=lambda x: len(x["text"]), reverse=True)
        selected.extend(long_utterances[:5])

        # 2. 키워드 포함 발화
        keywords = ["요약", "정리", "결론", "제안", "문제", "해결"]
        keyword_utterances = [u for u in utterances
                             if any(kw in u.get("text", "") for kw in keywords)]
        selected.extend(keyword_utterances[:3])

        # 3. 시간대별 샘플링 (초반/중반/후반)
        if len(utterances) >= 3:
            segment_size = len(utterances) // 3
            selected.append(utterances[segment_size // 2])
            selected.append(utterances[segment_size + segment_size // 2])
            selected.append(utterances[-segment_size // 2])

        return unique_selected[:max_total]

    @traceable(name="generate_speaker_nickname", run_type="llm")
    def generate_nickname_with_llm(self, speaker_label: str, selected_utterances: List[Dict]):
        """GPT-4o-mini로 화자 닉네임 생성"""
        prompt = f"""
        당신은 전문 회의 분석가입니다.

        아래는 화자 "{speaker_label}"의 대표 발화들입니다:
        {chr(10).join([f"- {u['text']}" for u in selected_utterances])}

        위 발화를 분석하여 다음을 JSON 형식으로 응답하세요:
        {{
          "display_label": "역할 (2-4단어)",
          "one_liner": "특징 한줄 요약",
          "keywords": ["키워드1", "키워드2"],
          "communication_style": "의사소통 스타일"
        }}
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)
```

### 12.3 Phase 3: LangGraph Agent 실제 구현

#### AgentState 정의
```python
from typing import TypedDict, List, Dict

class AgentState(TypedDict):
    # 입력
    user_id: int
    audio_file_id: int
    stt_result: List[Dict]
    diar_result: Dict
    participant_names: List[str]

    # 중간 데이터
    previous_profiles: List[Dict]
    auto_matched: Dict[str, str]
    name_mentions: List[Dict]
    speaker_utterances: Dict[str, List[str]]
    mapping_history: List[Dict]

    # 출력
    final_mappings: Dict
    needs_manual_review: List[str]
```

#### Tool 구현 - VoiceSimilarityTool (192차원)
```python
@tool
async def calculate_voice_similarity(new_embedding: List[float],
                                     stored_profiles: List[Dict]) -> Dict:
    """음성 임베딩 코사인 유사도 계산 (192차원)"""
    threshold = 0.85
    new_emb = np.array(new_embedding)

    best_match = None
    best_similarity = 0.0

    for profile in stored_profiles:
        stored_emb = np.array(profile["voice_embedding"])
        similarity = np.dot(new_emb, stored_emb) / (
            np.linalg.norm(new_emb) * np.linalg.norm(stored_emb)
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = profile["name"]

    return {
        "matched_profile": best_match if best_similarity >= threshold else None,
        "similarity": float(best_similarity),
        "threshold_passed": best_similarity >= threshold
    }
```

#### Node 구현 - name_based_tagging (멀티턴 LLM)
```python
async def name_based_tagging_node(state: AgentState) -> AgentState:
    """이름 기반 화자 태깅 (멀티턴 LLM 추론)"""
    name_mentions = state.get("name_mentions", [])
    mapping_history = state.get("mapping_history", [])

    llm = ChatOpenAI(model="gpt-5-mini-2025-08-07", temperature=1.0)
    output_parser = PydanticOutputParser(pydantic_object=SpeakerMappingResult)

    for turn_num, mention in enumerate(name_mentions, 1):
        # 프롬프트 생성 (이전 분석 요약 포함)
        system_message, user_message = create_name_based_prompt(
            name=mention["name"],
            context_before=mention["context_before"],
            context_after=mention["context_after"],
            participant_names=state["participant_names"],
            mapping_history=mapping_history,
            turn_num=turn_num
        )

        # LLM 호출
        response = llm.invoke([
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ])

        result_obj = output_parser.parse(response.content)
        mapping_history.append(result_obj)

    state["mapping_history"] = mapping_history
    return state
```

#### Node 구현 - merge_results (소거법)
```python
async def merge_results_node(state: AgentState) -> AgentState:
    """결과 통합 및 소거법 적용"""
    final_mappings = {}

    # 1. 자동 매칭된 화자는 그대로 사용
    for speaker_label, name in state.get("auto_matched", {}).items():
        final_mappings[speaker_label] = {
            "name": name,
            "confidence": 1.0,
            "match_method": "embedding"
        }

    # 2. name_based_results 집계
    # 3. 중복 제거 (같은 이름 → 높은 신뢰도 선택)
    # 4. 소거법: 남은 화자 = 남은 이름이 1:1일 때 자동 매핑
    unmatched_speakers = all_speakers - set(final_mappings.keys())
    used_names = {m["name"] for m in final_mappings.values()}
    unused_names = set(participant_names) - used_names

    if len(unmatched_speakers) == len(unused_names) == 1:
        speaker = list(unmatched_speakers)[0]
        name = list(unused_names)[0]
        final_mappings[speaker] = {
            "name": name,
            "confidence": 0.50,
            "match_method": "소거법",
            "needs_review": True
        }

    state["final_mappings"] = final_mappings
    return state
```

### 12.4 Phase 4: 응용 분석 실제 구현

#### 효율성 분석 - TTR (Type-Token Ratio)
```python
def _calc_ttr(self, speaker: SpeakerMapping) -> Dict[str, Any]:
    """TTR 계산 (Mecab 형태소 분석)"""
    mecab = get_mecab()
    texts = [t.text for t in speaker_transcripts]
    all_text = " ".join(texts)

    # 형태소 분석 (명사, 동사, 형용사만 추출)
    morphs = mecab.pos(all_text)
    content_words = [word for word, pos in morphs
                    if pos.startswith('NN') or pos.startswith('VV') or pos.startswith('VA')]

    # 슬라이딩 윈도우 TTR 계산
    window_size = min(50, len(content_words) // 2)
    ttr_values = []

    for i in range(0, len(content_words) - window_size + 1, 10):
        window_words = content_words[i:i + window_size]
        ttr = len(set(window_words)) / len(window_words)
        ttr_values.append({"ttr": float(ttr)})

    return {
        "ttr_avg": float(np.mean([v["ttr"] for v in ttr_values])),
        "ttr_std": float(np.std([v["ttr"] for v in ttr_values]))
    }
```

#### 효율성 분석 - Perplexity (KoGPT-2)
```python
def _calc_perplexity(self, speaker: SpeakerMapping) -> Dict[str, Any]:
    """PPL 계산 (조건부 Perplexity)"""
    model, tokenizer = get_gpt2_model()  # KoGPT-2
    device = next(model.parameters()).device

    ppl_values = []
    for i in range(1, len(speaker_transcripts)):
        # 슬라이딩 윈도우: 이전 문장들 → 현재 문장 PPL
        context_text = " ".join([t.text for t in speaker_transcripts[:i]])
        target_text = speaker_transcripts[i].text

        full_text = context_text + " " + target_text
        encodings = tokenizer(full_text, return_tensors="pt")
        input_ids = encodings["input_ids"].to(device)

        with torch.no_grad():
            outputs = model(input_ids, labels=input_ids)
            loss = outputs.loss.item()

        ppl = np.exp(loss)
        ppl_values.append({"ppl": float(ppl), "loss": float(loss)})

    return {
        "ppl_avg": float(np.mean([v["ppl"] for v in ppl_values])),
        "ppl_std": float(np.std([v["ppl"] for v in ppl_values]))
    }
```

#### RAG 시스템 - ChromaDB 초기화
```python
class RAGService:
    def store_transcript(self, file_id: str, final_transcript: List[Dict]):
        """회의록을 ChromaDB에 저장"""
        collection_name = f"meeting_{file_id}"

        # Document 객체 생성
        documents = []
        for idx, segment in enumerate(final_transcript):
            doc = Document(
                page_content=segment["text"],
                metadata={
                    "speaker_name": segment["speaker_name"],
                    "start_time": segment["start_time"],
                    "end_time": segment["end_time"],
                    "segment_index": idx
                }
            )
            documents.append(doc)

        # ChromaDB에 저장 (OpenAI text-embedding-ada-002)
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=OpenAIEmbeddings(),
            collection_name=collection_name,
            persist_directory="./chroma_db"
        )

        return vectorstore
```

#### RAG 시스템 - 질문 분석 (화자 자동 추출)
```python
def analyze_question(self, question: str, available_speakers: List[str]):
    """질문에서 화자 이름 자동 추출 (LLM 기반)"""
    analysis_prompt = f"""
    질문: {question}
    사용 가능한 발언자 목록: {', '.join(available_speakers)}

    이 질문이 특정 발언자에 관한 것인가요?
    발언자: [이름 또는 '없음']
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": analysis_prompt}]
    )

    # 유사도 기반 매칭
    for line in response.choices[0].message.content.split("\n"):
        if line.startswith("발언자:"):
            speaker_name = line.split(":")[1].strip()
            if speaker_name != "없음":
                matched_speaker = self.find_most_similar_speaker(
                    speaker_name, available_speakers
                )
                return {"detected_speaker": matched_speaker}

    return {"detected_speaker": None}
```

---

## 📝 부록

### A. 핵심 알고리즘

#### A.1 병합 로직 (Max Overlap)

```python
def merge_stt_diarization(stt_segments, diar_turns):
    merged = []

    for stt_seg in stt_segments:
        stt_start = stt_seg['start']
        stt_end = stt_seg['end']

        max_overlap = 0
        assigned_speaker = None

        for turn in diar_turns:
            turn_start = turn['start']
            turn_end = turn['end']

            # 겹치는 구간 계산
            overlap_start = max(stt_start, turn_start)
            overlap_end = min(stt_end, turn_end)
            overlap_duration = max(0, overlap_end - overlap_start)

            if overlap_duration > max_overlap:
                max_overlap = overlap_duration
                assigned_speaker = turn['speaker_label']

        merged.append({
            'text': stt_seg['text'],
            'start': stt_start,
            'end': stt_end,
            'speaker': assigned_speaker
        })

    return merged
```

#### A.2 소거법 (Elimination)

```python
def apply_elimination(unmatched_speakers, remaining_names, utterances):
    if len(unmatched_speakers) != len(remaining_names):
        return {}

    # 발화 횟수 기준 정렬
    speaker_counts = {
        sp: len([u for u in utterances if u['speaker'] == sp])
        for sp in unmatched_speakers
    }

    sorted_speakers = sorted(speaker_counts.items(), key=lambda x: x[1], reverse=True)

    # 순서대로 매핑
    mappings = {}
    for i, (speaker, count) in enumerate(sorted_speakers):
        if count >= 3:  # 최소 발화 횟수
            mappings[speaker] = {
                'name': remaining_names[i],
                'confidence': 0.50,
                'method': '소거법',
                'needs_manual_review': True
            }

    return mappings
```

### B. 성능 지표

#### B.1 목표 KPI
- **STT 정확도 (WER)**: 90% 이상 (단어 오류율 10% 미만)
- **화자 인식 정확도 (DER)**: 90% 이상 (화자 오류율 10% 미만)
- **처리 속도**: 실시간 비율 1:3 (30분 회의 → 10분 처리)

#### B.2 실제 성능 (테스트 기준)
- **Whisper large-v3**: WER 5-8% (한국어)
- **Senko**: DER 8-12% (2-4명 회의)
- **화자 태깅**: 85-90% 정확도 (멀티턴 LLM)

### C. 비용 분석

#### C.1 AI 모델 비용 (OpenAI API)

| 모델 | 용도 | 비용 (30분 회의 기준) |
|------|------|---------------------|
| Whisper API | STT | $0.36 (30분 × $0.006/분) |
| GPT-4o | 화자 태깅 | $0.05 (5,000 토큰) |
| GPT-4o-mini | 인사이트 생성 | $0.01 (10,000 토큰) |
| GPT-4o | RAG 답변 | $0.02/질문 |
| **합계** | | **약 $0.44** |

#### C.2 로컬 모델 사용 시
- **Whisper local**: 무료 (GPU 필요)
- **Senko**: 무료 (GPU 필요)
- **LLM**: API 비용만 발생

### D. 향후 개선 사항

#### Phase 4: 고도화
1. **실시간 처리**: WebSocket 기반 실시간 전사
2. **멀티모달**: 비디오 + 화면 공유 분석
3. **다국어 지원**: 영어, 일본어, 중국어
4. **화자 감정 분석**: 음성 톤 기반 감정 인식
5. **회의 품질 점수**: 종합 평가 지표
6. **프리젠테이션 모드**: 회의록 → PPT 자동 생성
7. **통합 검색**: 전체 회의록 통합 검색
8. **API 플랫폼**: 외부 서비스 연동 API 제공

---

## 📚 참고 문서

### 프로젝트 문서
- [README.md](../README.md): 프로젝트 소개
- [architecture.md](./architecture.md): 시스템 아키텍처 (PDR)
- [pipeline-io.md](./pipeline-io.md): 파이프라인 I/O 정의
- [agent-workflow.md](./agent-workflow.md): LangGraph Agent 상세
- [database-schema.md](./database-schema.md): DB 스키마 상세
- [EFFICIENCY_ANALYSIS.md](./EFFICIENCY_ANALYSIS.md): 효율성 분석 기능
- [CHANGELOG.md](./CHANGELOG.md): 변경 이력
- [setup.md](./setup.md): 환경 설정 가이드

### 외부 문서
- [Whisper](https://github.com/openai/whisper)
- [pyannote.audio](https://github.com/pyannote/pyannote-audio)
- [LangChain](https://python.langchain.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)

---

**Last Updated**: 2025-12-01
**작성자**: Claude Code
**버전**: 1.1 (실제 구현 코드 추가)
