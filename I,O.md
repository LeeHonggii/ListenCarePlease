## 파이프라인 I/O (Input/Output) 정의

### 1. [입력] Audio Input

- **Input (User):** `original.mp3` (또는 .m4a, .wav 등)
- **Output (to Preprocessing):**JSON
    
    ```python
    {
      "filepath": "/temp/original.mp3",
      "mimetype": "audio/mp3"
    }
    ```
    

---

### 2. [모듈] Preprocessing (음성 전처리)

- **Input (from Step 1):** 원본 파일 경로
- **Output (to STT & Diarization):**JSON
    - 전처리가 완료된 **두 개의 파일 경로**를 생성하여 다음 단계로 전달합니다.
    
    ```python
    {
      "stt_input_path": "/temp/vad_audio.wav",  // VAD(음성구간감지)만 적용된 파일 (STT용)
      "diar_input_path": "/temp/nr_audio.wav" // VAD + 노이즈제거 적용된 파일 (화자분리용)
    }
    ```
    

---

### 3. [모듈 A] STT (Whisper)

- **Input (from Step 2):** `stt_input_path`
- **Output (to Tagger & Merge):**JSON
    - **단어(Word) 레벨**의 타임스탬프가 찍힌 텍스트 조각 리스트.
    
    ```python
    [
      { "text": "네", "start": 3.6, "end": 3.8 },
      { "text": "민서씨", "start": 3.9, "end": 4.5 },
      { "text": "...", "start": null, "end": null }
    ]
    ```
    

---

### 4. [모듈 B] Speaker Diarization (화자 분리)

- **Input (from Step 2):** `diar_input_path`
- **Output (to Tagger & Merge):**JSON
    - 각 화자(Label)의 고유한 **목소리 특징 벡터(Embedding)**와 해당 구간 리스트.
    
    ```python
    {
      "turns": [
        { "speaker_label": "SPEAKER_00", "start": 0.4, "end": 3.5 },
        { "speaker_label": "SPEAKER_01", "start": 3.6, "end": 5.8 },
        { "speaker_label": "SPEAKER_00", "start": 5.9, "end": 8.1 }
      ],
      "embeddings": {
        "SPEAKER_00": [0.12, -0.45, 0.88, ...], // (SPEAKER_00의 대표 임베딩)
        "SPEAKER_01": [-0.33, 0.76, -0.12, ...] // (SPEAKER_01의 대표 임베딩)
      }
    }
    ```
    

---

### 5. [핵심 모듈] Tagger & Merge Logic (태깅 및 병합)

- **Input 1 (from STT):** `List[WordSegment]` (3번 결과)
- **Input 2 (from Diarization):** `DiarizationResult` (4번 결과 - 임베딩 포함)

### 5a ~ 5c. 내부 처리 로직 (2가지 방식)

시스템은 상황에 따라 **2가지 화자 태깅 방식**을 사용합니다:

---

#### **방식 1: 이름 기반 태깅 (Name-based Tagging with Multi-turn LLM)**

이름이 대화에서 언급된 경우 사용합니다.

1. **(이름 감지):** 3번(STT) 결과에서 "민서씨", "인서씨", "김팀장님" 등 이름 후보를 추출합니다.

2. **(확장 문맥 추출):** 이름이 나온 문장을 기준으로 **앞뒤 5개 문장**을 함께 추출합니다.
   ```python
   {
     "detected_name": "민서",
     "context_sentences": [
       {"index": -5, "speaker": "SPEAKER_00", "text": "오늘 회의 시작하겠습니다", "time": 5.0},
       {"index": -4, "speaker": "SPEAKER_01", "text": "네, 준비 완료했습니다", "time": 6.5},
       {"index": -3, "speaker": "SPEAKER_00", "text": "첫 번째 안건은 무엇인가요", "time": 8.0},
       {"index": -2, "speaker": "SPEAKER_01", "text": "저희 팀에서 준비한 내용입니다", "time": 9.2},
       {"index": -1, "speaker": "SPEAKER_00", "text": "그럼 발표 부탁드립니다", "time": 10.0},
       {"index": 0, "speaker": "SPEAKER_01", "text": "민서씨, 이번 회의 안건 발표해주세요", "time": 10.5},  // 이름 언급 지점
       {"index": 1, "speaker": "SPEAKER_00", "text": "네, 알겠습니다", "time": 12.3},
       {"index": 2, "speaker": "SPEAKER_00", "text": "이번 분기 목표는...", "time": 13.5},
       {"index": 3, "speaker": "SPEAKER_01", "text": "좋은 내용이네요", "time": 18.0},
       {"index": 4, "speaker": "SPEAKER_00", "text": "감사합니다", "time": 19.0},
       {"index": 5, "speaker": "SPEAKER_01", "text": "추가 질문 있으신가요", "time": 20.0}
     ]
   }
   ```

3. **(멀티턴 LLM 추론):** LLM에게 문맥을 제공하고 **대화형 방식**으로 화자를 추론합니다.
   ```python
   # Turn 1: 첫 번째 이름 언급 분석
   """
   [User]
   다음은 회의 대화 기록입니다. 화자를 특정해야 합니다.

   대화 문맥 (이름 "민서" 언급 지점 전후 5문장):
   - SPEAKER_00: "오늘 회의 시작하겠습니다"
   - SPEAKER_01: "네, 준비 완료했습니다"
   - SPEAKER_00: "첫 번째 안건은 무엇인가요"
   - SPEAKER_01: "저희 팀에서 준비한 내용입니다"
   - SPEAKER_00: "그럼 발표 부탁드립니다"
   - SPEAKER_01: "민서씨, 이번 회의 안건 발표해주세요"  ← 이름 언급
   - SPEAKER_00: "네, 알겠습니다"
   - SPEAKER_00: "이번 분기 목표는..."
   - SPEAKER_01: "좋은 내용이네요"
   - SPEAKER_00: "감사합니다"
   - SPEAKER_01: "추가 질문 있으신가요"

   질문: "민서"는 SPEAKER_00과 SPEAKER_01 중 누구일까요? 근거와 함께 답변해주세요.
   """

   # LLM 응답:
   {
     "identified_speaker": "SPEAKER_00",
     "reasoning": "SPEAKER_01이 '민서씨, 이번 회의 안건 발표해주세요'라고 말한 후, SPEAKER_00이 '네, 알겠습니다'로 응답하고 실제로 발표를 시작했습니다. 따라서 민서는 SPEAKER_00입니다.",
     "confidence": 0.85
   }

   # 시스템: 스코어 기록
   speaker_scores = {
     "민서": {
       "SPEAKER_00": 0.85,
       "SPEAKER_01": 0.15
     }
   }
   ```

   ```python
   # Turn 2: 같은 이름이 다시 언급된 경우
   """
   [User]
   이전 분석에서 "민서"가 SPEAKER_00일 확률이 85%였습니다.

   새로운 대화 문맥 (30초 후, "민서" 재언급):
   - SPEAKER_01: "민서씨 의견에 동의합니다"
   - SPEAKER_00: "네, 감사합니다"
   - SPEAKER_01: "그럼 이 방향으로 진행하죠"

   질문: 이 문맥에서도 "민서"가 SPEAKER_00이 맞나요?
   """

   # LLM 응답:
   {
     "identified_speaker": "SPEAKER_00",
     "reasoning": "SPEAKER_01이 '민서씨 의견에 동의합니다'라고 말한 후, SPEAKER_00이 '네, 감사합니다'로 응답했습니다. 이전 분석과 일치합니다.",
     "confidence": 0.95,
     "consistency": true
   }

   # 시스템: 스코어 업데이트 (일치하므로 가중 평균으로 상향)
   speaker_scores["민서"]["SPEAKER_00"] = (0.85 + 0.95) / 2 = 0.90
   ```

   ```python
   # Turn 3: 모순된 문맥이 나타난 경우
   """
   [User]
   이전 분석에서 "민서"가 SPEAKER_00일 확률이 90%였습니다.

   새로운 대화 문맥 (1분 후):
   - SPEAKER_00: "민서씨는 어떻게 생각하세요?"
   - SPEAKER_01: "저는 이렇게 생각합니다"

   질문: 이 문맥은 이전 분석과 모순되나요?
   """

   # LLM 응답:
   {
     "identified_speaker": "SPEAKER_01",
     "reasoning": "SPEAKER_00이 '민서씨는 어떻게 생각하세요?'라고 질문하고, SPEAKER_01이 답변했습니다. 이는 민서가 SPEAKER_01임을 시사합니다. 이전 분석과 모순됩니다.",
     "confidence": 0.80,
     "consistency": false,
     "conflict_detected": true
   }

   # 시스템: 스코어 재조정 (모순 발견 - 낮은 쪽으로 하향)
   speaker_scores["민서"]["SPEAKER_00"] = 0.90 * 0.7 = 0.63
   speaker_scores["민서"]["SPEAKER_01"] = 0.10 + 0.80 * 0.3 = 0.34

   # 시스템: 사용자에게 수동 확인 요청 플래그 설정
   needs_manual_review = true
   ```

4. **(유사/동명 처리):** 만약 같은 화자가 "민서", "인서"로 불렸다면, 음성 임베딩 유사도를 비교하여 동일인 여부를 확인합니다.
   ```python
   # 음성 임베딩 유사도 계산
   similarity = cosine_similarity(
     embeddings["SPEAKER_00"],  # "민서"로 추론된 화자
     embeddings["SPEAKER_01"]   # "인서"로 추론된 화자
   )

   if similarity > 0.9:
     # 높은 유사도 → 동일인 가능성
     llm_prompt = """
     "민서"와 "인서"가 같은 사람을 지칭할 가능성이 있습니다.
     음성 유사도: 92%

     문맥 1 (민서 언급): ...
     문맥 2 (인서 언급): ...

     이 두 이름이 같은 사람인가요, 아니면 다른 사람인가요?
     """
   ```

---

#### **방식 2: 역할 기반 클러스터링 (Role-based Clustering)**

이름이 언급되지 않은 경우 또는 보조 수단으로 사용합니다.

1. **(발화량 분석):** 각 화자의 총 발화 시간과 횟수를 계산합니다.
   ```python
   {
     "SPEAKER_00": {"duration": 180.5, "turn_count": 45},  # 가장 많이 말함
     "SPEAKER_01": {"duration": 95.3, "turn_count": 30},
     "SPEAKER_02": {"duration": 50.1, "turn_count": 15}
   }
   ```

2. **(발화 패턴 분석):** LLM을 사용하여 각 화자의 역할을 추론합니다.
   ```python
   # LLM 프롬프트
   """
   SPEAKER_00의 발화 샘플:
   - "오늘 회의를 시작하겠습니다"
   - "다음 안건으로 넘어가겠습니다"
   - "시간 관계상 마무리하겠습니다"

   SPEAKER_01의 발화 샘플:
   - "제 생각에는 ~입니다"
   - "이 부분에 대해 말씀드리자면"

   질문: 각 화자의 역할을 추론해주세요.
   """
   # LLM 응답:
   # SPEAKER_00: "진행자" (회의 흐름 제어)
   # SPEAKER_01: "발표자" (내용 설명)
   ```

3. **(클러스터링 결과 생성):** 발화량과 패턴을 종합하여 역할을 부여합니다.
   ```python
   {
     "SPEAKER_00": {"role": "진행자", "confidence": 0.92},
     "SPEAKER_01": {"role": "발표자", "confidence": 0.85},
     "SPEAKER_02": {"role": "참여자", "confidence": 0.78}
   }
   ```

---

#### **두 방식 결합 전략**

- **이름이 일부만 감지된 경우**: 방식 1로 확정 + 방식 2로 미확정 화자 추론
- **이름이 전혀 없는 경우**: 방식 2만 사용하여 역할 기반 라벨링
- **최종 제안**: 두 방식의 결과를 통합하여 사용자에게 제시

### 5d. UI로 전달 (사용자 검증 요청)

- **Output (to UI):**JSON
    - 2가지 방식의 결과를 통합하여 전달합니다.

    ```python
    {
      "tagging_method": "hybrid",  // "name_based", "role_based", "hybrid"
      "detected_names": ["민서", "인서"],  // 방식 1에서 감지된 이름
      "suggested_mappings": [
        {
          "label": "SPEAKER_00",
          "suggested_name": "민서",  // 방식 1 결과 (이름)
          "suggested_role": "진행자",  // 방식 2 결과 (역할)
          "name_confidence": 0.90,  // 멀티턴 LLM 최종 스코어
          "role_confidence": 0.92,
          "name_mentions": 3,  // 이름이 언급된 횟수
          "conflict_detected": false,  // 모순 발견 여부
          "needs_manual_review": false,  // 수동 확인 필요 여부
          "stats": {
            "duration": 180.5,  // 총 발화 시간 (초)
            "turn_count": 45    // 발화 횟수
          }
        },
        {
          "label": "SPEAKER_01",
          "suggested_name": "인서",  // 이름 감지됨
          "suggested_role": "발표자",  // 역할 추론됨
          "name_confidence": 0.63,  // 낮은 신뢰도 (모순 발견)
          "role_confidence": 0.85,
          "name_mentions": 2,
          "conflict_detected": true,  // ⚠️ 모순 발견!
          "needs_manual_review": true,  // ⚠️ 사용자 확인 필요
          "stats": {
            "duration": 95.3,
            "turn_count": 30
          }
        },
        {
          "label": "SPEAKER_02",
          "suggested_name": null,  // 이름 감지 안됨
          "suggested_role": "참여자",  // 역할만 추론됨
          "name_confidence": null,
          "role_confidence": 0.78,
          "name_mentions": 0,
          "conflict_detected": false,
          "needs_manual_review": false,
          "stats": {
            "duration": 50.1,
            "turn_count": 15
          }
        }
      ]
    }
    ```
    

### 5e. UI로부터 입력 (사용자 확정)

- **Input (from UI):**JSON
    - 사용자가 제안을 검토하고 최종 수정한 매핑 정보.
    
    ```python
    {
      "SPEAKER_00": "김민서", // (사용자가 '민서'를 '김민서'로 수정)
      "SPEAKER_01": "박철수"  // (사용자가 'null'을 '박철수'로 입력)
    }
    ```
    

### 5f. 최종 결과물 (애플리케이션 전달)

- **Output (to Application):**JSON
    - 3번(STT), 4번(Diarization)의 결과를 5e(사용자 확정) 값 기준으로 **최종 병합**합니다.
    
    ```python
    [
      {
        "speaker_name": "김민서",
        "start_time": 0.4,
        "end_time": 3.5,
        "text": "오늘 회의 안건은..."
      },
      {
        "speaker_name": "박철수",
        "start_time": 3.6,
        "end_time": 5.8,
        "text": "네, 민서씨 안건부터..."
      },
      {
        "speaker_name": "김민서",
        "start_time": 5.9,
        "end_time": 8.1,
        "text": "좋습니다. 그럼..."
      }
    ]
    ```
    

---

### 6. [모듈] Application Router (응용)

- **Input (from Tagger & Merge):** `List[FinalTranscript]` (5f 결과)
- **Output (to User):**
    - **(요약):** 5f의 `text`를 모두 취합해 LLM에 전달 -> `String` (요약문)
    - **(RAG):** 5f의 각 항목을 Vector DB에 저장 (작업 수행)
    - **(자막):** 5f의 정보를 `String` (.srt 또는 .vtt 포맷)으로 변환