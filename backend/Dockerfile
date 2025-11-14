FROM python:3.11-slim

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

# Mac/CPU 환경용 의존성 (Docker는 일반적으로 CPU)
COPY requirements-mac.txt .
RUN pip install --no-cache-dir -r requirements-mac.txt

# Senko 설치 (화자 분리)
RUN pip install --no-cache-dir git+https://github.com/narcotic-sh/senko.git

# Whisper 모델 미리 다운로드 (large-v3, 약 3GB)
# 다운로드만 하고 로드는 하지 않음 (메모리 절약)
RUN python3 -c "import whisper; import os; os.makedirs('/root/.cache/whisper', exist_ok=True); whisper._download(whisper._MODELS['large-v3'], '/root/.cache/whisper', False)"

# 애플리케이션 코드 복사
COPY ./app ./app

# 업로드 디렉토리 및 모델 캐시 디렉토리 생성
RUN mkdir -p /app/uploads /app/temp /app/.cache

# 포트 노출
EXPOSE 8000

# 서버 실행 (production mode - no reload to prevent interrupting background tasks)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
