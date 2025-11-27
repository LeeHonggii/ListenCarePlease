"""
회의 효율성 분석 결과 모델
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class MeetingEfficiencyAnalysis(Base):
    """회의 효율성 분석 결과 모델 (ver1.ipynb 통합)"""
    __tablename__ = "meeting_efficiency_analysis"

    id = Column(Integer, primary_key=True, index=True)
    audio_file_id = Column(Integer, ForeignKey("audio_files.id", ondelete="CASCADE"),
                          nullable=False, unique=True, index=True)

    # === 전체 회의 지표 ===
    # 엔트로피 (전체 담화)
    entropy_values = Column(JSON, nullable=True)
    # [{time: 10.5, entropy: 2.34, window_words: ["회의", "안건", ...]}, ...]

    entropy_avg = Column(Float, nullable=True)  # 평균 엔트로피
    entropy_std = Column(Float, nullable=True)  # 표준편차

    # 전체 회의 TTR
    overall_ttr = Column(JSON, nullable=True)

    # 전체 회의 정보량
    overall_information_content = Column(JSON, nullable=True)

    # 전체 회의 문장 확률
    overall_sentence_probability = Column(JSON, nullable=True)

    # 전체 회의 PPL
    overall_perplexity = Column(JSON, nullable=True)

    # === 화자별 상세 지표 (JSON 배열) ===
    # 각 화자에 대한 5가지 지표를 JSON으로 저장
    speaker_metrics = Column(JSON, nullable=False)
    """
    [
        {
            "speaker_label": "SPEAKER_00",
            "speaker_name": "김민서",

            # 1. 발화 빈도
            "turn_frequency": {
                "turn_count": 45,
                "total_duration": 180.5,
                "avg_turn_length": 4.0,
                "time_series": [
                    {"time": 0, "cumulative_turns": 0},
                    {"time": 60, "cumulative_turns": 12},
                    ...
                ]
            },

            # 2. TTR (Type-Token Ratio)
            "ttr": {
                "ttr_values": [
                    {"window_start": 0, "window_end": 10, "ttr": 0.75, "unique_nouns": 8, "total_nouns": 12},
                    ...
                ],
                "ttr_avg": 0.68,
                "ttr_std": 0.12
            },

            # 3. 정보량 (코사인 유사도)
            "information_content": {
                "cosine_similarity_values": [
                    {"time": 10.5, "sentence": "오늘 회의 안건은...", "similarity": 0.85, "z_normalized": 0.5},
                    ...
                ],
                "avg_similarity": 0.78,
                "information_score": 0.22  # 1 - avg_similarity
            },

            # 4. 문장 확률 (HDBSCAN 군집화)
            "sentence_probability": {
                "cluster_info": [
                    {"cluster_id": 0, "sentence_count": 15, "probability": 0.25},
                    {"cluster_id": 1, "sentence_count": 8, "probability": 0.13},
                    ...
                ],
                "rare_sentences": [
                    {"sentence": "특이한 발언...", "probability": 0.02, "cluster_id": 5},
                    ...
                ]
            },

            # 5. PPL (Perplexity)
            "perplexity": {
                "ppl_values": [
                    {"window_start": 0, "window_end": 5, "ppl": 45.2, "loss": 3.81},
                    ...
                ],
                "ppl_avg": 38.5,
                "ppl_std": 12.3
            }
        },
        ...  # 다른 화자들
    ]
    """

    # === 메타데이터 ===
    total_speakers = Column(Integer, nullable=False)  # 전체 화자 수
    total_turns = Column(Integer, nullable=False)  # 전체 턴 수
    total_sentences = Column(Integer, nullable=False)  # 전체 문장 수

    # === 분석 정보 ===
    analysis_version = Column(String(20), nullable=False, default="1.0")  # 분석 알고리즘 버전
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    audio_file = relationship("AudioFile", back_populates="efficiency_analysis")

    def __repr__(self):
        return f"<MeetingEfficiencyAnalysis(audio_file_id={self.audio_file_id}, speakers={self.total_speakers})>"
