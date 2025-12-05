# Docker 구성 GPU 전용 통합 완료 ✅

## 개요
CPU/Mac/CUDA 플랫폼 조건부 로직을 제거하고, GPU 전용 단일 구성으로 통합했습니다.

## 변경 사항

### 1. `backend/Dockerfile`
**Before:**
- ARG PLATFORM=cpu
- 조건부 if 문으로 플랫폼별 의존성 설치
- CUDA 심볼릭 링크 조건부 생성
- 분리된 requirements 파일 (base, gpu, mac)

**After:**
- ARG PLATFORM 완전 제거
- 모든 조건부 로직 제거
- **통합 requirements.txt 사용** (단일 파일)
- GPU 의존성 항상 설치:
  ```dockerfile
  # 통합된 requirements.txt 사용
  RUN pip install -r requirements.txt

  # Senko with NVIDIA support (always)
  RUN pip install "git+https://github.com/narcotic-sh/senko.git#egg=senko[nvidia]"

  # NeMo Toolkit (always)
  RUN pip install nemo-toolkit[asr]==2.0.0rc0

  # CUDA symlinks (always)
  RUN ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so
  ```

### 2. `docker-compose.yml`
**Before:**
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
    args:
      PLATFORM: ${DOCKER_PLATFORM:-cpu}
```

**After:**
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
```

### 3. `.env`
**Before:**
```
DOCKER_PLATFORM=cuda
```

**After:**
- DOCKER_PLATFORM 변수 제거 (더 이상 필요 없음)

### 4. `backend/requirements.txt`
**Before:**
- 분리된 파일 구조:
  - `requirements-base.txt` (공통 의존성)
  - `requirements-gpu.txt` (GPU 전용)
  - `requirements-mac.txt` (CPU 전용)

**After:**
- **단일 통합 파일**: `requirements.txt`
- 모든 의존성을 하나의 파일로 관리
- GPU 전용 패키지 (PyTorch CUDA, pyannote 등) 포함
- 명확한 섹션 구분 (FastAPI, Database, AI/ML Stack 등)

## 포함된 의존성

### Core AI/ML Stack
- **PyTorch**: 2.1.0+cu118 (CUDA 11.8)
- **Whisper**: 20231117 (STT)
- **Senko**: NVIDIA support (Speaker Diarization)
- **NeMo**: 2.0.0rc0 with ASR (Advanced Diarization)

### LangChain & RAG
- **langchain**: 1.0.8
- **langchain-openai**: 1.0.3
- **langchain-community**: 0.4.1
- **langgraph**: 1.0.3
- **langsmith**: 0.4.46
- **chromadb**: 1.3.5
- **langchain-chroma**: 1.0.0

### NLP & Transformers
- **transformers**: 4.36.0
- **huggingface-hub**: 0.23.2
- **accelerate**: 0.25.0

### Audio Processing
- **librosa**: 0.10.1
- **soundfile**: 0.12.1
- **pydub**: 0.25.1
- **scipy**: 1.11.4

## 빌드 방법

이제 단순하게 빌드할 수 있습니다:

```bash
# 빌드
docker-compose build

# 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
```

## 주요 장점

1. **단순화**: 조건부 로직 제거로 빌드 프로세스 단순화
2. **명확성**: GPU 전용이라는 의도가 명확
3. **유지보수**: 하나의 구성만 관리하면 됨
4. **의존성 관리**: 단일 requirements.txt로 패키지 관리 용이
5. **최신 상태**: LangChain, ChromaDB 등 최신 RAG 스택 포함
6. **일관성**: 항상 동일한 환경으로 빌드

## 주의사항

- 이 구성은 NVIDIA GPU가 있는 시스템에서만 작동합니다
- Docker에서 NVIDIA Container Toolkit이 설치되어 있어야 합니다
- CPU 전용 환경에서는 실행할 수 없습니다

## 시스템 요구사항

- NVIDIA GPU (CUDA 11.8 호환)
- NVIDIA Container Toolkit
- Docker & Docker Compose
- 최소 12GB RAM
- 최소 20GB 디스크 공간 (모델 포함)

## 파일 정리

### 사용 중인 파일
- `backend/requirements.txt` ✅ (통합 파일 - 사용 중)
- `backend/Dockerfile` ✅ (업데이트됨)
- `docker-compose.yml` ✅ (업데이트됨)
- `.env` ✅ (업데이트됨)

### 삭제된 레거시 파일
다음 파일들이 삭제되었습니다:
- ~~`backend/requirements-base.txt`~~ (requirements.txt로 통합됨)
- ~~`backend/requirements-gpu.txt`~~ (requirements.txt로 통합됨)
- ~~`backend/requirements-mac.txt`~~ (GPU 전용으로 전환하여 불필요)

## 다음 단계

Docker 이미지를 재빌드하여 새로운 구성을 적용하세요:

```bash
# 기존 이미지 제거 (선택사항)
docker-compose down
docker rmi listencareplease-backend

# 새로 빌드
docker-compose build --no-cache backend

# 실행
docker-compose up -d
```
