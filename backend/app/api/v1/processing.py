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
from app.services.ner_service import get_ner_service
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
    whisper_mode: str = "local",
    diarization_mode: str = "senko"
):
    """
    백그라운드에서 오디오 처리 파이프라인 실행

    Args:
        file_id: 파일 ID
        whisper_mode: Whisper 모드 ("local" 또는 "api")
        diarization_mode: 화자 분리 모델 ("senko" 또는 "nemo")
    """
    # 백그라운드 태스크용 새 DB 세션 생성
    from app.db.base import SessionLocal
    db = SessionLocal()

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
        diarization_method = "Senko" if diarization_mode == "senko" else "NeMo"

        PROCESSING_STATUS[file_id] = {
            "status": "diarization",
            "step": f"화자 분리 중... ({diarization_method})",
            "progress": 70,
        }

        try:
            diarization_result = run_diarization(
                preprocessed_path,
                device=device,
                mode=diarization_mode
            )

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

        # 5) NER (이름 추출 및 군집화)
        PROCESSING_STATUS[file_id] = {
            "status": "ner",
            "step": "이름 추출 중...",
            "progress": 80,
        }

        ner_result = None
        try:
            if merged_result:
                # NER 서비스 가져오기
                ner_service = get_ner_service()

                # NER 처리
                ner_result = ner_service.process_segments(merged_result)

                # NER 결과 저장
                ner_json = work_dir / "ner_result.json"
                with open(ner_json, 'w', encoding='utf-8') as f:
                    json.dump(ner_result, f, ensure_ascii=False, indent=2)

                print(f"✅ NER 완료: {len(ner_result['final_namelist'])}개 대표명 추출")

        except Exception as ner_error:
            print(f"⚠️ NER failed: {ner_error}")
            # NER 실패해도 병합 결과는 유지
            ner_result = None

        # 6) DB 저장
        PROCESSING_STATUS[file_id] = {
            "status": "saving",
            "step": "DB 저장 중...",
            "progress": 90,
        }

        # DB 저장 시작
        if db:
            try:
                from app.models.diarization import DiarizationResult
                from app.models.tagging import SpeakerMapping
                from app.models.audio_file import AudioFile, FileStatus

                # 6-1) AudioFile 레코드 생성/업데이트
                # file_id로 파일 검색 (original_filename 또는 file_path에 포함되어 있을 수 있음)
                audio_file = db.query(AudioFile).filter(
                    (AudioFile.file_path.like(f"%{file_id}%")) |
                    (AudioFile.original_filename.like(f"%{file_id}%"))
                ).first()

                # 새 파일이면 생성 (임시: user_id=1 하드코딩)
                if not audio_file:
                    audio_file = AudioFile(
                        user_id=1,  # TODO: 실제 user_id로 교체
                        original_filename=input_path.name,
                        file_path=str(input_path),
                        file_size=input_path.stat().st_size,
                        duration=original_dur,
                        mimetype="audio/wav",
                        status=FileStatus.PROCESSING
                    )
                    db.add(audio_file)
                    db.flush()  # ID 생성

                audio_file_id_db = audio_file.id

                # 6-2) STTResult 저장 (merged_result의 각 세그먼트)
                if merged_result:
                    for idx, segment in enumerate(merged_result):
                        stt_record = STTResult(
                            audio_file_id=audio_file_id_db,
                            word_index=idx,
                            text=segment.get("text", ""),
                            start_time=segment.get("start", 0.0),
                            end_time=segment.get("end", 0.0),
                            confidence=None  # Whisper doesn't provide word-level confidence
                        )
                        db.add(stt_record)

                # 6-3) DiarizationResult 저장 (화자별 임베딩)
                if diarization_result and 'segments' in diarization_result:
                    for segment in diarization_result['segments']:
                        speaker_label = segment.get('speaker', 'UNKNOWN')

                        # 해당 화자의 임베딩 가져오기
                        embeddings = diarization_result.get('embeddings', {})
                        embedding_vector = embeddings.get(speaker_label)

                        diar_record = DiarizationResult(
                            audio_file_id=audio_file_id_db,
                            speaker_label=speaker_label,
                            start_time=segment.get('start', 0.0),
                            end_time=segment.get('end', 0.0),
                            embedding=embedding_vector  # JSON 형태로 저장
                        )
                        db.add(diar_record)

                # 6-4) DetectedName 저장 (NER로 감지된 이름들 - has_name: true인 세그먼트)
                if ner_result:
                    from app.models.tagging import DetectedName

                    segments_with_names = ner_result.get('segments_with_names', [])

                    # 이름이 감지된 세그먼트들만 필터링
                    for idx, segment in enumerate(segments_with_names):
                        if segment.get('has_name', False) and segment.get('name'):
                            # 앞뒤 5문장 문맥 추출 (I,O.md 5a~5c)
                            context_before_idx = max(0, idx - 5)
                            context_after_idx = min(len(segments_with_names), idx + 6)

                            context_before = [
                                {
                                    "index": i - idx,
                                    "speaker": seg.get("speaker"),
                                    "text": seg.get("text"),
                                    "time": seg.get("start")
                                }
                                for i, seg in enumerate(segments_with_names[context_before_idx:idx], start=context_before_idx)
                            ]

                            context_after = [
                                {
                                    "index": i - idx,
                                    "speaker": seg.get("speaker"),
                                    "text": seg.get("text"),
                                    "time": seg.get("start")
                                }
                                for i, seg in enumerate(segments_with_names[idx+1:context_after_idx], start=idx+1)
                            ]

                            # 이 세그먼트에서 감지된 각 이름에 대해 레코드 생성
                            for detected_name in segment['name']:
                                name_record = DetectedName(
                                    audio_file_id=audio_file_id_db,
                                    detected_name=detected_name,
                                    speaker_label=segment.get('speaker', 'UNKNOWN'),
                                    time_detected=segment.get('start', 0.0),
                                    confidence=None,  # NER 신뢰도 (현재 미구현)
                                    similarity_score=None,
                                    context_before=context_before,  # 앞 5문장 (I,O.md 참조)
                                    context_after=context_after,   # 뒤 5문장 (I,O.md 참조)
                                    llm_reasoning=None,  # 멀티턴 LLM 추론 결과 (향후 구현)
                                    is_consistent=None   # 이전 추론과 일치 여부 (향후 구현)
                                )
                                db.add(name_record)

                # 6-5) SpeakerMapping 저장 (화자별 초기 레코드만 생성, 매핑은 나중에)
                if diarization_result:
                    # 화자별 고유 레이블 추출
                    speaker_labels = list(diarization_result.get('embeddings', {}).keys())

                    # 각 화자에 대해 SpeakerMapping 생성 (초기 제안 없이)
                    for speaker_label in speaker_labels:
                        # 이미 존재하는지 확인 (중복 방지)
                        existing = db.query(SpeakerMapping).filter(
                            SpeakerMapping.audio_file_id == audio_file_id_db,
                            SpeakerMapping.speaker_label == speaker_label
                        ).first()

                        if not existing:
                            mapping = SpeakerMapping(
                                audio_file_id=audio_file_id_db,
                                speaker_label=speaker_label,
                                suggested_name=None,  # 초기 제안 없음 (향후 LLM이 추론)
                                name_confidence=None,
                                name_mentions=0,
                                suggested_role=None,
                                role_confidence=None,
                                conflict_detected=False,
                                needs_manual_review=True,  # 기본적으로 사용자 확인 필요
                                final_name="",  # 사용자가 확정 전까지 빈 값
                                is_modified=False
                            )
                            db.add(mapping)

                # 6-6) AudioFile 상태 업데이트
                audio_file.status = FileStatus.COMPLETED

                # 커밋
                db.commit()
                print(f"✅ DB 저장 완료: audio_file_id={audio_file_id_db}")

                # DetectedName 개수 확인
                detected_name_count = db.query(DetectedName).filter(
                    DetectedName.audio_file_id == audio_file_id_db
                ).count()
                speaker_mapping_count = db.query(SpeakerMapping).filter(
                    SpeakerMapping.audio_file_id == audio_file_id_db
                ).count()
                print(f"  - DetectedName 레코드: {detected_name_count}개")
                print(f"  - STTResult 레코드: {len(merged_result) if merged_result else 0}개")
                print(f"  - DiarizationResult 레코드: {len(diarization_result.get('segments', [])) if diarization_result else 0}개")
                print(f"  - SpeakerMapping 레코드: {speaker_mapping_count}개")

            except Exception as db_error:
                print(f"⚠️ DB 저장 실패: {db_error}")
                db.rollback()
                # DB 저장 실패해도 파일 결과는 유지

        # 완료
        PROCESSING_STATUS[file_id] = {
            "status": "completed",
            "step": "완료",
            "progress": 100,
            "transcript_path": str(final_txt),
            "diarization_path": str(work_dir / "diarization_result.json") if diarization_result else None,
            "merged_path": str(work_dir / "merged_result.json") if merged_result else None,
            "ner_path": str(work_dir / "ner_result.json") if ner_result else None,
            "detected_names": ner_result['final_namelist'] if ner_result else [],
            "speaker_count": len(diarization_result.get('embeddings', {})) if diarization_result else 0,
        }

    except Exception as e:
        PROCESSING_STATUS[file_id] = {
            "status": "failed",
            "step": "오류 발생",
            "progress": 0,
            "error": str(e),
        }
    finally:
        # DB 세션 종료
        db.close()


@router.post("/process/{file_id}")
async def start_processing(
    file_id: str,
    background_tasks: BackgroundTasks,
    whisper_mode: str = None,  # "local" or "api" (None일 경우 설정값 사용)
    diarization_mode: str = None  # "senko" or "nemo" (None일 경우 설정값 사용)
):
    """
    오디오 처리 시작 (백그라운드)

    Args:
        file_id: 업로드된 파일 ID
        whisper_mode: Whisper 모드 ("local" 또는 "api", 기본값: 설정값)
        diarization_mode: 화자 분리 모델 ("senko" 또는 "nemo", 기본값: 설정값)

    Returns:
        처리 시작 확인 메시지

    Note:
        - model_size: large-v3 고정
        - device: 자동 감지 (CUDA > MPS > CPU)
        - senko: 빠름, 간단
        - nemo: 정확, 세밀한 설정
    """
    # 파일 존재 확인
    upload_dir = Path("/app/uploads")
    input_files = list(upload_dir.glob(f"{file_id}.*"))
    if not input_files:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 설정값 또는 파라미터 사용
    use_whisper_mode = whisper_mode if whisper_mode else settings.WHISPER_MODE
    use_diarization_mode = diarization_mode if diarization_mode else settings.DIARIZATION_MODE

    # Whisper 모드 검증
    if use_whisper_mode not in ["local", "api"]:
        raise HTTPException(status_code=400, detail="whisper_mode는 'local' 또는 'api'여야 합니다.")

    # Diarization 모드 검증
    if use_diarization_mode not in ["senko", "nemo"]:
        raise HTTPException(status_code=400, detail="diarization_mode는 'senko' 또는 'nemo'여야 합니다.")

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
        "diarization_mode": use_diarization_mode,
        "model_size": "large-v3",
        "device": detected_device,
    }

    # 백그라운드 태스크 시작 (내부에서 DB 세션 생성)
    background_tasks.add_task(
        process_audio_pipeline,
        file_id,
        use_whisper_mode,
        use_diarization_mode
    )

    return {
        "file_id": file_id,
        "message": "처리가 시작되었습니다.",
        "status": "queued",
        "whisper_mode": use_whisper_mode,
        "diarization_mode": use_diarization_mode,
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


@router.get("/ner/{file_id}")
async def get_ner_result(file_id: str):
    """
    NER 결과 조회

    Args:
        file_id: 파일 ID

    Returns:
        NER 처리 결과 (이름 목록, 군집화 정보, 통계 등)
    """
    if file_id not in PROCESSING_STATUS:
        raise HTTPException(status_code=404, detail="처리 정보를 찾을 수 없습니다.")

    status = PROCESSING_STATUS[file_id]
    if status["status"] != "completed":
        raise HTTPException(status_code=400, detail="처리가 완료되지 않았습니다.")

    ner_path = status.get("ner_path")
    if not ner_path or not Path(ner_path).exists():
        raise HTTPException(status_code=404, detail="NER 결과 파일을 찾을 수 없습니다.")

    # NER 결과 로드
    with open(ner_path, 'r', encoding='utf-8') as f:
        ner_result = json.load(f)

    return {
        "file_id": file_id,
        "detected_names": ner_result.get("final_namelist", []),
        "name_clusters": ner_result.get("name_clusters", {}),
        "unique_names": ner_result.get("unique_names", []),
        "stats": ner_result.get("stats", {}),
        "segments_with_names": ner_result.get("segments_with_names", []),
    }


@router.get("/merged/{file_id}")
async def get_merged_result(file_id: str):
    """
    병합된 결과 조회 (STT + Diarization + NER)

    Args:
        file_id: 파일 ID

    Returns:
        화자 정보와 이름이 포함된 전사 결과
    """
    if file_id not in PROCESSING_STATUS:
        raise HTTPException(status_code=404, detail="처리 정보를 찾을 수 없습니다.")

    status = PROCESSING_STATUS[file_id]
    if status["status"] != "completed":
        raise HTTPException(status_code=400, detail="처리가 완료되지 않았습니다.")

    # NER 결과 로드
    ner_path = status.get("ner_path")
    if ner_path and Path(ner_path).exists():
        with open(ner_path, 'r', encoding='utf-8') as f:
            ner_result = json.load(f)
        segments = ner_result.get("segments_with_names", [])
    else:
        # NER 없으면 병합 결과만
        merged_path = status.get("merged_path")
        if not merged_path or not Path(merged_path).exists():
            raise HTTPException(status_code=404, detail="병합 결과를 찾을 수 없습니다.")

        with open(merged_path, 'r', encoding='utf-8') as f:
            segments = json.load(f)

    return {
        "file_id": file_id,
        "segments": segments,
        "total_segments": len(segments),
        "detected_names": status.get("detected_names", []),
        "speaker_count": status.get("speaker_count", 0),
    }
