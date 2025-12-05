# 회의 효율성 분석 기능 문서

ListenCarePlease 프로젝트의 회의 효율성 분석 기능에 대한 상세 문서입니다.

---

## 📋 목차
- [개요](#개요)
- [주요 지표](#주요-지표)
- [워크플로우](#워크플로우)
- [API 문서](#api-문서)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [AI 인사이트](#ai-인사이트)
- [트러블슈팅](#트러블슈팅)
- [변경 이력](#변경-이력)

---

## 개요

회의 효율성 분석 기능은 화자 태깅이 완료된 회의록을 기반으로 다양한 정량적 지표를 계산하여 회의의 효율성을 분석하는 기능입니다.

### 주요 특징
- **자동 분석**: 화자 태깅 완료 후 자동으로 효율성 분석 실행
- **5가지 핵심 지표**: 엔트로피, TTR, 정보량, 문장 확률, PPL
- **화자별 + 전체 분석**: 개별 화자 분석 및 전체 회의 지표 제공
- **AI 인사이트**: GPT-4o-mini를 활용한 지표별 한줄 평 생성
- **결과 캐싱**: 분석 결과를 DB에 저장하여 재분석 방지

---

## 주요 지표

### 1. 엔트로피 (Entropy)
**의미**: 회의 담화의 주제 다양성 및 복잡도 측정

**계산 방식**:
- Shannon Entropy 기반
- 슬라이딩 윈도우(50단어) 방식으로 시간대별 엔트로피 계산
- 형태소 분석(Mecab) 기반 단어 빈도 분포 활용

**출력**:
```json
{
  "entropy_values": [
    {"time": 10.5, "entropy": 2.34, "window_words": ["회의", "안건", ...]},
    ...
  ],
  "entropy_avg": 2.15,
  "entropy_std": 0.45
}
```

### 2. TTR (Type-Token Ratio)
**의미**: 어휘 다양성 측정 (높을수록 다양한 어휘 사용)

**계산 방식**:
- Types (고유 단어 수) / Tokens (전체 단어 수)
- 명사 기반 계산 (Mecab으로 명사 추출)
- 슬라이딩 윈도우(50단어) 방식

**출력**:
```json
{
  "ttr_avg": 0.68,
  "ttr_std": 0.12,
  "ttr_values": [
    {"window_start": 0, "window_end": 10, "ttr": 0.75, "unique_nouns": 8, "total_nouns": 12},
    ...
  ],
  "total_types": 450,
  "total_tokens": 1200
}
```

**AI 인사이트**: "어휘 다양성이 높아 풍부한 논의가 이루어졌습니다."

### 3. 정보량 (Information Content)
**의미**: 문장 간 의미적 거리 측정 (코사인 유사도 기반)

**계산 방식**:
- Sentence Transformer 모델 (`paraphrase-multilingual-MiniLM-L12-v2`)
- 각 문장과 평균 임베딩 간 코사인 유사도 계산
- 정보 스코어 = 1 - 평균 유사도

**출력**:
```json
{
  "avg_similarity": 0.78,
  "information_score": 0.22,
  "cosine_similarity_values": [
    {"time": 10.5, "sentence": "오늘 회의 안건은...", "similarity": 0.85, "z_normalized": 0.5},
    ...
  ]
}
```

**AI 인사이트**: "정보량이 적절하여 집중도 높은 회의로 평가됩니다."

### 4. 문장 확률 (Sentence Probability)
**의미**: 비정상적인 발언 감지 (HDBSCAN 군집화 기반)

**계산 방식**:
- Sentence Transformer로 문장 임베딩 생성
- HDBSCAN 군집화로 클러스터링
- 각 클러스터의 문장 수 기반 확률 계산
- 확률이 낮은 문장 = 이례적인 발언

**출력**:
```json
{
  "avg_probability": 0.25,
  "outlier_ratio": 0.08,
  "cluster_info": [
    {"cluster_id": 0, "sentence_count": 15, "probability": 0.25},
    {"cluster_id": 1, "sentence_count": 8, "probability": 0.13},
    ...
  ],
  "rare_sentences": [
    {"sentence": "특이한 발언...", "probability": 0.02, "cluster_id": 5},
    ...
  ]
}
```

**특별 처리**:
- 짧은 영상(outlier_ratio >= 0.99)의 경우: "영상이 짧아 분석이 제한적입니다."

**AI 인사이트**: "대부분의 발언이 주제와 관련성이 높습니다."

### 5. PPL (Perplexity)
**의미**: 언어 모델 복잡도 측정 (낮을수록 예측 가능한 대화)

**계산 방식**:
- KoGPT-2 모델 (`skt/kogpt2-base-v2`) 사용
- 10문장 단위 윈도우로 PPL 계산
- PPL = exp(loss)

**출력**:
```json
{
  "ppl_avg": 38.5,
  "ppl_std": 12.3,
  "ppl_values": [
    {"window_index": 0, "ppl": 45.2},
    {"window_index": 1, "ppl": 38.1},
    ...
  ],
  "total_windows": 15
}
```

**NaN/Infinity 처리**:
- 계산 중 NaN 또는 Infinity 발생 시 해당 값 제외
- 통계 계산 후에도 NaN/Infinity 체크하여 0.0으로 대체

**AI 인사이트**: "대화 흐름이 자연스럽고 예측 가능한 패턴을 보입니다."

---

## 워크플로우

### 1. 분석 시작 시점
화자 태깅 확정(`POST /api/v1/tagging/confirm`) 완료 시 자동으로 효율성 분석이 백그라운드에서 실행됩니다.

```python
# backend/app/api/v1/tagging.py
@router.post("/confirm")
async def confirm_tagging(
    request: TaggingConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # ... 태깅 확정 로직 ...

    db.commit()

    # 효율성 분석 자동 실행
    from app.api.v1.efficiency import run_efficiency_analysis
    background_tasks.add_task(run_efficiency_analysis, audio_file.id)

    return TaggingConfirmResponse(
        file_id=request.file_id,
        message="화자 태깅이 완료되었습니다. 효율성 분석이 백그라운드에서 실행됩니다.",
        status="confirmed"
    )
```

### 2. 분석 프로세스

```
1. 화자 태깅 완료
   ↓
2. BackgroundTasks로 효율성 분석 시작
   ↓
3. 기존 분석 결과 확인 (force=false인 경우 캐싱된 결과 반환)
   ↓
4. 5가지 지표 계산 (화자별 + 전체 회의)
   - 엔트로피 (전체 회의만)
   - TTR
   - 정보량
   - 문장 확률
   - PPL
   ↓
5. AI 인사이트 생성 (GPT-4o-mini)
   ↓
6. 결과 DB 저장 (meeting_efficiency_analysis 테이블)
   ↓
7. 프론트엔드 폴링으로 결과 조회
```

### 3. 사용자 플로우

```
1. 효율성 페이지 접속 (/efficiency/:fileId)
   ↓
2. 분석 상태 확인 (3초마다 폴링, 최대 60회 = 3분)
   - 분석 중: "효율성 분석 중입니다..." 표시
   - 완료: 결과 표시
   - 타임아웃: 에러 메시지
   ↓
3. 결과 확인
   - 전체 회의 종합 분석 (엔트로피 + AI 인사이트)
   - 화자별 효율성 지표 (탭 방식)
     * 전체 회의 탭
     * 개별 화자 탭 (SPEAKER_00, SPEAKER_01, ...)
```

---

## API 문서

### 1. 효율성 분석 트리거

**Endpoint**: `POST /api/v1/efficiency/analyze/{file_id}`

**설명**: 효율성 분석을 시작합니다. (화자 태깅 완료 후 자동 실행되므로 수동 호출 불필요)

**Parameters**:
- `file_id` (path): 파일 UUID
- `force` (query, optional): 강제 재분석 플래그 (default: false)
  - `false`: 기존 결과가 있으면 캐싱된 결과 반환
  - `true`: 기존 결과 무시하고 재분석

**Request**:
```bash
POST /api/v1/efficiency/analyze/550e8400-e29b-41d4-a716-446655440000?force=false
```

**Response** (202 Accepted):
```json
{
  "message": "Efficiency analysis already completed",
  "file_id": 123,
  "status": "completed",
  "analyzed_at": "2025-11-27T10:30:00Z"
}
```

또는 (재분석 시작):
```json
{
  "message": "Efficiency analysis started",
  "file_id": 123,
  "status": "processing"
}
```

### 2. 분석 결과 조회

**Endpoint**: `GET /api/v1/efficiency/result/{file_id}`

**설명**: 효율성 분석 결과를 조회합니다.

**Parameters**:
- `file_id` (path): 파일 UUID

**Request**:
```bash
GET /api/v1/efficiency/result/550e8400-e29b-41d4-a716-446655440000
```

**Response** (200 OK):
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "audio_file_id": 123,
  "analysis_id": 45,
  "analyzed_at": "2025-11-27T10:30:00Z",
  "analysis_version": "1.0",

  // 전체 회의 지표
  "entropy": {
    "entropy_values": [...],
    "entropy_avg": 2.15,
    "entropy_std": 0.45,
    "insight": "주제가 다양하게 논의되었습니다."
  },
  "overall_ttr": {
    "ttr_avg": 0.68,
    "ttr_std": 0.12,
    "ttr_values": [...],
    "total_types": 450,
    "total_tokens": 1200,
    "insight": "어휘 다양성이 높아 풍부한 논의가 이루어졌습니다."
  },
  "overall_information_content": {
    "avg_similarity": 0.78,
    "information_score": 0.22,
    "cosine_similarity_values": [...],
    "insight": "정보량이 적절하여 집중도 높은 회의로 평가됩니다."
  },
  "overall_sentence_probability": {
    "avg_probability": 0.25,
    "outlier_ratio": 0.08,
    "cluster_info": [...],
    "rare_sentences": [...],
    "insight": "대부분의 발언이 주제와 관련성이 높습니다."
  },
  "overall_perplexity": {
    "ppl_avg": 38.5,
    "ppl_std": 12.3,
    "ppl_values": [...],
    "total_windows": 15,
    "insight": "대화 흐름이 자연스럽고 예측 가능한 패턴을 보입니다."
  },

  // 메타데이터
  "total_speakers": 3,
  "total_turns": 145,
  "total_sentences": 320,

  // 화자별 지표
  "speaker_metrics": [
    {
      "speaker_label": "SPEAKER_00",
      "speaker_name": "김민서",

      "turn_frequency": {
        "turn_count": 45,
        "total_duration": 180.5,
        "avg_turn_length": 4.0,
        "time_series": [...]
      },

      "ttr": {
        "ttr_values": [...],
        "ttr_avg": 0.68,
        "ttr_std": 0.12,
        "insight": "김민서님은 다양한 어휘를 사용하며 발표하였습니다."
      },

      "information_content": {
        "cosine_similarity_values": [...],
        "avg_similarity": 0.78,
        "information_score": 0.22,
        "insight": "김민서님의 발언은 핵심 주제와 높은 관련성을 보입니다."
      },

      "sentence_probability": {
        "cluster_info": [...],
        "rare_sentences": [...],
        "insight": "김민서님의 발언은 일관성 있게 이루어졌습니다."
      },

      "perplexity": {
        "ppl_values": [...],
        "ppl_avg": 38.5,
        "ppl_std": 12.3,
        "insight": "김민서님의 대화 흐름이 자연스럽습니다."
      }
    },
    ...  // 다른 화자들
  ]
}
```

**Response** (404 Not Found) - 분석 중:
```json
{
  "detail": "Efficiency analysis not found or still processing"
}
```

---

## 데이터베이스 스키마

### meeting_efficiency_analysis 테이블

```python
class MeetingEfficiencyAnalysis(Base):
    __tablename__ = "meeting_efficiency_analysis"

    id = Column(Integer, primary_key=True, index=True)
    audio_file_id = Column(Integer, ForeignKey("audio_files.id", ondelete="CASCADE"),
                          nullable=False, unique=True, index=True)

    # === 전체 회의 지표 ===
    # 엔트로피
    entropy_values = Column(JSON, nullable=True)
    entropy_avg = Column(Float, nullable=True)
    entropy_std = Column(Float, nullable=True)

    # 전체 회의 TTR
    overall_ttr = Column(JSON, nullable=True)

    # 전체 회의 정보량
    overall_information_content = Column(JSON, nullable=True)

    # 전체 회의 문장 확률
    overall_sentence_probability = Column(JSON, nullable=True)

    # 전체 회의 PPL
    overall_perplexity = Column(JSON, nullable=True)

    # === 화자별 상세 지표 (JSON 배열) ===
    speaker_metrics = Column(JSON, nullable=False)

    # === 메타데이터 ===
    total_speakers = Column(Integer, nullable=False)
    total_turns = Column(Integer, nullable=False)
    total_sentences = Column(Integer, nullable=False)

    # === 분석 정보 ===
    analysis_version = Column(String(20), nullable=False, default="1.0")
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    audio_file = relationship("AudioFile", back_populates="efficiency_analysis")
```

### JSON 컬럼 포맷

#### overall_ttr (전체 회의 TTR)
```json
{
  "ttr_avg": 0.68,
  "ttr_std": 0.12,
  "ttr_values": [0.75, 0.68, 0.72, ...],
  "total_types": 450,
  "total_tokens": 1200
}
```

#### overall_information_content (전체 회의 정보량)
```json
{
  "avg_similarity": 0.78,
  "information_score": 0.22,
  "cosine_similarity_values": [
    {"time": 10.5, "sentence": "...", "similarity": 0.85, "z_normalized": 0.5},
    ...
  ]
}
```

#### overall_sentence_probability (전체 회의 문장 확률)
```json
{
  "avg_probability": 0.25,
  "outlier_ratio": 0.08,
  "cluster_info": [
    {"cluster_id": 0, "sentence_count": 15, "probability": 0.25},
    ...
  ],
  "rare_sentences": [
    {"sentence": "...", "probability": 0.02, "cluster_id": 5},
    ...
  ]
}
```

#### overall_perplexity (전체 회의 PPL)
```json
{
  "ppl_avg": 38.5,
  "ppl_std": 12.3,
  "ppl_values": [
    {"window_index": 0, "ppl": 45.2},
    {"window_index": 1, "ppl": 38.1},
    ...
  ],
  "total_windows": 15
}
```

#### speaker_metrics (화자별 지표)
```json
[
  {
    "speaker_label": "SPEAKER_00",
    "speaker_name": "김민서",
    "turn_frequency": {...},
    "ttr": {...},
    "information_content": {...},
    "sentence_probability": {...},
    "perplexity": {...}
  },
  ...
]
```

---

## AI 인사이트

### 인사이트 생성 로직

**사용 모델**: GPT-4o-mini (cost-effective)

**프롬프트 구조**:
```python
prompt = f"""회의 효율성 지표에 대한 간단한 한줄 평을 작성해주세요.

지표명: {metric_name}
평균: {avg:.3f}
추세: {trend}  # 상승/하락/안정
변동성: {volatility}  # 높음/낮음
데이터 포인트 수: {len(values)}

한줄로 회의의 특징을 설명해주세요."""
```

**추세 계산**:
- 마지막 값 > 첫 값 → "상승"
- 마지막 값 < 첫 값 → "하락"
- 데이터 포인트 < 2 → "안정"

**변동성 계산**:
- 표준편차 > 평균 * 0.3 → "높음"
- 표준편차 <= 평균 * 0.3 → "낮음"

**타입 처리**:
- dict 값은 건너뛰고 숫자 값만 분석
- 숫자 값이 없으면 "데이터가 부족합니다." 반환

### 인사이트 생성 시점

1. **화자별 지표**: 각 화자의 5가지 지표에 대해 개별 생성
2. **전체 회의 지표**: 4가지 지표(TTR, 정보량, 문장 확률, PPL)에 대해 생성
3. **엔트로피**: 전체 회의 엔트로피에 대해 생성

**총 인사이트 수**: 1(엔트로피) + 4(전체 회의) + N × 5(화자 수 × 5가지 지표)

---

## 트러블슈팅

### 1. `'>' not supported between instances of 'dict' and 'dict'` 에러

**원인**: PPL 값이 dict 형태(`[{"ppl": 45.2}, ...]`)로 저장되어 추세 계산 시 비교 불가

**해결 방법**:
```python
# backend/app/api/v1/efficiency.py - generate_insight()
numeric_values = []
for v in values:
    if isinstance(v, (int, float)):
        numeric_values.append(v)
    elif isinstance(v, dict):
        continue  # dict인 경우 건너뛰기

if len(numeric_values) >= 2:
    trend = "상승" if numeric_values[-1] > numeric_values[0] else "하락"
else:
    trend = "안정"
```

### 2. Invalid JSON - NaN/Infinity 에러

**에러 메시지**:
```
Invalid JSON text: "Invalid value." at position 12 in value for column 'meeting_efficiency_analysis.overall_perplexity'
```

**원인**: PPL 계산 중 NaN 또는 Infinity 값 생성

**해결 방법**:
```python
# backend/app/services/efficiency_analyzer.py - _calc_overall_perplexity()

# 값 수집 시 필터링
if not np.isnan(ppl) and not np.isinf(ppl):
    ppl_values.append({
        "window_index": i // window_size,
        "ppl": float(ppl)
    })

# 통계 계산 후 검증
if np.isnan(ppl_avg) or np.isinf(ppl_avg):
    ppl_avg = 0.0
if np.isnan(ppl_std) or np.isinf(ppl_std):
    ppl_std = 0.0
```

### 3. 효율성 분석이 매번 실행되는 문제

**증상**: 효율성 페이지 새로고침할 때마다 "효율성 분석 중..." 표시

**원인**:
1. Frontend에서 `triggerEfficiencyAnalysis()` 중복 호출
2. Backend의 `force=false` 캐싱 로직 미작동

**해결 방법**:
```python
# backend/app/api/v1/efficiency.py
@router.post("/analyze/{file_id}")
def trigger_efficiency_analysis(
    file_id: str,
    background_tasks: BackgroundTasks,
    force: bool = False,  # 기본값 false
    db: Session = Depends(get_db)
):
    # 기존 분석 결과 확인
    existing_analysis = db.query(MeetingEfficiencyAnalysis).filter(
        MeetingEfficiencyAnalysis.audio_file_id == audio_file.id
    ).first()

    # 기존 결과가 있고 force=False이면 완료 상태 반환
    if existing_analysis and not force:
        return {
            "message": "Efficiency analysis already completed",
            "file_id": audio_file.id,
            "status": "completed",
            "analyzed_at": existing_analysis.analyzed_at.isoformat()
        }

    # force=True이거나 기존 결과가 없으면 재분석
    background_tasks.add_task(run_efficiency_analysis, audio_file.id)
    ...
```

```javascript
// frontend/src/pages/TaggingPageNew.jsx
// triggerEfficiencyAnalysis() 호출 제거 (backend에서 자동 실행)
await axios.post(`${API_BASE_URL}/api/v1/tagging/confirm`, {
  file_id: fileId,
  mappings: finalMappings
})

// 효율성 분석은 백엔드에서 자동으로 실행됨
console.log('화자 태깅 완료. 효율성 분석은 백그라운드에서 자동 실행됩니다.')
```

### 4. 짧은 영상의 문장 확률 분석

**증상**: 짧은 영상의 경우 `outlier_ratio >= 0.99`로 모든 문장이 이상치로 분류

**해결 방법**:
```python
# backend/app/services/efficiency_analyzer.py
if outlier_ratio >= 0.99:
    # 짧은 영상은 군집화가 불안정하므로 특별 처리
    cluster_info = []
    rare_sentences = []
else:
    # 정상적인 군집화 결과 사용
    ...
```

프론트엔드에서 특별 메시지 표시:
```javascript
// frontend/src/pages/EfficiencyPage.jsx
if (metric.outlier_ratio >= 0.99) {
  return <p>영상이 짧아 분석이 제한적입니다.</p>
}
```

### 5. 폴링 무한 루프 방지

**문제**: 분석이 실패했는데 계속 폴링하여 무한 로딩

**해결 방법**:
```javascript
// frontend/src/pages/EfficiencyPage.jsx
const MAX_POLLING_ATTEMPTS = 60  // 3초 * 60 = 3분

if (error.response?.status === 404) {
  if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
    setError('timeout')
    setIsAnalyzing(false)
  } else {
    setIsAnalyzing(true)
    setPollingAttempts(prev => prev + 1)
  }
}
```

---

## 변경 이력

### 2025-11-27: 전체 회의 지표 및 AI 인사이트 추가

#### Backend 변경사항

1. **efficiency_analyzer.py** - 전체 회의 지표 계산 메서드 추가
   - `_calc_overall_ttr()`: 전체 회의 TTR 계산 (lines 617-661)
   - `_calc_overall_information_content()`: 전체 회의 정보량 계산 (lines 663-709)
   - `_calc_overall_sentence_probability()`: 전체 회의 문장 확률 계산 (lines 711-745)
   - `_calc_overall_perplexity()`: 전체 회의 PPL 계산 (lines 747-785)
   - `analyze_all()` 메서드에서 위 메서드들 호출 추가

2. **efficiency.py (models)** - DB 스키마 확장
   - `overall_ttr` 컬럼 추가 (line 27)
   - `overall_information_content` 컬럼 추가 (line 30)
   - `overall_sentence_probability` 컬럼 추가 (line 33)
   - `overall_perplexity` 컬럼 추가 (line 36)

3. **efficiency.py (API)** - 인사이트 생성 및 응답 개선
   - `generate_insight()` 함수 수정: dict 타입 처리 추가 (lines 36-56)
   - 전체 회의 지표 인사이트 생성 추가 (lines 256-300)
   - 응답 JSON에 전체 회의 지표 + 인사이트 포함 (lines 360-399)
   - `force` 파라미터를 통한 캐싱 구현 (lines 124-175)

4. **tagging.py** - 자동 효율성 분석 트리거
   - `/confirm` 엔드포인트에 `BackgroundTasks` 추가 (line 395)
   - 태깅 확정 후 `background_tasks.add_task(run_efficiency_analysis)` 호출 (lines 522-524)

5. **Database Migration**
   - 4개 컬럼 추가를 위한 직접 SQL 실행 (Alembic 대신)
   ```sql
   ALTER TABLE meeting_efficiency_analysis
   ADD COLUMN overall_ttr JSON NULL,
   ADD COLUMN overall_information_content JSON NULL,
   ADD COLUMN overall_sentence_probability JSON NULL,
   ADD COLUMN overall_perplexity JSON NULL;
   ```

#### Frontend 변경사항

1. **EfficiencyPage.jsx** - 전체 회의 탭 개선
   - `calculateOverallMetrics()` 수정: 백엔드 overall 지표 사용 (lines 54-91)
   - 폴링 제한 추가: `MAX_POLLING_ATTEMPTS = 60` (lines 42-43)
   - 타임아웃 처리 개선 (lines 115-133)
   - "전체 회의 종합 분석" 중복 섹션 제거 (lines 357-361)

2. **TaggingPageNew.jsx** - 중복 트리거 제거
   - `triggerEfficiencyAnalysis()` 호출 제거 (lines 75-77)
   - 백엔드 자동 트리거에 의존

#### 주요 개선사항

1. **전체 회의 AI 인사이트 추가**: 개별 화자뿐만 아니라 전체 회의에 대한 AI 코멘트 제공
2. **결과 캐싱**: `force=false` 시 기존 결과 재사용으로 불필요한 재분석 방지
3. **자동화**: 화자 태깅 완료 시 자동으로 효율성 분석 실행
4. **에러 처리 개선**: NaN/Infinity 값 필터링, dict 타입 처리
5. **UI 중복 제거**: "전체 회의 종합 분석" 섹션 삭제로 UX 개선

---

## 향후 개선 사항

1. **실시간 분석**: 현재는 배치 처리 방식, WebSocket을 통한 실시간 진행률 표시
2. **지표 커스터마이징**: 사용자가 원하는 지표만 선택적으로 계산
3. **비교 분석**: 여러 회의의 효율성 지표 비교 기능
4. **알림 기능**: 분석 완료 시 사용자에게 알림
5. **PDF 리포트**: 효율성 분석 결과를 PDF로 다운로드

---

## 참고 문서

- **프로젝트 설계**: `docs/architecture.md`
- **파이프라인 I/O**: `docs/pipeline-io.md`
- **DB 스키마**: `docs/database-schema.md`
- **명령어**: `COMMANDS.md`

---

**Last Updated**: 2025-11-27
