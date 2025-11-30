FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    autoconf \
    automake \
    libtool \
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
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치 (통합 GPU 전용)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Mecab + mecab-ko-dic 설치 (한국어 형태소 분석)
RUN echo "Installing Mecab and mecab-ko-dic..." && \
    # Mecab 소스 다운로드 및 설치
    cd /tmp && \
    wget https://bitbucket.org/eunjeon/mecab-ko/downloads/mecab-0.996-ko-0.9.2.tar.gz && \
    tar xvf mecab-0.996-ko-0.9.2.tar.gz && \
    cd mecab-0.996-ko-0.9.2 && \
    ./configure && \
    make && \
    make install && \
    ldconfig && \
    # mecab-ko-dic 다운로드 및 설치
    cd /tmp && \
    wget https://bitbucket.org/eunjeon/mecab-ko-dic/downloads/mecab-ko-dic-2.1.1-20180720.tar.gz && \
    tar xvf mecab-ko-dic-2.1.1-20180720.tar.gz && \
    cd mecab-ko-dic-2.1.1-20180720 && \
    ./autogen.sh && \
    ./configure && \
    make && \
    make install && \
    # mecab-python3 설치
    pip install --no-cache-dir mecab-python3 && \
    # 임시 파일 정리
    rm -rf /tmp/mecab* && \
    echo "Mecab installation complete"

# Senko 설치 (화자 분리 모델 1) - NVIDIA GPU 지원
RUN echo "Installing Senko with NVIDIA support..." && \
    pip install --no-cache-dir "git+https://github.com/narcotic-sh/senko.git#egg=senko[nvidia]"

# NeMo 설치 (화자 분리 모델 2) - GPU 전용
# 주의: NeMo는 용량이 크므로 (~3GB) 필요 시에만 활성화
RUN echo "Installing NeMo Toolkit with ASR support..." && \
    pip install --no-cache-dir nemo-toolkit[asr]==2.0.0rc0 && \
    echo "Downgrading huggingface-hub to 0.23.2 for compatibility..." && \
    pip install --no-cache-dir --force-reinstall huggingface-hub==0.23.2

# CUDA 라이브러리 심볼릭 링크 생성
RUN echo "Creating CUDA library symlinks..." && \
    cd /usr/local/lib/python3.11/site-packages/torch/lib && \
    ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so && \
    ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so.11 && \
    ln -sf libnvrtc-672ee683.so.11.2 libnvrtc.so.11.2 && \
    ln -sf libnvrtc-builtins.so.11.8 libnvrtc-builtins.so && \
    ls -la libnvrtc*

# Whisper 모델 미리 다운로드 (large-v3, 약 3GB)
# 다운로드만 하고 로드는 하지 않음 (메모리 절약)
RUN python3 -c "import whisper; import os; os.makedirs('/root/.cache/whisper', exist_ok=True); whisper._download(whisper._MODELS['large-v3'], '/root/.cache/whisper', False)"

# 애플리케이션 코드 복사
COPY ./app ./app

# Alembic 설정 및 마이그레이션 파일 복사
COPY ./alembic ./alembic
COPY ./alembic.ini ./alembic.ini

# Entrypoint 스크립트 복사 및 실행 권한 부여
COPY ./entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# 업로드 디렉토리 및 모델 캐시 디렉토리 생성
RUN mkdir -p /app/uploads /app/temp /app/.cache

# PyTorch 번들 라이브러리 경로 설정 (cuDNN 등)
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/torch/lib:$LD_LIBRARY_PATH

# 포트 노출
EXPOSE 8000

# 서버 실행 (entrypoint 스크립트 사용 - 마이그레이션 자동 적용)
CMD ["./entrypoint.sh"]
