# 환경별 설정 가이드

## 📦 설치 방법

### 1️⃣ Mac (Apple Silicon M1/M2/M3)

```bash
# 의존성 설치
pip install -r requirements-base.txt
pip install -r requirements-mac.txt

# Docker 사용 시
docker build -f Dockerfile.mac -t listencare-backend-mac .
```

### 2️⃣ GPU Server (NVIDIA CUDA)

```bash
# 의존성 설치
pip install -r requirements-base.txt
pip install -r requirements-gpu.txt

# Docker 사용 시
docker build -f Dockerfile.gpu -t listencare-backend-gpu .
```

### 3️⃣ CPU Only (Fallback)

```bash
# 의존성 설치
pip install -r requirements-base.txt
pip install -r requirements-mac.txt  # CPU에서도 Mac 버전 사용
```

---

## 🖥️ 디바이스 확인

Python에서 현재 사용 중인 디바이스 확인:

```python
from app.core.device import print_device_info

print_device_info()
```

출력 예시:
```
==================================================
🖥️  Device Configuration
==================================================
device              : mps
platform            : Darwin
machine             : arm64
torch_version       : 2.1.0
mps_available       : True
recommendation      : Apple Silicon detected - using Metal Performance Shaders
==================================================
```

---

## 📋 Requirements 파일 구조

- **requirements-base.txt** - 공통 의존성 (FastAPI, MySQL, OpenAI 등)
- **requirements-mac.txt** - Mac 전용 (PyTorch MPS, Diarization)
- **requirements-gpu.txt** - GPU 전용 (PyTorch CUDA, Diarization)

---

## 🔧 Docker Compose 설정

### Mac 환경
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.mac
```

### GPU 환경
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.gpu
  runtime: nvidia
  environment:
    - NVIDIA_VISIBLE_DEVICES=all
```

---

## ⚠️ 주의사항

1. **Mac에서 CUDA 사용 불가** - M1/M2/M3는 MPS 사용
2. **GPU 서버에서 MPS 사용 불가** - NVIDIA GPU만 CUDA 지원
3. **CPU fallback** - GPU/MPS 없으면 자동으로 CPU 사용 (느림)

---

## 🚀 성능 비교

| 환경 | 디바이스 | 속도 (상대적) | 추천 |
|------|---------|-------------|------|
| Mac M1/M2/M3 | MPS | ⚡⚡⚡ 빠름 | 개발/테스트 |
| NVIDIA GPU | CUDA | ⚡⚡⚡⚡ 매우 빠름 | 프로덕션 |
| CPU only | CPU | ⚡ 느림 | 비추천 |
