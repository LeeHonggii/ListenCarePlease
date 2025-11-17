"""
오디오 처리 API 엔드포인트
- 전처리 (Step 2)
- STT (Step 3)
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pathlib import Path
from typing import Dict
from app.services.preprocessing import preprocess_audio
from app.services.stt import run_stt_pipeline
from app.services.diarization import run_diarization, merge_stt_with_diarization
from app.core.config import settings
from app.core.device import get_device
import json
from sqlalchemy.orm import Session
from app.api.deps import get_db
from fastapi import Depends
from app.models.audio_file import AudioFile
from app.models.preprocessing import PreprocessingResult
from app.models.stt import STTResult


router = APIRouter()

# 처리 상태 저장 (실제로는 DB 사용)
PROCESSING_STATUS: Dict[str, dict] = {}


def process_audio_pipeline(
    file_id: str,
    db: Session,
    whisper_mode: str = "local"
):
    """
    백그라운드에서 오디오 처리 파이프라인 실행

    Args:
        file_id: 파일 ID
        db: DB 세션
        whisper_mode: Whisper 모드 ("local" 또는 "api")
    """
    try:
        # 디바이스 자동 감지
        device = get_device()

        # 모델 크기 고정
        model_size = "large-v3"

        # 상태 업데이트: 전처리 시작
        PROCESSING_STATUS[file_id] = {
            "status": "preprocessing",
            "step": "전처리 중...",
            "progress": 10,
            "device": device,
            "model_size": model_size,
        }

        # 1) 파일 경로 가져오기 (임시로 하드코딩, 나중에 DB에서 가져오기)
        upload_dir = Path("/app/uploads")
        input_files = list(upload_dir.glob(f"{file_id}.*"))
        if not input_files:
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_id}")
        input_path = input_files[0]

        # 작업 디렉토리 생성
        work_dir = Path(f"/app/temp/{file_id}")
        work_dir.mkdir(parents=True, exist_ok=True)

        # 2) 전처리
        preprocessed_path = work_dir / "preprocessed.wav"
        _, original_dur, processed_dur = preprocess_audio(input_path, preprocessed_path)

        PROCESSING_STATUS[file_id] = {
            "status": "preprocessing",
            "step": "전처리 완료",
            "progress": 30,
            "original_duration": original_dur,
            "processed_duration": processed_dur,
        }

        # 3) STT
        use_local = whisper_mode == "local"
        stt_method = f"{'로컬' if use_local else 'API'} Whisper ({model_size})"

        PROCESSING_STATUS[file_id] = {
            "status": "stt",
            "step": f"STT 진행 중... ({stt_method})",
            "progress": 40,
        }

        # Whisper 전사 (로컬 또는 API)
        final_txt = run_stt_pipeline(
            preprocessed_path,
            work_dir,
            openai_api_key=settings.OPENAI_API_KEY if not use_local else None,
            use_local_whisper=use_local,
            model_size=model_size,
            device=device
        )

        # STT 완료 후 메모리 정리 (Diarization 전 메모리 확보)
        print("🧹 STT 완료, 메모리 정리 중...")
        import gc
        import torch
        gc.collect()  # Python 가비지 컬렉션 강제 실행
        if torch.cuda.is_available():
            torch.cuda.empty_cache()  # CUDA 캐시 정리
        print("✅ 메모리 정리 완료")

        # 4) Diarization (화자 분리)
        PROCESSING_STATUS[file_id] = {
            "status": "diarization",
            "step": "화자 분리 중...",
            "progress": 70,
        }

        try:
            diarization_result = run_diarization(preprocessed_path, device=device)

            # Diarization 결과 저장
            diarization_json = work_dir / "diarization_result.json"
            with open(diarization_json, 'w', encoding='utf-8') as f:
                json.dump(diarization_result, f, ensure_ascii=False, indent=2)

            # STT 결과 파싱
            stt_segments = []
            for line in final_txt.read_text(encoding='utf-8').splitlines():
                if line.strip():
                    # [00:00:00.000 - 00:00:02.800] 텍스트 형식 파싱
                    import re
                    match = re.match(r'\[(\d{2}:\d{2}:\d{2}\.\d{3}) - (\d{2}:\d{2}:\d{2}\.\d{3})\] (.+)', line)
                    if match:
                        start_str, end_str, text = match.groups()
                        # 시간을 초로 변환
                        def time_to_seconds(t):
                            h, m, s = t.split(':')
                            return int(h) * 3600 + int(m) * 60 + float(s)

                        stt_segments.append({
                            "text": text,
                            "start": time_to_seconds(start_str),
                            "end": time_to_seconds(end_str)
                        })

            # STT + Diarization 병합
            merged_result = merge_stt_with_diarization(stt_segments, diarization_result)

            # 병합 결과 저장
            merged_json = work_dir / "merged_result.json"
            with open(merged_json, 'w', encoding='utf-8') as f:
                json.dump(merged_result, f, ensure_ascii=False, indent=2)

        except Exception as diarization_error:
            print(f"⚠️ Diarization failed: {diarization_error}")
            # Diarization 실패해도 STT 결과는 유지
            diarization_result = None
            merged_result = None

        # 5) DB 저장
        PROCESSING_STATUS[file_id] = {
            "status": "saving",
            "step": "DB 저장 중...",
            "progress": 90,
        }

        # TODO: DB에 STTResult 저장
        # 현재는 파일로만 저장됨

        # 완료
        PROCESSING_STATUS[file_id] = {
            "status": "completed",
            "step": "완료",
            "progress": 100,
            "transcript_path": str(final_txt),
            "diarization_path": str(work_dir / "diarization_result.json") if diarization_result else None,
            "merged_path": str(work_dir / "merged_result.json") if merged_result else None,
        }

    except Exception as e:
        PROCESSING_STATUS[file_id] = {
            "status": "failed",
            "step": "오류 발생",
            "progress": 0,
            "error": str(e),
        }


@router.post("/process/{file_id}")
async def start_processing(
    file_id: str,
    background_tasks: BackgroundTasks,
    whisper_mode: str = None  # "local" or "api" (None일 경우 설정값 사용)
):
    """
    오디오 처리 시작 (백그라운드)

    Args:
        file_id: 업로드된 파일 ID
        whisper_mode: Whisper 모드 ("local" 또는 "api", 기본값: 설정값)

    Returns:
        처리 시작 확인 메시지

    Note:
        - model_size: large-v3 고정
        - device: 자동 감지 (CUDA > MPS > CPU)
    """
    # 파일 존재 확인
    upload_dir = Path("/app/uploads")
    input_files = list(upload_dir.glob(f"{file_id}.*"))
    if not input_files:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 설정값 또는 파라미터 사용
    use_whisper_mode = whisper_mode if whisper_mode else settings.WHISPER_MODE

    # Whisper 모드 검증
    if use_whisper_mode not in ["local", "api"]:
        raise HTTPException(status_code=400, detail="whisper_mode는 'local' 또는 'api'여야 합니다.")

    # API 모드일 때 API 키 확인
    if use_whisper_mode == "api" and not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인하세요.")

    # 디바이스 자동 감지
    detected_device = get_device()

    # 백그라운드 작업 시작
    PROCESSING_STATUS[file_id] = {
        "status": "queued",
        "step": "대기 중...",
        "progress": 0,
        "whisper_mode": use_whisper_mode,
        "model_size": "large-v3",
        "device": detected_device,
    }

    # TODO: DB 세션을 백그라운드 태스크에 전달
    background_tasks.add_task(
        process_audio_pipeline,
        file_id,
        None,
        use_whisper_mode
    )

    return {
        "file_id": file_id,
        "message": "처리가 시작되었습니다.",
        "status": "queued",
        "whisper_mode": use_whisper_mode,
        "model_size": "large-v3",
        "device": detected_device,
    }


@router.get("/status/{file_id}")
async def get_processing_status(file_id: str):
    """
    처리 상태 조회

    Args:
        file_id: 파일 ID

    Returns:
        현재 처리 상태
    """
    if file_id not in PROCESSING_STATUS:
        raise HTTPException(status_code=404, detail="처리 정보를 찾을 수 없습니다.")

    return PROCESSING_STATUS[file_id]


@router.get("/transcript/{file_id}")
async def get_transcript(file_id: str):
    """
    전사 결과 조회

    Args:
        file_id: 파일 ID

    Returns:
        전사 텍스트
    """
    if file_id not in PROCESSING_STATUS:
        raise HTTPException(status_code=404, detail="처리 정보를 찾을 수 없습니다.")

    status = PROCESSING_STATUS[file_id]
    if status["status"] != "completed":
        raise HTTPException(status_code=400, detail="처리가 완료되지 않았습니다.")

    transcript_path = Path(status["transcript_path"])
    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail="전사 파일을 찾을 수 없습니다.")

    lines = []
    for line in transcript_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            lines.append(line)

    return {"file_id": file_id, "transcript": lines, "total_lines": len(lines)}
