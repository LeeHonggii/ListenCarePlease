FROM python:3.11-slim

# 빌드 인자: PLATFORM (cpu, cuda, mac)
ARG PLATFORM=cpu

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-libmysqlclient-dev \
    pkg-config \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements-base.txt .
RUN pip install --no-cache-dir -r requirements-base.txt

# 플랫폼별 의존성 설치
COPY requirements-mac.txt requirements-gpu.txt ./
RUN if [ "$PLATFORM" = "mac" ]; then \
        echo "Installing Mac (CPU) dependencies..." && \
        pip install --no-cache-dir -r requirements-mac.txt; \
    elif [ "$PLATFORM" = "cuda" ]; then \
        echo "Installing CUDA (GPU) dependencies..." && \
        pip install --no-cache-dir -r requirements-gpu.txt; \
    else \
        echo "Installing CPU dependencies..." && \
        pip install --no-cache-dir -r requirements-mac.txt; \
    fi

# Senko 설치 (화자 분리 모델 1) - 플랫폼별 설치
RUN if [ "$PLATFORM" = "cuda" ]; then \
        echo "Installing Senko with NVIDIA support..." && \
        pip install --no-cache-dir "git+https://github.com/narcotic-sh/senko.git#egg=senko[nvidia]"; \
    else \
        echo "Installing Senko (CPU)..." && \
        pip install --no-cache-dir git+https://github.com/narcotic-sh/senko.git; \
    fi

# NeMo 설치 (화자 분리 모델 2) - 선택적 설치
# 주의: NeMo는 용량이 크므로 (~3GB) CUDA 플랫폼에서만 설치
RUN if [ "$PLATFORM" = "cuda" ]; then \
        echo "Installing NeMo Toolkit with ASR support..." && \
        pip install --no-cache-dir nemo-toolkit[asr]==2.0.0rc0 && \
        echo "Upgrading huggingface_hub for NeMo compatibility..." && \
        pip install --no-cache-dir --upgrade huggingface_hub; \
    else \
        echo "Skipping NeMo (only available for CUDA)"; \
    fi

# CUDA 라이브러리 심볼릭 링크 생성 (CUDA 플랫폼인 경우)
RUN if [ "$PLATFORM" = "cuda" ]; then \
        echo "Creating CUDA library symlinks..." && \
        cd /usr/local/lib/python3.11/site-packages/torch/lib && \
        ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so && \
        ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so.11 && \
        ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so.11.2 && \
        ln -sf libnvrtc-builtins.so.11.8 libnvrtc-builtins.so && \
        ls -la libnvrtc*; \
    fi

# Whisper 모델 미리 다운로드 (large-v3, 약 3GB)
# 다운로드만 하고 로드는 하지 않음 (메모리 절약)
RUN python3 -c "import whisper; import os; os.makedirs('/root/.cache/whisper', exist_ok=True); whisper._download(whisper._MODELS['large-v3'], '/root/.cache/whisper', False)"

# 애플리케이션 코드 복사
COPY ./app ./app

# 업로드 디렉토리 및 모델 캐시 디렉토리 생성
RUN mkdir -p /app/uploads /app/temp /app/.cache

# PyTorch 번들 라이브러리 경로 설정 (cuDNN 등)
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/torch/lib:$LD_LIBRARY_PATH

# 포트 노출
EXPOSE 8000

# 서버 실행 (production mode - no reload to prevent interrupting background tasks)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
