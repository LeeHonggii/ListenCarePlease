# Database Schema Design

## ERD (Entity Relationship Diagram)

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴──────────────┐
│   audio_files       │
└──────┬──────────────┘
       │ 1
       ├──────────────────┬──────────────────┬──────────────────┬──────────────────┐
       │ N                │ N                │ N                │ N                │ 1
┌──────┴─────────┐ ┌─────┴──────────┐ ┌────┴────────────┐ ┌──┴──────────────┐ ┌──┴──────────────┐
│ preprocessing_ │ │  stt_results   │ │ diarization_    │ │ detected_names  │ │ user_           │
│ results        │ └────────────────┘ │ results         │ └─────────────────┘ │ confirmations   │
└────────────────┘                    └─────────────────┘                      └─────────────────┘
                                             │ 1
                                             │
                                             │ N
                                      ┌──────┴──────────┐
                                      │ speaker_        │
                                      │ mappings        │
                                      └─────────────────┘
                                             │ 1
                                             │
                                             │ N
                                      ┌──────┴──────────┐
                                      │ final_          │
                                      │ transcripts     │
                                      └─────────────────┘
                                             │ 1
                                             │
                                             │ N
                                      ┌──────┴──────────┐
                                      │ summaries       │
                                      └─────────────────┘
```

---

## 테이블 상세 정의

### 1. users (사용자)
하이브리드 인증 지원 (이메일 + 소셜 로그인)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 사용자 ID |
| email | VARCHAR(255) | 이메일 (nullable - 소셜 전용 계정) |
| password_hash | VARCHAR(255) | 비밀번호 해시 (nullable - 소셜 전용) |
| full_name | VARCHAR(100) | 사용자 이름 |
| oauth_provider | ENUM('google', 'kakao', 'github') | OAuth 제공자 (nullable) |
| oauth_id | VARCHAR(255) | OAuth 고유 ID (nullable) |
| is_active | BOOLEAN | 활성화 상태 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

**제약 조건:**
- `email` + `oauth_provider` 조합 UNIQUE
- `oauth_provider` + `oauth_id` 조합 UNIQUE

**코드 위치:** [backend/app/models/user.py](../backend/app/models/user.py)

---

### 2. audio_files (오디오 파일)
업로드된 원본 파일 정보

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 파일 ID |
| user_id | INT (FK) | 사용자 ID |
| original_filename | VARCHAR(255) | 원본 파일명 |
| file_path | VARCHAR(500) | 저장 경로 |
| file_size | BIGINT | 파일 크기 (bytes) |
| duration | FLOAT | 오디오 길이 (초) |
| mimetype | VARCHAR(50) | MIME 타입 (audio/mp3, audio/m4a 등) |
| status | ENUM('uploaded', 'processing', 'completed', 'failed') | 처리 상태 |
| created_at | TIMESTAMP | 업로드 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

**Relationships:**
- `user` → User (Many-to-One)
- `preprocessing_result` → PreprocessingResult (One-to-One)
- `stt_results` → STTResult (One-to-Many)
- `diarization_results` → DiarizationResult (One-to-Many)
- `detected_names` → DetectedName (One-to-Many)
- `speaker_mappings` → SpeakerMapping (One-to-Many)
- `user_confirmation` → UserConfirmation (One-to-One)
- `final_transcripts` → FinalTranscript (One-to-Many)
- `summaries` → Summary (One-to-Many)

**코드 위치:** [backend/app/models/audio_file.py](../backend/app/models/audio_file.py)

---

### 3. preprocessing_results (전처리 결과)
I,O.md Step 2 결과 - VAD + 노이즈 제거

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 전처리 결과 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID (UNIQUE) |
| stt_input_path | VARCHAR(500) | VAD 적용 파일 경로 (STT용) |
| diar_input_path | VARCHAR(500) | VAD + 노이즈 제거 파일 경로 (화자분리용) |
| processing_time | FLOAT | 처리 시간 (초) |
| created_at | TIMESTAMP | 생성 시간 |

**관계:** audio_file_id는 1:1 관계 (UNIQUE 제약)

**코드 위치:** [backend/app/models/preprocessing.py](../backend/app/models/preprocessing.py)

---

### 4. stt_results (STT 결과)
I,O.md Step 3 결과 - 단어별 타임스탬프

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | STT 결과 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| word_index | INT | 단어 순서 |
| text | VARCHAR(100) | 단어/텍스트 |
| start_time | FLOAT | 시작 시간 (초) |
| end_time | FLOAT | 종료 시간 (초) |
| confidence | FLOAT | 신뢰도 (0.0~1.0) |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:**
- `audio_file_id` (단일)
- `audio_file_id`, `word_index` (복합)

**코드 위치:** [backend/app/models/stt.py](../backend/app/models/stt.py)

---

### 5. diarization_results (화자 분리 결과)
I,O.md Step 4 결과 - 화자별 타임스탬프 + 임베딩

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 화자 분리 결과 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| speaker_label | VARCHAR(50) | 화자 레이블 (SPEAKER_00, SPEAKER_01...) |
| start_time | FLOAT | 시작 시간 (초) |
| end_time | FLOAT | 종료 시간 (초) |
| embedding | JSON | 음성 임베딩 벡터 (배열, 192차원) |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:**
- `audio_file_id` (단일)
- `audio_file_id`, `speaker_label` (복합)

**임베딩 형식:** `[0.12, -0.45, 0.78, ...]` (Senko 기반 192차원 벡터)

**코드 위치:** [backend/app/models/diarization.py](../backend/app/models/diarization.py)

---

### 6. detected_names (감지된 이름)
I,O.md Step 5a~5c 결과 - NER + 멀티턴 LLM 추론

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 감지 이름 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| detected_name | VARCHAR(100) | 감지된 이름 ("민서씨", "김팀장님" 등) |
| speaker_label | VARCHAR(50) | 연관된 화자 레이블 (SPEAKER_00 등) |
| time_detected | FLOAT | 이름이 언급된 시간 (초) |
| confidence | FLOAT | 해당 언급의 신뢰도 (0.0~1.0) |
| similarity_score | FLOAT | 음성 임베딩 유사도 (동일인 판별용) |
| context_before | JSON | 이름 언급 전 5문장 문맥 |
| context_after | JSON | 이름 언급 후 5문장 문맥 |
| llm_reasoning | TEXT | LLM 추론 근거 |
| is_consistent | BOOLEAN | 이전 추론과 일치 여부 |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:**
- `audio_file_id` (단일)
- `detected_name` (단일)

**참고:**
- 같은 이름이 여러 번 언급되면 여러 행이 생성됨 (멀티턴 추적용)
- `context_before/after` 형식: `["문장1", "문장2", ...]`
- `is_consistent`는 멀티턴 추론 중 이전 결과와 비교하여 설정

**코드 위치:** [backend/app/models/tagging.py](../backend/app/models/tagging.py#L7-L36)

---

### 7. user_confirmations (사용자 확정 정보)
**새로 추가된 테이블** - 화자 수 및 이름/닉네임 확정

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 확정 정보 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID (UNIQUE) |
| confirmed_speaker_count | INT | 사용자가 확정한 화자 수 |
| confirmed_names | JSON | 사용자가 확정한 이름 리스트 |
| confirmed_nicknames | JSON | 사용자가 확정한 닉네임 리스트 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

**관계:** audio_file_id는 1:1 관계 (UNIQUE 제약)

**JSON 형식:**
```json
{
  "confirmed_names": ["민서", "재형", "지수"],
  "confirmed_nicknames": ["진행 담당자", "기술 전문가", "디자인 리드"]
}
```

**사용 시나리오:**
1. STT + Diarization 완료 후 사용자에게 화자 수 확인 요청
2. 사용자가 화자 수, 이름, 닉네임을 확정
3. 이 정보를 기반으로 LangGraph Agent가 자동 매핑 수행

**코드 위치:** [backend/app/models/user_confirmation.py](../backend/app/models/user_confirmation.py)

---

### 8. speaker_mappings (화자 태깅 결과)
I,O.md Step 5d~5e 결과 - 하이브리드 방식 (이름 + 역할 + 닉네임)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 매핑 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| speaker_label | VARCHAR(50) | 화자 레이블 (SPEAKER_00 등) |
| **suggested_name** | VARCHAR(100) | 시스템 제안 이름 (nullable) |
| name_confidence | FLOAT | 이름 태깅 신뢰도 (멀티턴 LLM 최종 스코어) |
| name_mentions | INT | 이름 언급 횟수 (0이면 이름 감지 안됨) |
| **suggested_role** | VARCHAR(50) | 시스템 제안 역할 (nullable) |
| role_confidence | FLOAT | 역할 추론 신뢰도 |
| **nickname** | VARCHAR(100) | LLM이 생성한 닉네임 (nullable) |
| **nickname_metadata** | JSON | 닉네임 생성 메타데이터 |
| conflict_detected | BOOLEAN | 모순 발견 여부 (default: false) |
| needs_manual_review | BOOLEAN | 수동 확인 필요 (default: false) |
| **final_name** | VARCHAR(100) | 사용자 확정 최종 이름 |
| is_modified | BOOLEAN | 사용자가 수정했는지 여부 (default: false) |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

**제약 조건:** `audio_file_id` + `speaker_label` UNIQUE

**nickname_metadata 형식:**
```json
{
  "display_label": "진행 담당자",
  "one_liner": "회의를 이끌어가는 진행자",
  "keywords": ["진행", "조율", "안건"],
  "generation_method": "llm",
  "selected_utterances": [5, 12, 23]
}
```

**추가 설명:**
- **3가지 태깅 방식 지원:**
  1. **이름 기반 태깅**: `suggested_name` + `name_confidence` (멀티턴 LLM 추론)
  2. **역할 기반 태깅**: `suggested_role` + `role_confidence`
  3. **닉네임 태깅**: `nickname` + `nickname_metadata` (LLM 기반 자동 생성)

- **플래그 설명:**
  - `name_confidence=null` → 이름 기반 태깅 미수행 (이름 감지 실패)
  - `conflict_detected=true` → UI에서 경고 표시 권장
  - `needs_manual_review=true` → 사용자 필수 확인 요청

**코드 위치:** [backend/app/models/tagging.py](../backend/app/models/tagging.py#L39-L85)

---

### 9. final_transcripts (최종 대본)
I,O.md Step 5f 결과 - 화자명이 태깅된 최종 결과

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 대본 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| segment_index | INT | 발화 순서 |
| speaker_name | VARCHAR(100) | 화자 이름 ("김민서", "박철수" 등) |
| start_time | FLOAT | 시작 시간 (초) |
| end_time | FLOAT | 종료 시간 (초) |
| text | TEXT | 발화 내용 |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:**
- `audio_file_id` (단일)
- `audio_file_id`, `segment_index` (복합)

**코드 위치:** [backend/app/models/transcript.py](../backend/app/models/transcript.py#L8-L38)

---

### 10. summaries (요약 결과)
I,O.md Step 6 결과 - 요약/자막

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 요약 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| summary_type | ENUM('summary', 'subtitle') | 요약 유형 |
| content | TEXT | 요약 내용 또는 자막 파일 경로 |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:** `audio_file_id` (단일)

**코드 위치:** [backend/app/models/transcript.py](../backend/app/models/transcript.py#L41-L65)

---

## 데이터 흐름 예시

### 전체 파이프라인
```
1. 사용자 audio.mp3 업로드
   → audio_files 테이블에 기록 (status='uploaded')

2. 전처리 수행
   → preprocessing_results에 2개 파일 경로 저장
   → audio_files.status = 'processing'

3. STT 수행 (Whisper)
   → stt_results에 단어별 결과 저장 (N개 행)

4. Diarization 수행 (Senko)
   → diarization_results에 화자별 결과 + 임베딩 저장 (M개 행)

5. NER 수행 (Korean PII Masking)
   → detected_names에 "민서씨", "인서씨" 저장

6. 사용자 확정 (SpeakerInfoConfirmPage)
   → user_confirmations에 화자 수, 이름, 닉네임 저장
   → confirmed_speaker_count=3
   → confirmed_names=["민서", "재형", "지수"]
   → confirmed_nicknames=["진행자", "발표자", "질문자"]

7. LangGraph Agent 실행
   → detected_names 분석 (멀티턴 LLM 추론)
   → 닉네임 자동 생성 (LLM)
   → speaker_mappings에 제안 저장
     - SPEAKER_00: suggested_name="김민서", nickname="진행 담당자"
     - SPEAKER_01: suggested_name="이재형", nickname="기술 전문가"
     - SPEAKER_02: suggested_name="박지수", nickname="디자인 리드"

8. 사용자 확정 (TaggingPageNew)
   → speaker_mappings 업데이트
     - final_name="김민서", is_modified=false
     - final_name="이재형", is_modified=false
     - final_name="박지수", is_modified=true

9. 최종 병합
   → final_transcripts에 화자명 포함 대본 저장
   → audio_files.status = 'completed'

10. 요약 생성 (선택)
   → summaries에 저장
```

### 멀티턴 LLM 추론 흐름 (name_based_tagging)
```sql
-- 1. detected_names에 여러 언급 저장
INSERT INTO detected_names (detected_name, speaker_label, time_detected, context_before, context_after, llm_reasoning, is_consistent)
VALUES
  ('민서씨', 'SPEAKER_00', 12.5, [...], [...], 'SPEAKER_01이 SPEAKER_00을 "민서씨"라고 호칭', true),
  ('민서씨', 'SPEAKER_00', 45.2, [...], [...], '이전 분석과 일치', true),
  ('김팀장님', 'SPEAKER_01', 78.9, [...], [...], 'SPEAKER_00이 SPEAKER_01을 "김팀장님"이라고 호칭', true);

-- 2. speaker_mappings에 최종 결과 저장
INSERT INTO speaker_mappings (speaker_label, suggested_name, name_confidence, name_mentions, conflict_detected)
VALUES
  ('SPEAKER_00', '김민서', 0.95, 2, false),
  ('SPEAKER_01', '김재형', 0.85, 1, false);
```

---

## 주요 알고리즘과 DB 관계

### 1. 소거법 (Elimination Method)
**조건:** 남은 화자 수 = 남은 이름 수 = 1

```python
# detected_names에서 아직 매핑 안된 이름 조회
unmatched_names = SELECT DISTINCT detected_name FROM detected_names
                  WHERE audio_file_id = ?
                  AND detected_name NOT IN (
                      SELECT suggested_name FROM speaker_mappings WHERE audio_file_id = ?
                  )

# speaker_mappings에서 아직 이름 없는 화자 조회
unmatched_speakers = SELECT speaker_label FROM speaker_mappings
                     WHERE audio_file_id = ? AND suggested_name IS NULL

# 1:1 매핑
UPDATE speaker_mappings
SET suggested_name = unmatched_names[0], name_confidence = 0.7
WHERE speaker_label = unmatched_speakers[0]
```

### 2. 스코어 기반 매핑
**공식:** `score = (name_mentions * 0.5) + (name_confidence * 0.5)`

```python
# detected_names에서 집계
name_stats = SELECT
    detected_name,
    speaker_label,
    COUNT(*) as mentions,
    AVG(confidence) as avg_confidence
FROM detected_names
WHERE audio_file_id = ?
GROUP BY detected_name, speaker_label

# 스코어 계산 후 speaker_mappings 업데이트
for stat in name_stats:
    score = (stat.mentions * 0.5) + (stat.avg_confidence * 0.5)

    UPDATE speaker_mappings
    SET suggested_name = stat.detected_name,
        name_confidence = stat.avg_confidence,
        name_mentions = stat.mentions
    WHERE speaker_label = stat.speaker_label AND score > 0.5
```

### 3. 닉네임 자동 생성 (Smart Selection)
**대표 발화 선택 기준:**
- 긴 발화 (20단어 이상)
- 키워드 포함 발화 (전문 용어 등)

```sql
-- STT + Diarization 병합 후 대표 발화 선택
SELECT
    d.speaker_label,
    GROUP_CONCAT(s.text ORDER BY s.word_index) as utterance,
    COUNT(s.id) as word_count,
    d.start_time
FROM diarization_results d
JOIN stt_results s ON s.start_time BETWEEN d.start_time AND d.end_time
WHERE d.audio_file_id = ?
GROUP BY d.id
HAVING word_count > 20
ORDER BY word_count DESC
LIMIT 3;

-- 결과를 LLM에 전달하여 닉네임 생성
-- speaker_mappings 업데이트
UPDATE speaker_mappings
SET nickname = '진행 담당자',
    nickname_metadata = '{"display_label": "진행 담당자", "keywords": ["진행", "조율"]}'
WHERE speaker_label = 'SPEAKER_00';
```

---

## 테이블별 데이터 크기 예상

**1시간 오디오 파일 기준:**

| 테이블 | 예상 행 수 | 비고 |
|--------|-----------|------|
| audio_files | 1 | 파일 1개 |
| preprocessing_results | 1 | 1:1 관계 |
| stt_results | ~10,000 | 단어별 저장 (1분당 ~167단어) |
| diarization_results | ~200 | 화자별 발화 세그먼트 |
| detected_names | 10~50 | NER로 감지된 이름 언급 |
| user_confirmations | 1 | 1:1 관계 |
| speaker_mappings | 2~5 | 화자 수만큼 |
| final_transcripts | ~200 | diarization_results와 동일 |
| summaries | 1~3 | 요약, 자막 등 |

**디스크 사용량 예상:**
- STT 결과: ~1MB (JSON 압축 시)
- Diarization 임베딩: ~50KB (192dim * 200rows)
- 전체 DB: ~2MB/hour

---

## 인덱스 전략

### 성능 최적화를 위한 인덱스
```sql
-- 파일별 조회 (가장 자주 사용)
CREATE INDEX idx_audio_file_id ON stt_results(audio_file_id);
CREATE INDEX idx_audio_file_id ON diarization_results(audio_file_id);
CREATE INDEX idx_audio_file_id ON detected_names(audio_file_id);
CREATE INDEX idx_audio_file_id ON speaker_mappings(audio_file_id);

-- 복합 인덱스 (정렬 쿼리)
CREATE INDEX idx_audio_word ON stt_results(audio_file_id, word_index);
CREATE INDEX idx_audio_speaker ON diarization_results(audio_file_id, speaker_label);
CREATE INDEX idx_audio_segment ON final_transcripts(audio_file_id, segment_index);

-- 이름 검색
CREATE INDEX idx_detected_name ON detected_names(detected_name);
```

---

## 추후 확장 가능성

### 1. Speaker Profiles (화자 프로필)
**용도:** 동일 화자를 여러 파일에서 자동 인식
```sql
CREATE TABLE speaker_profiles (
    id INT PRIMARY KEY,
    user_id INT,
    speaker_name VARCHAR(100),
    voice_embedding JSON,  -- 평균 임베딩
    created_at TIMESTAMP
);
```

### 2. RAG Embeddings (벡터 DB)
**용도:** 대본 내용 검색 및 Q&A
```sql
CREATE TABLE rag_embeddings (
    id INT PRIMARY KEY,
    audio_file_id INT,
    segment_index INT,
    text TEXT,
    embedding JSON,  -- 1536차원 (OpenAI)
    created_at TIMESTAMP
);
```

### 3. Processing Logs (에러 추적)
**용도:** 각 단계별 에러 로그 및 디버깅
```sql
CREATE TABLE processing_logs (
    id INT PRIMARY KEY,
    audio_file_id INT,
    step_name VARCHAR(50),  -- 'stt', 'diarization', 'ner' 등
    status ENUM('success', 'failed'),
    error_message TEXT,
    processing_time FLOAT,
    created_at TIMESTAMP
);
```

### 4. User Sessions (리프레시 토큰)
**용도:** JWT 리프레시 토큰 관리
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY,
    user_id INT,
    refresh_token VARCHAR(500),
    expires_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## 마이그레이션 가이드

### Alembic 사용법
```bash
# 현재 마이그레이션 상태 확인
alembic current

# 새 마이그레이션 생성 (모델 변경 후)
alembic revision --autogenerate -m "Add user_confirmations table"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

### 주요 마이그레이션 히스토리
1. **Initial schema** - 기본 9개 테이블 생성
2. **Add nickname fields** - speaker_mappings에 nickname, nickname_metadata 추가
3. **Add user_confirmations** - 사용자 확정 정보 테이블 추가
4. **Add indexes** - 성능 최적화를 위한 인덱스 추가

---

## 참고 문서

- [파이프라인 I/O](./pipeline-io.md) - 각 단계별 Input/Output 정의
- [Agent 워크플로우](./agent-workflow.md) - LangGraph Agent 상세 설명
- [시스템 아키텍처](./architecture.md) - 전체 시스템 설계

**코드 위치:** 모든 모델은 [backend/app/models/](../backend/app/models/) 디렉토리에 있습니다.
