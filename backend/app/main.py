from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 앱 시작 시 데이터베이스 테이블 생성
@app.on_event("startup")
async def startup_event():
    """앱 시작 시 실행되는 이벤트"""
    from app.db.base import Base, engine
    from app.models import user, audio_file, preprocessing, stt, diarization, tagging, transcript

    print("🔧 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


@app.get("/")
async def root():
    return {
        "message": "Welcome to ListenCarePlease API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# API 라우터 추가
from app.api.v1 import auth, oauth, upload, tagging, processing
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(oauth.router, prefix=settings.API_V1_STR, tags=["oauth"])
app.include_router(upload.router, prefix=settings.API_V1_STR, tags=["upload"])
app.include_router(tagging.router, prefix=settings.API_V1_STR, tags=["tagging"])
app.include_router(processing.router, prefix=settings.API_V1_STR, tags=["processing"])
