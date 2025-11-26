"""
회의 효율성 분석 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.efficiency import MeetingEfficiencyAnalysis
from app.models.audio_file import AudioFile
from app.services.efficiency_analyzer import EfficiencyAnalyzer
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def run_efficiency_analysis(audio_file_id: int):
    """백그라운드 작업: 효율성 분석 실행"""
    print(f"[DEBUG] run_efficiency_analysis called with audio_file_id={audio_file_id}")
    # 백그라운드 태스크에서는 새로운 DB 세션 생성 필요
    from app.db.base import SessionLocal

    print(f"[DEBUG] SessionLocal imported successfully")
    db = SessionLocal()
    print(f"[DEBUG] DB session created successfully")
    try:
        logger.info(f"Background task started: efficiency analysis for audio_file_id={audio_file_id}")

        # 분석 실행
        analyzer = EfficiencyAnalyzer(audio_file_id, db)
        analysis = analyzer.analyze_all()

        # 기존 분석 결과가 있으면 업데이트, 없으면 새로 생성
        existing = db.query(MeetingEfficiencyAnalysis).filter(
            MeetingEfficiencyAnalysis.audio_file_id == audio_file_id
        ).first()

        if existing:
            logger.info(f"Updating existing analysis for audio_file_id={audio_file_id}")
            # 기존 레코드 업데이트
            existing.entropy_values = analysis.entropy_values
            existing.entropy_avg = analysis.entropy_avg
            existing.entropy_std = analysis.entropy_std
            existing.speaker_metrics = analysis.speaker_metrics
            existing.total_speakers = analysis.total_speakers
            existing.total_turns = analysis.total_turns
            existing.total_sentences = analysis.total_sentences
            existing.analysis_version = analysis.analysis_version
            existing.analyzed_at = analysis.analyzed_at
            db.commit()
            db.refresh(existing)
            logger.info(f"Efficiency analysis updated for audio_file_id={audio_file_id}")
        else:
            logger.info(f"Creating new analysis for audio_file_id={audio_file_id}")
            # 새로 생성
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            logger.info(f"Efficiency analysis created for audio_file_id={audio_file_id}")

    except Exception as e:
        logger.error(f"Error in efficiency analysis background task: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


@router.post("/analyze/{file_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_efficiency_analysis(
    file_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    효율성 분석 트리거 (비동기 백그라운드 작업)

    - 기존 분석 결과가 있으면 삭제 후 재분석
    - BackgroundTasks로 비동기 실행
    - 즉시 202 Accepted 반환
    """
    # AudioFile 찾기 - ID(숫자)로 먼저 시도, 실패시 문자열 검색
    audio_file = None
    if file_id.isdigit():
        audio_file = db.query(AudioFile).filter(AudioFile.id == int(file_id)).first()
    if not audio_file:
        audio_file = db.query(AudioFile).filter(
            (AudioFile.file_path.like(f"%{file_id}%")) |
            (AudioFile.original_filename.like(f"%{file_id}%"))
        ).first()

    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file {file_id} not found"
        )

    # 백그라운드 작업 등록 (DB 세션은 태스크 내부에서 생성)
    background_tasks.add_task(run_efficiency_analysis, audio_file.id)

    return {
        "message": "Efficiency analysis started",
        "file_id": audio_file.id,
        "status": "processing"
    }


@router.get("/overview")
def get_efficiency_overview(
    db: Session = Depends(get_db),
    limit: Optional[int] = 10
):
    """
    전체 회의 효율성 조회 (메인 화면 대시보드용)

    - 최근 N개 회의의 효율성 분석 결과 요약
    - 엔트로피 평균 기준으로 정렬
    """
    analyses = db.query(MeetingEfficiencyAnalysis).join(AudioFile).order_by(
        MeetingEfficiencyAnalysis.analyzed_at.desc()
    ).limit(limit).all()

    results = []
    for analysis in analyses:
        results.append({
            "audio_file_id": analysis.audio_file_id,
            "filename": analysis.audio_file.original_filename,
            "entropy_avg": analysis.entropy_avg,
            "total_speakers": analysis.total_speakers,
            "total_turns": analysis.total_turns,
            "analyzed_at": analysis.analyzed_at.isoformat() if analysis.analyzed_at else None
        })

    return {
        "total_count": len(results),
        "analyses": results
    }


@router.get("/{file_id}")
def get_efficiency_analysis(
    file_id: str,
    db: Session = Depends(get_db)
):
    """
    개별 회의 효율성 조회 (결과 페이지용)

    - 분석 결과가 없으면 404 반환
    - 프론트엔드에서 분석 트리거를 먼저 호출해야 함
    """
    # AudioFile 찾기 - ID(숫자)로 먼저 시도, 실패시 문자열 검색
    audio_file = None
    if file_id.isdigit():
        audio_file = db.query(AudioFile).filter(AudioFile.id == int(file_id)).first()
    if not audio_file:
        audio_file = db.query(AudioFile).filter(
            (AudioFile.file_path.like(f"%{file_id}%")) |
            (AudioFile.original_filename.like(f"%{file_id}%"))
        ).first()

    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file {file_id} not found"
        )

    # 분석 결과 조회
    analysis = db.query(MeetingEfficiencyAnalysis).filter(
        MeetingEfficiencyAnalysis.audio_file_id == audio_file.id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Efficiency analysis not found for file {file_id}. Please trigger analysis first."
        )

    return {
        "audio_file_id": analysis.audio_file_id,
        "entropy": {
            "values": analysis.entropy_values,
            "avg": analysis.entropy_avg,
            "std": analysis.entropy_std
        },
        "speaker_metrics": analysis.speaker_metrics,
        "total_speakers": analysis.total_speakers,
        "total_turns": analysis.total_turns,
        "total_sentences": analysis.total_sentences,
        "analysis_version": analysis.analysis_version,
        "analyzed_at": analysis.analyzed_at.isoformat() if analysis.analyzed_at else None
    }


@router.get("/{file_id}/speaker/{speaker_label}")
def get_speaker_efficiency(
    file_id: str,
    speaker_label: str,
    db: Session = Depends(get_db)
):
    """
    특정 화자의 효율성 지표 조회

    - speaker_metrics에서 해당 화자만 추출
    """
    # AudioFile 찾기
    audio_file = None
    if file_id.isdigit():
        audio_file = db.query(AudioFile).filter(AudioFile.id == int(file_id)).first()
    if not audio_file:
        audio_file = db.query(AudioFile).filter(
            (AudioFile.file_path.like(f"%{file_id}%")) |
            (AudioFile.original_filename.like(f"%{file_id}%"))
        ).first()

    if not audio_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file {file_id} not found"
        )

    analysis = db.query(MeetingEfficiencyAnalysis).filter(
        MeetingEfficiencyAnalysis.audio_file_id == audio_file.id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Efficiency analysis not found for file {file_id}"
        )

    # speaker_metrics에서 해당 화자 찾기
    speaker_metric = next(
        (m for m in analysis.speaker_metrics if m["speaker_label"] == speaker_label),
        None
    )

    if not speaker_metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Speaker {speaker_label} not found in analysis"
        )

    return speaker_metric
