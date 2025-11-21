# ListenCarePlease 🎙️

**발화자 자동 태깅 및 음성 요약 서비스**

회의록, 인터뷰, 팟캐스트 등의 음성 파일을 업로드하면 자동으로 화자를 분리하고 이름을 태깅하여 정리된 회의록을 생성하는 AI 기반 서비스입니다.

---

## 🚀 주요 기능

1. **STT (Speech-to-Text)**: Whisper를 사용한 고정확도 음성 인식
2. **화자 분리 (Speaker Diarization)**: 여러 화자의 발화를 자동으로 구분
3. **화자 태깅 (Speaker Tagging)**: LangGraph Agent를 사용한 자동 이름 매칭
   - 이름 기반 태깅 (NER + 멀티턴 LLM 추론)
   - 닉네임 자동 생성 (역할/특징 기반)
   - 소거법 및 스코어 기반 자동 매핑
4. **응용 기능**: 요약, Q&A(RAG), 자막 생성

---

## 📋 시스템 요구사항

- **Python**: 3.10+
- **Node.js**: 18+
- **Docker**: 20.10+
- **MySQL**: 8.0+
- **GPU (선택)**: NVIDIA CUDA 11.8+ 또는 Apple Silicon (MPS)

---

## 🛠️ 기술 스택

### Backend
- **Framework**: FastAPI
- **AI/ML**:
  - LangChain + LangGraph (에이전틱 파이프라인)
  - OpenAI GPT-4 / gpt-5-mini (화자 추론 LLM)
  - Whisper large-v3 (STT)
  - Senko / pyannote.audio (화자 분리)
  - Korean PII Masking BERT (NER)
- **Database**: MySQL 8.0 + SQLAlchemy + Alembic
- **Auth**: OAuth 2.0 (Google, Kakao) + JWT

### Frontend
- **Framework**: React + Vite
- **Styling**: TailwindCSS
- **State Management**: Context API

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Monitoring**: LangSmith (Agent 추적)

---

## 📦 빠른 시작

### 1. 프로젝트 클론

```bash
git clone https://github.com/yourusername/ListenCarePlease.git
cd ListenCarePlease
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 필요한 값을 설정하세요:

```bash
# Database
MYSQL_HOST=mysql
MYSQL_DATABASE=listencare
MYSQL_USER=listencare_user
MYSQL_PASSWORD=listencare_pass123

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# JWT
JWT_SECRET_KEY=your-secret-key-here

# LangSmith (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key

# Whisper & Diarization
WHISPER_MODE=local  # "local" or "api"
DIARIZATION_MODE=senko  # "senko" or "nemo"

# LLM Model
LLM_MODEL_NAME=gpt-5-mini-2025-08-07
```

### 3. Docker로 실행

```bash
# 컨테이너 빌드 및 실행
docker compose up --build

# 또는 백그라운드로 실행
docker compose up -d --build
```

### 4. 접속

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📖 문서

프로젝트의 상세한 문서는 `docs/` 폴더에서 확인할 수 있습니다:

- **[환경 설정 가이드](docs/setup.md)**: 설치, Docker, 개발 환경 설정
- **[시스템 아키텍처](docs/architecture.md)**: 전체 시스템 설계 및 로드맵 (PDR)
- **[파이프라인 I/O](docs/pipeline-io.md)**: 각 단계별 Input/Output 정의
- **[Agent 워크플로우](docs/agent-workflow.md)**: LangGraph Agent 상세 설명
- **[DB 스키마](database_schema.md)**: 데이터베이스 테이블 구조
- **[명령어 사용법](COMMANDS.md)**: 자주 사용하는 Docker 명령어

---

## 🎯 사용 방법

### 1. 로그인/회원가입
- 이메일/비밀번호 또는 OAuth (Google, Kakao) 로그인

### 2. 파일 업로드
- 드래그앤드롭 또는 파일 선택으로 음성 파일 업로드

### 3. 처리 대기
- STT, 화자 분리, NER 처리 중 (진행률 표시)

### 4. 화자 정보 확인
- 감지된 화자 수와 이름 확인/수정

### 5. AI 분석
- LangGraph Agent가 화자 이름을 자동으로 매핑

### 6. 화자 태깅
- 시스템 제안을 확인하고 수정/확정

### 7. 결과 확인
- 화자별 통계 및 전체 회의록 다운로드
- 요약, RAG, 자막 생성 선택

---

## 🔑 핵심 기능 상세

### 화자 태깅 (LangGraph Agent)

**5단계 노드 구성**:
1. **load_profiles**: DB에서 기존 화자 프로필 로드
2. **embedding_match**: 음성 임베딩 기반 자동 매칭
3. **name_extraction**: NER 결과에서 이름 추출 (context 포함)
4. **name_based_tagging**: 멀티턴 LLM 추론으로 화자 식별
5. **merge_results**: 소거법 및 스코어 기반 매핑 통합

**주요 알고리즘**:
- **소거법**: 남은 화자와 남은 이름을 1:1 매핑
- **스코어 기반 매핑**: confidence + 증거 개수 기반
- **중복 제거**: 같은 이름이 여러 화자에 매핑된 경우 처리

**LLM 프롬프트**:
- 앞뒤 5문장 context 활용
- 이전 분석 결과 요약 포함 (멀티턴)
- PydanticOutputParser로 구조화된 응답 파싱

### 닉네임 자동 생성

- LLM 기반 역할/특징 분석
- Smart Selection: 대표 발화 선택 (긴 발화, 키워드 발화)
- 메타데이터 저장: display_label, one_liner, keywords

---

## 📊 데이터 흐름

```
1. 오디오 파일 업로드
   ↓
2. 전처리 (VAD, 노이즈 제거)
   ↓
3. STT (Whisper) → 단어별 타임스탬프
   ↓
4. Diarization (Senko) → 화자별 타임스탬프 + 임베딩
   ↓
5. NER (Korean PII Masking) → 이름 감지 + 닉네임 생성
   ↓
6. LangGraph Agent → 화자 이름 자동 매핑
   ↓
7. 사용자 확정 → 최종 대본 생성
   ↓
8. 응용 (요약, RAG, 자막)
```

---

## 🧪 개발 가이드

### 로컬 개발 (Docker 없이)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### 테스트

```bash
# Backend 테스트
cd backend
pytest

# Frontend 테스트
cd frontend
npm test
```

### DB 마이그레이션

```bash
# 새 마이그레이션 생성
alembic revision --autogenerate -m "description"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

---

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

This project is licensed under the MIT License.

---

## 👥 팀

- **Backend**: FastAPI, LangGraph, AI 모델 통합
- **Frontend**: React, UI/UX 디자인
- **Database**: MySQL 스키마 설계
- **DevOps**: Docker, 배포 자동화

---

## 📞 문의

- **Issues**: [GitHub Issues](https://github.com/yourusername/ListenCarePlease/issues)
- **Email**: your-email@example.com

---

## 🙏 감사의 말

- OpenAI (Whisper, GPT)
- LangChain / LangGraph
- pyannote.audio
- FastAPI
- React

---

**Made with ❤️ by ListenCarePlease Team**
