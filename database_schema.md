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
       ├─────────────────────┬─────────────────────┬─────────────────────┐
       │ N                   │ N                   │ N                   │ N
┌──────┴──────────────┐ ┌───┴────────────────┐ ┌──┴─────────────────┐ ┌──┴──────────────┐
│ preprocessing_      │ │  stt_results       │ │ diarization_       │ │ final_          │
│ results             │ └────────────────────┘ │ results            │ │ transcripts     │
└─────────────────────┘                        └──┬─────────────────┘ └─────────────────┘
                                                  │ 1
                                                  │
                                                  │ N
                                            ┌─────┴────────────┐
                                            │ detected_names   │
                                            └──────────────────┘
                                                  │ N
                                                  │
                                                  │ 1
                                            ┌─────┴────────────┐
                                            │ speaker_mappings │
                                            └──────────────────┘

┌─────────────────────┐
│ summaries           │ (audio_files와 1:1 관계)
└─────────────────────┘
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

---

### 3. preprocessing_results (전처리 결과)
I,O.md Step 2 결과

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 전처리 결과 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| stt_input_path | VARCHAR(500) | VAD 적용 파일 경로 (STT용) |
| diar_input_path | VARCHAR(500) | VAD + 노이즈 제거 파일 경로 (화자분리용) |
| processing_time | FLOAT | 처리 시간 (초) |
| created_at | TIMESTAMP | 생성 시간 |

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

**인덱스:** `audio_file_id`, `word_index`

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
| embedding | JSON | 음성 임베딩 벡터 (배열) |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:** `audio_file_id`, `speaker_label`

---

### 6. detected_names (감지된 이름)
I,O.md Step 5a~5c 결과 - 시스템이 자동 감지한 이름들

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 감지 이름 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| detected_name | VARCHAR(100) | 감지된 이름 ("민서씨", "김팀장님" 등) |
| speaker_label | VARCHAR(50) | 연관된 화자 레이블 (SPEAKER_00 등) |
| time_detected | FLOAT | 이름이 언급된 시간 (초) |
| confidence | FLOAT | 신뢰도 (0.0~1.0) |
| similarity_score | FLOAT | 음성 임베딩 유사도 (동일인 판별용) |
| created_at | TIMESTAMP | 생성 시간 |

**인덱스:** `audio_file_id`

---

### 7. speaker_mappings (화자 태깅 결과)
I,O.md Step 5d~5e 결과 - 시스템 제안 vs 사용자 확정

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 매핑 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| speaker_label | VARCHAR(50) | 화자 레이블 (SPEAKER_00 등) |
| suggested_name | VARCHAR(100) | 시스템 제안 이름 (nullable) |
| final_name | VARCHAR(100) | 사용자 확정 이름 |
| is_modified | BOOLEAN | 사용자가 수정했는지 여부 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

**제약 조건:** `audio_file_id` + `speaker_label` UNIQUE

---

### 8. final_transcripts (최종 대본)
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

**인덱스:** `audio_file_id`, `segment_index`

---

### 9. summaries (요약 결과)
I,O.md Step 6 결과 - 요약/RAG/자막

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | 요약 ID |
| audio_file_id | INT (FK) | 오디오 파일 ID |
| summary_type | ENUM('summary', 'subtitle') | 요약 유형 |
| content | TEXT | 요약 내용 또는 자막 파일 경로 |
| created_at | TIMESTAMP | 생성 시간 |

---

## 데이터 흐름 예시

1. 사용자가 `audio.mp3` 업로드 → `audio_files` 테이블에 기록
2. 전처리 수행 → `preprocessing_results`에 2개 파일 경로 저장
3. STT 수행 → `stt_results`에 단어별 결과 저장
4. Diarization 수행 → `diarization_results`에 화자별 결과 + 임베딩 저장
5. 이름 감지 → `detected_names`에 "민서씨", "인서씨" 저장
6. 시스템 제안 → UI로 전달 (5d)
7. 사용자 확정 → `speaker_mappings`에 SPEAKER_00="김민서" 저장
8. 최종 병합 → `final_transcripts`에 화자명 포함 대본 저장
9. 요약 생성 → `summaries`에 저장

---

## 추후 확장 가능성

- **rag_embeddings** 테이블: Vector DB 대신 MySQL에 임베딩 저장
- **user_sessions** 테이블: 리프레시 토큰 관리
- **processing_logs** 테이블: 각 단계별 에러 로그
