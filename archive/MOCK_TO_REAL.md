# Mock 데이터를 실제 AI 모델로 교체하기

## 개요

현재 프로젝트는 **Phase 1 (웹 인프라 구축)** 단계로, 모든 AI 처리 로직이 **Mock 데이터**로 구현되어 있습니다.
이 문서는 Phase 2로 진입할 때 Mock 데이터를 실제 AI 모델로 교체하는 방법을 설명합니다.

## 최신 업데이트 (2025-11-22)

**실제 구현 완료:**
- ✅ STT (Whisper - Local/API 모드)
- ✅ Diarization (Senko / NeMo)
- ✅ 전처리 (VAD, 노이즈 제거, 청크 분할)
- ✅ NER (이름 감지)
- ✅ 화자-이름 매칭

**추가 예정:**
- 🎯 **RAG 시스템** (실제 구현)
- 📊 **더미 UI 기능들** (회의 템플릿, 정량적 차트, 날짜 입력 등)

---

## 현재 Mock 데이터 사용 위치

### 1. 파일 업로드 (`backend/app/api/v1/upload.py`)
- **Mock:** 파일을 `/app/uploads`에 저장만 하고 실제 처리 X
- **실제 구현 필요:**
  - 오디오 파일 포맷 변환 (→ WAV)
  - 오디오 메타데이터 추출 (길이, 샘플레이트 등)

### 2. 전처리 (현재 구현 안됨)
- **Mock:** 없음 (로딩 화면에서 시뮬레이션만)
- **실제 구현 필요:**
  - VAD (Voice Activity Detection)
  - 노이즈 제거
  - 두 개의 파일 생성 (STT용, Diarization용)

### 3. STT (현재 구현 안됨)
- **Mock:** `backend/app/api/v1/tagging.py`의 하드코딩된 텍스트
- **실제 구현 필요:**
  - Whisper 모델 통합
  - 단어별 타임스탬프 추출

### 4. 화자 분리 (현재 구현 안됨)
- **Mock:** `backend/app/api/v1/tagging.py`의 하드코딩된 SPEAKER_00, SPEAKER_01
- **실제 구현 필요:**
  - Diarization 모델 통합 (pyannote.audio, NeMo 등)
  - 화자별 임베딩 벡터 추출

### 5. 이름 감지 (`backend/app/api/v1/tagging.py`)
- **Mock:** `["민서", "인서", "김팀장"]` 하드코딩
- **실제 구현 필요:**
  - NER (Named Entity Recognition)
  - 한국어 이름 패턴 감지

### 6. 요약 (`frontend/src/pages/ResultPage.jsx`)
- **Mock:** 프론트엔드에 하드코딩된 텍스트
- **실제 구현 필요:**
  - LLM API 연동 (GPT, Claude 등)
  - 프롬프트 엔지니어링

---

## 교체 로드맵

### Step 1: 전처리 모듈 구현

#### 파일 위치
```
backend/app/services/preprocessing.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/preprocessing.py

import librosa
import noisereduce as nr
from pydub import AudioSegment
import os

class AudioPreprocessor:
    def __init__(self):
        self.sample_rate = 16000  # Whisper 권장 샘플레이트

    def process(self, input_path: str, output_dir: str) -> dict:
        """
        오디오 전처리
        Returns:
            {
                "stt_input_path": str,  # VAD만 적용
                "diar_input_path": str  # VAD + 노이즈 제거
            }
        """
        # 1. 오디오 로드
        audio, sr = librosa.load(input_path, sr=self.sample_rate)

        # 2. VAD 적용 (묵음 제거)
        vad_audio = self._apply_vad(audio, sr)

        # 3. STT용 파일 저장 (VAD만)
        stt_path = os.path.join(output_dir, "stt_input.wav")
        librosa.output.write_wav(stt_path, vad_audio, sr)

        # 4. 노이즈 제거
        clean_audio = nr.reduce_noise(y=vad_audio, sr=sr)

        # 5. Diarization용 파일 저장 (VAD + 노이즈 제거)
        diar_path = os.path.join(output_dir, "diar_input.wav")
        librosa.output.write_wav(diar_path, clean_audio, sr)

        return {
            "stt_input_path": stt_path,
            "diar_input_path": diar_path
        }

    def _apply_vad(self, audio, sr):
        # TODO: VAD 로직 구현
        # 예: webrtcvad, silero-vad 등 사용
        return audio
```

#### API 수정
```python
# backend/app/api/v1/upload.py

from app.services.preprocessing import AudioPreprocessor

@router.post("/upload", response_model=AudioFileUploadResponse)
async def upload_audio_file(file: UploadFile = File(...)):
    # ... 파일 저장 로직 ...

    # [추가] 전처리 실행
    preprocessor = AudioPreprocessor()
    result = preprocessor.process(file_path, upload_dir)

    # DB에 저장 (현재는 메모리)
    UPLOADED_FILES[file_id]["preprocessing"] = result

    return AudioFileUploadResponse(...)
```

---

### Step 2: STT 모듈 구현 (Whisper)

#### 파일 위치
```
backend/app/services/stt_service.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/stt_service.py

import whisper

class STTService:
    def __init__(self, model_size: str = "medium"):
        """
        model_size: tiny, base, small, medium, large
        """
        self.model = whisper.load_model(model_size)

    def transcribe(self, audio_path: str) -> list:
        """
        STT 수행
        Returns: I,O.md Step 3 형식
            [
                {"text": "네", "start": 3.6, "end": 3.8},
                {"text": "민서씨", "start": 3.9, "end": 4.5},
                ...
            ]
        """
        result = self.model.transcribe(
            audio_path,
            language="ko",
            word_timestamps=True  # 단어별 타임스탬프
        )

        word_segments = []
        for segment in result["segments"]:
            for word in segment.get("words", []):
                word_segments.append({
                    "text": word["word"],
                    "start": word["start"],
                    "end": word["end"]
                })

        return word_segments
```

#### requirements.txt 추가
```txt
openai-whisper==20231117
```

#### API 수정
```python
# backend/app/api/v1/tagging.py

from app.services.stt_service import STTService

stt_service = STTService(model_size="medium")

@router.get("/tagging/{file_id}")
async def get_tagging_suggestion(file_id: str):
    # [수정] Mock 대신 실제 STT 실행
    file_info = UPLOADED_FILES[file_id]
    stt_input_path = file_info["preprocessing"]["stt_input_path"]

    stt_results = stt_service.transcribe(stt_input_path)

    # stt_results를 기반으로 이름 감지 로직 실행
    # ...
```

---

### Step 3: 화자 분리 모듈 구현

#### 파일 위치
```
backend/app/services/diarization_service.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/diarization_service.py

from pyannote.audio import Pipeline

class DiarizationService:
    def __init__(self):
        # Hugging Face 토큰 필요
        self.pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token="YOUR_HF_TOKEN"
        )

    def diarize(self, audio_path: str) -> dict:
        """
        화자 분리
        Returns: I,O.md Step 4 형식
            {
                "turns": [
                    {"speaker_label": "SPEAKER_00", "start": 0.4, "end": 3.5},
                    {"speaker_label": "SPEAKER_01", "start": 3.6, "end": 5.8},
                    ...
                ],
                "embeddings": {
                    "SPEAKER_00": [0.12, -0.45, ...],
                    "SPEAKER_01": [-0.33, 0.76, ...]
                }
            }
        """
        diarization = self.pipeline(audio_path)

        turns = []
        embeddings = {}

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            turns.append({
                "speaker_label": speaker,
                "start": turn.start,
                "end": turn.end
            })

            # 임베딩 추출 (pyannote의 경우)
            if speaker not in embeddings:
                embeddings[speaker] = self._extract_embedding(audio_path, turn)

        return {
            "turns": turns,
            "embeddings": embeddings
        }

    def _extract_embedding(self, audio_path: str, turn):
        # TODO: 화자별 임베딩 벡터 추출
        # 동일인 판별에 사용
        pass
```

#### requirements.txt 추가
```txt
pyannote.audio==3.1.1
torch>=2.0.0
```

---

### Step 4: 이름 감지 로직 구현

#### 파일 위치
```
backend/app/services/tagging_service.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/tagging_service.py

import re
from konlpy.tag import Okt

class NameDetectionService:
    def __init__(self):
        self.okt = Okt()
        # 한국어 이름 패턴
        self.name_patterns = [
            r"([가-힣]{2,3})(씨|님|선생님|교수님|팀장|부장|과장)",
            r"([가-힣]{2,3})\s*(분|이)",
        ]

    def detect_names(self, stt_results: list, diarization_results: dict) -> dict:
        """
        I,O.md Step 5a~5c 구현
        Returns:
            {
                "detected_names": ["민서", "인서", "김팀장"],
                "suggested_mappings": [
                    {
                        "speaker_label": "SPEAKER_00",
                        "suggested_name": "민서"  # 임베딩 유사도로 판단
                    },
                    ...
                ]
            }
        """
        # 1. STT 결과에서 이름 추출
        detected_names = []
        name_occurrences = {}  # {이름: [(시간, SPEAKER_XX), ...]}

        for word_segment in stt_results:
            text = word_segment["text"]
            time = word_segment["start"]

            # 패턴 매칭
            for pattern in self.name_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    name = match[0] if isinstance(match, tuple) else match
                    detected_names.append(name)

                    # 어느 화자가 말했는지 확인
                    speaker = self._find_speaker_at_time(time, diarization_results)

                    if name not in name_occurrences:
                        name_occurrences[name] = []
                    name_occurrences[name].append((time, speaker))

        # 2. 이름과 화자 매칭 (I,O.md Step 5b~5c)
        suggested_mappings = self._match_names_to_speakers(
            name_occurrences,
            diarization_results
        )

        return {
            "detected_names": list(set(detected_names)),
            "suggested_mappings": suggested_mappings
        }

    def _find_speaker_at_time(self, time: float, diarization_results: dict) -> str:
        """해당 시간대에 말하고 있는 화자 찾기"""
        for turn in diarization_results["turns"]:
            if turn["start"] <= time <= turn["end"]:
                return turn["speaker_label"]
        return None

    def _match_names_to_speakers(self, name_occurrences: dict, diarization_results: dict) -> list:
        """
        이름과 화자 매칭
        - "민서씨"라고 불린 시점의 화자가 누구인지 확인
        - 대화 문맥상 "민서"는 다른 사람이 부르는 이름
        - 임베딩 유사도로 "민서"와 "인서"가 같은 사람인지 판단
        """
        # TODO: 복잡한 로직 구현
        # I,O.md Step 5c 참조
        pass
```

#### requirements.txt 추가
```txt
konlpy==0.6.0
```

---

### Step 5: 병합 로직 구현

#### 파일 위치
```
backend/app/services/merge_service.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/merge_service.py

class MergeService:
    def merge(self, stt_results: list, diarization_results: dict, speaker_mappings: dict) -> list:
        """
        STT + Diarization 병합 (I,O.md Step 5f)

        Args:
            stt_results: STT 단어별 결과
            diarization_results: 화자 분리 결과
            speaker_mappings: {"SPEAKER_00": "김민서", ...}

        Returns: 최종 대본
            [
                {
                    "speaker_name": "김민서",
                    "start_time": 0.4,
                    "end_time": 3.5,
                    "text": "오늘 회의 안건은..."
                },
                ...
            ]
        """
        # 최대 겹침 알고리즘
        final_transcript = []

        # 화자별 발화 구간 그룹화
        speaker_segments = self._group_by_speaker(stt_results, diarization_results)

        for segment in speaker_segments:
            speaker_label = segment["speaker_label"]
            speaker_name = speaker_mappings.get(speaker_label, "Unknown")

            final_transcript.append({
                "speaker_name": speaker_name,
                "start_time": segment["start"],
                "end_time": segment["end"],
                "text": segment["text"]
            })

        return final_transcript

    def _group_by_speaker(self, stt_results: list, diarization_results: dict) -> list:
        """
        STT 단어들을 화자별 발화 구간으로 그룹화
        최대 겹침 알고리즘 사용
        """
        segments = []
        current_speaker = None
        current_text = []
        current_start = None
        current_end = None

        for word_segment in stt_results:
            word_time = (word_segment["start"] + word_segment["end"]) / 2

            # 이 단어를 말한 화자 찾기 (최대 겹침)
            speaker = self._find_speaker_max_overlap(
                word_segment["start"],
                word_segment["end"],
                diarization_results["turns"]
            )

            if speaker != current_speaker:
                # 화자 변경 → 이전 발화 저장
                if current_speaker is not None:
                    segments.append({
                        "speaker_label": current_speaker,
                        "start": current_start,
                        "end": current_end,
                        "text": " ".join(current_text)
                    })

                # 새 발화 시작
                current_speaker = speaker
                current_text = [word_segment["text"]]
                current_start = word_segment["start"]
                current_end = word_segment["end"]
            else:
                # 같은 화자 → 텍스트 추가
                current_text.append(word_segment["text"])
                current_end = word_segment["end"]

        # 마지막 발화 저장
        if current_speaker is not None:
            segments.append({
                "speaker_label": current_speaker,
                "start": current_start,
                "end": current_end,
                "text": " ".join(current_text)
            })

        return segments

    def _find_speaker_max_overlap(self, word_start: float, word_end: float, turns: list) -> str:
        """
        최대 겹침 알고리즘
        단어 타임스탬프와 화자 구간의 겹침을 계산하여
        가장 많이 겹치는 화자 반환
        """
        max_overlap = 0
        best_speaker = None

        for turn in turns:
            overlap = self._calculate_overlap(
                word_start, word_end,
                turn["start"], turn["end"]
            )

            if overlap > max_overlap:
                max_overlap = overlap
                best_speaker = turn["speaker_label"]

        return best_speaker

    def _calculate_overlap(self, start1: float, end1: float, start2: float, end2: float) -> float:
        """두 구간의 겹침 시간 계산"""
        overlap_start = max(start1, start2)
        overlap_end = min(end1, end2)
        return max(0, overlap_end - overlap_start)
```

---

### Step 6: RAG 시스템 구현 (우선순위 높음)

#### 개요
RAG (Retrieval-Augmented Generation)는 회의록 전체를 벡터 DB에 저장하고, 사용자 질문에 대해 관련 대화 구간을 검색하여 LLM에 컨텍스트를 제공하는 시스템입니다.

#### 아키텍처
```
[회의록 대본]
    ↓
[청크 분할] (발화 단위 또는 시간 단위)
    ↓
[임베딩 생성] (SentenceTransformer)
    ↓
[벡터 DB 저장] (ChromaDB / FAISS)
    ↓
[사용자 질문] → [유사도 검색] → [Top-K 발화 추출]
    ↓
[LLM 답변 생성] (검색된 발화를 컨텍스트로 제공)
```

#### 파일 위치
```
backend/app/services/rag_service.py (신규 생성)
backend/app/services/vector_store.py (신규 생성)
backend/app/api/v1/rag.py (신규 생성)
```

#### 구현 내용

##### 1. 벡터 스토어 서비스
```python
# backend/app/services/vector_store.py

import chromadb
from sentence_transformers import SentenceTransformer
from typing import List, Dict

class VectorStoreService:
    def __init__(self):
        # ChromaDB 클라이언트 초기화
        self.client = chromadb.PersistentClient(path="/app/data/chromadb")

        # 임베딩 모델 (한국어 지원)
        self.embedding_model = SentenceTransformer('jhgan/ko-sroberta-multitask')

    def create_collection(self, file_id: str):
        """파일별 컬렉션 생성"""
        collection_name = f"meeting_{file_id}"
        return self.client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_transcripts(self, file_id: str, transcripts: List[Dict]):
        """
        대본을 벡터 DB에 저장

        Args:
            file_id: 파일 ID
            transcripts: [
                {
                    "speaker_name": "김민서",
                    "text": "오늘 회의 안건은...",
                    "start_time": 0.4,
                    "end_time": 3.5
                },
                ...
            ]
        """
        collection = self.client.get_collection(f"meeting_{file_id}")

        # 각 발화를 문서로 저장
        documents = []
        metadatas = []
        ids = []

        for i, segment in enumerate(transcripts):
            # 화자 이름 + 발화 내용을 하나의 문서로
            doc_text = f"{segment['speaker_name']}: {segment['text']}"
            documents.append(doc_text)

            metadatas.append({
                "speaker": segment['speaker_name'],
                "start_time": segment['start_time'],
                "end_time": segment['end_time'],
                "index": i
            })

            ids.append(f"{file_id}_{i}")

        # 임베딩 생성 및 저장
        embeddings = self.embedding_model.encode(documents).tolist()

        collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def search(self, file_id: str, query: str, top_k: int = 5) -> List[Dict]:
        """
        질문과 유사한 발화 검색

        Args:
            file_id: 파일 ID
            query: 사용자 질문
            top_k: 반환할 발화 개수

        Returns:
            [
                {
                    "speaker": "김민서",
                    "text": "오늘 회의 안건은...",
                    "start_time": 0.4,
                    "end_time": 3.5,
                    "score": 0.87
                },
                ...
            ]
        """
        collection = self.client.get_collection(f"meeting_{file_id}")

        # 질문 임베딩 생성
        query_embedding = self.embedding_model.encode([query]).tolist()

        # 유사도 검색
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=top_k
        )

        # 결과 포맷팅
        formatted_results = []
        for i in range(len(results['ids'][0])):
            metadata = results['metadatas'][0][i]
            document = results['documents'][0][i]
            distance = results['distances'][0][i]

            # 거리를 유사도 점수로 변환 (cosine distance -> similarity)
            similarity = 1 - distance

            formatted_results.append({
                "speaker": metadata['speaker'],
                "text": document.split(": ", 1)[1],  # "화자: 내용"에서 내용만 추출
                "start_time": metadata['start_time'],
                "end_time": metadata['end_time'],
                "score": round(similarity, 2)
            })

        return formatted_results
```

##### 2. RAG 서비스
```python
# backend/app/services/rag_service.py

from openai import OpenAI
from typing import List, Dict
from .vector_store import VectorStoreService

class RAGService:
    def __init__(self):
        self.vector_store = VectorStoreService()
        self.llm_client = OpenAI(api_key="YOUR_API_KEY")

    def answer_question(self, file_id: str, question: str) -> Dict:
        """
        RAG 기반 질문 답변

        Args:
            file_id: 파일 ID
            question: 사용자 질문

        Returns:
            {
                "answer": "LLM이 생성한 답변",
                "sources": [
                    {
                        "speaker": "김민서",
                        "text": "관련 발화 내용",
                        "start_time": 0.4,
                        "end_time": 3.5,
                        "score": 0.87
                    },
                    ...
                ]
            }
        """
        # 1. 벡터 DB에서 관련 발화 검색
        relevant_segments = self.vector_store.search(
            file_id=file_id,
            query=question,
            top_k=5
        )

        # 2. 컨텍스트 구성
        context = "\n\n".join([
            f"[{seg['start_time']:.1f}s - {seg['end_time']:.1f}s] "
            f"{seg['speaker']}: {seg['text']}"
            for seg in relevant_segments
        ])

        # 3. LLM 프롬프트 생성
        prompt = f"""
다음은 회의록의 일부입니다. 사용자의 질문에 대해 회의록 내용을 기반으로 답변해주세요.

<회의록>
{context}
</회의록>

<질문>
{question}
</질문>

답변 시 다음 규칙을 따르세요:
1. 회의록에 명시된 내용만 답변하세요.
2. 추측이나 외부 지식은 사용하지 마세요.
3. 답변 시 "XX초 구간에서 OO님이 언급했듯이..." 형식으로 출처를 밝히세요.
4. 회의록에 관련 내용이 없으면 "회의록에서 관련 내용을 찾을 수 없습니다"라고 답변하세요.
"""

        # 4. LLM 호출
        response = self.llm_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 회의록 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3  # 낮은 온도로 정확성 높임
        )

        answer = response.choices[0].message.content

        return {
            "answer": answer,
            "sources": relevant_segments
        }
```

##### 3. API 엔드포인트
```python
# backend/app/api/v1/rag.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.rag_service import RAGService
from sqlalchemy.orm import Session
from app.api.deps import get_db
from fastapi import Depends

router = APIRouter()
rag_service = RAGService()

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list

@router.post("/rag/{file_id}/index")
async def index_transcript(file_id: str, db: Session = Depends(get_db)):
    """
    회의록을 벡터 DB에 인덱싱
    (태깅 완료 후 자동 호출 또는 수동 트리거)
    """
    # DB에서 최종 대본 가져오기
    from app.models.stt import STTResult

    stt_results = db.query(STTResult).filter(
        STTResult.audio_file_id == int(file_id)
    ).order_by(STTResult.start_time).all()

    if not stt_results:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다.")

    # 대본 포맷 변환
    transcripts = [
        {
            "speaker_name": result.speaker_name or "Unknown",
            "text": result.text,
            "start_time": result.start_time,
            "end_time": result.end_time
        }
        for result in stt_results
    ]

    # 벡터 DB에 저장
    try:
        rag_service.vector_store.create_collection(file_id)
        rag_service.vector_store.add_transcripts(file_id, transcripts)

        return {
            "message": "인덱싱 완료",
            "indexed_segments": len(transcripts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인덱싱 실패: {str(e)}")

@router.post("/rag/{file_id}/ask", response_model=AnswerResponse)
async def ask_question(file_id: str, request: QuestionRequest):
    """
    회의록에 대해 질문하기
    """
    try:
        result = rag_service.answer_question(file_id, request.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"질문 처리 실패: {str(e)}")
```

#### requirements.txt 추가
```txt
sentence-transformers==2.2.2
chromadb==0.4.22
openai>=1.0.0
```

#### 사용 흐름
1. **인덱싱**: 태깅 완료 후 `POST /api/v1/rag/{file_id}/index` 호출
2. **질문**: 결과 페이지에서 `POST /api/v1/rag/{file_id}/ask` 호출

#### 프론트엔드 통합 예시
```jsx
// ResultPageNew.jsx에 RAG 탭 추가

const [question, setQuestion] = useState('')
const [answer, setAnswer] = useState(null)
const [isLoading, setIsLoading] = useState(false)

const handleAskQuestion = async () => {
  setIsLoading(true)
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/rag/${fileId}/ask`,
      { question }
    )
    setAnswer(response.data)
  } catch (error) {
    console.error('질문 실패:', error)
  } finally {
    setIsLoading(false)
  }
}

// UI
<div>
  <input
    value={question}
    onChange={(e) => setQuestion(e.target.value)}
    placeholder="회의록에 대해 질문하세요..."
  />
  <button onClick={handleAskQuestion}>질문하기</button>

  {answer && (
    <div>
      <h3>답변:</h3>
      <p>{answer.answer}</p>

      <h4>출처:</h4>
      {answer.sources.map((src, i) => (
        <div key={i}>
          [{src.start_time}s] {src.speaker}: {src.text}
          (유사도: {src.score})
        </div>
      ))}
    </div>
  )}
</div>
```

---

### Step 7: 요약 기능 구현 (LLM) - 선택적

#### 파일 위치
```
backend/app/services/llm_service.py (신규 생성)
backend/app/api/v1/summary.py (신규 생성)
```

#### 구현 내용
```python
# backend/app/services/llm_service.py

from openai import OpenAI

class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key="YOUR_API_KEY")

    def summarize(self, transcript: list) -> dict:
        """
        최종 대본을 요약
        Returns:
            {
                "summary": "핵심 내용...",
                "key_points": ["결정 사항 1", "결정 사항 2"],
                "action_items": ["액션 아이템 1", ...]
            }
        """
        # 대본을 텍스트로 변환
        text = "\n".join([
            f"{seg['speaker_name']}: {seg['text']}"
            for seg in transcript
        ])

        prompt = f"""
다음은 회의 대본입니다. 요약해주세요.

{text}

다음 형식으로 요약:
1. 핵심 내용 (2-3문장)
2. 주요 결정 사항
3. 액션 아이템
"""

        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 회의록 요약 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
        )

        # 응답 파싱 및 구조화
        # ...

        return {
            "summary": "...",
            "key_points": [...],
            "action_items": [...]
        }
```

#### API 생성
```python
# backend/app/api/v1/summary.py

from fastapi import APIRouter
from app.services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()

@router.get("/summary/{file_id}")
async def get_summary(file_id: str):
    # 태깅 결과에서 최종 대본 가져오기
    result = TAGGING_RESULTS[file_id]
    final_transcript = result["final_transcript"]

    # LLM으로 요약
    summary = llm_service.summarize(final_transcript)

    return summary
```

#### requirements.txt 추가
```txt
openai>=1.0.0
```

---

## 교체 체크리스트

### Phase 2 시작 전 확인사항

- [ ] 전처리 방식 확정 (VAD, 노이즈 제거 기법)
- [ ] Diarization 모델 선정 및 성능 테스트 완료
- [ ] 테스트 데이터셋 구축 (다양한 소음 환경)
- [ ] KPI 목표 달성 가능 여부 검증 (WER 90%, DER 90%)

### 모듈별 교체 순서

1. **전처리 모듈** → STT와 Diarization의 입력 생성
2. **STT 모듈** → 텍스트 추출
3. **Diarization 모듈** → 화자 분리
4. **이름 감지 + 병합** → 태깅 제안
5. **LLM 요약** → 부가 기능

### Mock → Real 교체 시 주의사항

1. **DB 사용 시작**
   - 현재 메모리 저장 → DB 저장으로 변경
   - `UPLOADED_FILES`, `TAGGING_RESULTS` 딕셔너리 제거
   - SQLAlchemy 모델 활용

2. **비동기 처리**
   - AI 처리는 시간이 오래 걸림
   - Celery, RQ 등 Task Queue 도입 검토
   - WebSocket으로 실시간 진행률 전달

3. **에러 핸들링**
   - AI 모델 실패 시 재시도 로직
   - 타임아웃 설정
   - 사용자 친화적인 오류 메시지

4. **성능 최적화**
   - GPU 활용 (Whisper, Diarization)
   - 모델 캐싱
   - 배치 처리

---

## Frontend 수정 사항

### 1. 로딩 화면 업데이트

```jsx
// frontend/src/pages/ProcessingPage.jsx

// [수정] Mock 시뮬레이션 대신 실제 API 폴링
useEffect(() => {
  const pollStatus = setInterval(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/status/${fileId}`);

      if (response.data.status === 'completed') {
        clearInterval(pollStatus);
        navigate(`/tagging/${fileId}`);
      } else if (response.data.status === 'failed') {
        clearInterval(pollStatus);
        setError('처리 중 오류가 발생했습니다.');
      } else {
        // 진행률 업데이트
        setProgress(response.data.progress);
        setCurrentStep(response.data.current_step);
      }
    } catch (err) {
      console.error(err);
    }
  }, 2000); // 2초마다 폴링

  return () => clearInterval(pollStatus);
}, [fileId]);
```

### 2. 요약 탭 업데이트

```jsx
// frontend/src/pages/ResultPage.jsx

// [수정] Mock 텍스트 대신 실제 API 호출
useEffect(() => {
  if (activeTab === 'summary') {
    fetchSummary();
  }
}, [activeTab]);

const fetchSummary = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/summary/${fileId}`);
    setSummaryData(response.data);
  } catch (err) {
    console.error(err);
  }
};
```

---

## 테스트 방법

### 1. 단위 테스트

```python
# backend/tests/test_stt_service.py

def test_stt_transcribe():
    service = STTService(model_size="tiny")  # 테스트는 작은 모델
    result = service.transcribe("test_audio.wav")

    assert len(result) > 0
    assert "text" in result[0]
    assert "start" in result[0]
    assert "end" in result[0]
```

### 2. 통합 테스트

```python
# backend/tests/test_full_pipeline.py

def test_full_pipeline():
    # 1. 파일 업로드
    # 2. 전처리
    # 3. STT
    # 4. Diarization
    # 5. 병합
    # 6. 태깅
    # 7. 요약

    # 각 단계의 출력이 I,O.md 형식과 일치하는지 검증
```

### 3. 성능 테스트

```python
import time

def test_performance():
    start = time.time()

    # 10분짜리 오디오 처리
    result = process_audio("10min_audio.wav")

    elapsed = time.time() - start

    # 처리 시간이 합리적인지 확인
    assert elapsed < 600  # 10분 이내
```

---

## 참고 문서

- **I,O.md** - 각 단계별 Input/Output 형식
- **pdr.md** - 전체 파이프라인 설계
- **database_schema.md** - DB 스키마

---

## 문의사항

Mock → Real 교체 중 문제가 발생하면 pdr.md의 "미결정 사항" 섹션을 참고하거나, 팀 회의를 통해 해결하세요.
