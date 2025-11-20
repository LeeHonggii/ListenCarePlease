from sqlalchemy import Column, Integer, String, BigInteger, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class FileStatus(str, enum.Enum):
    """파일 처리 상태"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioFile(Base):
    """오디오 파일 모델"""
    __tablename__ = "audio_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 파일 정보
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)  # bytes
    duration = Column(Float, nullable=True)  # seconds
    mimetype = Column(String(50), nullable=False)

    # 상태
    status = Column(Enum(FileStatus), default=FileStatus.UPLOADED, nullable=False, index=True)

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("User", back_populates="audio_files")
    preprocessing_result = relationship("PreprocessingResult", back_populates="audio_file", uselist=False, cascade="all, delete-orphan")
    stt_results = relationship("STTResult", back_populates="audio_file", cascade="all, delete-orphan")
    diarization_results = relationship("DiarizationResult", back_populates="audio_file", cascade="all, delete-orphan")
    detected_names = relationship("DetectedName", back_populates="audio_file", cascade="all, delete-orphan")
    speaker_mappings = relationship("SpeakerMapping", back_populates="audio_file", cascade="all, delete-orphan")
    user_confirmation = relationship("UserConfirmation", back_populates="audio_file", uselist=False, cascade="all, delete-orphan")
    final_transcripts = relationship("FinalTranscript", back_populates="audio_file", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="audio_file", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AudioFile(id={self.id}, filename={self.original_filename}, status={self.status})>"
