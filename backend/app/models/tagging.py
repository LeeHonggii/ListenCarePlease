from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class DetectedName(Base):
    """감지된 이름 모델 (I,O.md Step 5a~5c)"""
    __tablename__ = "detected_names"

    id = Column(Integer, primary_key=True, index=True)
    audio_file_id = Column(Integer, ForeignKey("audio_files.id", ondelete="CASCADE"), nullable=False, index=True)

    # 감지 정보
    detected_name = Column(String(100), nullable=False)  # "민서씨", "김팀장님" 등
    speaker_label = Column(String(50), nullable=False)  # SPEAKER_00 등 (이 이름이 누구를 가리키는지)
    time_detected = Column(Float, nullable=False)  # 이름이 언급된 시간 (초)

    # 신뢰도 정보
    confidence = Column(Float, nullable=True)  # 이름 감지 신뢰도 (0.0 ~ 1.0)
    similarity_score = Column(Float, nullable=True)  # 음성 임베딩 유사도 (동일인 판별용)

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    audio_file = relationship("AudioFile", back_populates="detected_names")

    def __repr__(self):
        return f"<DetectedName(id={self.id}, name='{self.detected_name}', speaker={self.speaker_label})>"


class SpeakerMapping(Base):
    """화자 태깅 결과 모델 (I,O.md Step 5d~5e)"""
    __tablename__ = "speaker_mappings"

    id = Column(Integer, primary_key=True, index=True)
    audio_file_id = Column(Integer, ForeignKey("audio_files.id", ondelete="CASCADE"), nullable=False, index=True)

    # 화자 정보
    speaker_label = Column(String(50), nullable=False)  # SPEAKER_00, SPEAKER_01, ...

    # 이름 정보
    suggested_name = Column(String(100), nullable=True)  # 시스템이 제안한 이름 (nullable)
    final_name = Column(String(100), nullable=False)  # 사용자가 확정한 최종 이름

    # 메타데이터
    is_modified = Column(Boolean, default=False, nullable=False)  # 사용자가 수정했는지 여부

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    audio_file = relationship("AudioFile", back_populates="speaker_mappings")

    # 제약 조건: 같은 오디오 파일에서 같은 화자 레이블은 한 번만
    __table_args__ = (
        UniqueConstraint('audio_file_id', 'speaker_label', name='uq_speaker_mapping_audio_speaker'),
    )

    def __repr__(self):
        return f"<SpeakerMapping(id={self.id}, speaker={self.speaker_label}, final_name='{self.final_name}', modified={self.is_modified})>"
