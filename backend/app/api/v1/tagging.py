from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db
from app.models.audio_file import AudioFile
from app.models.tagging import DetectedName, SpeakerMapping
from app.models.user_confirmation import UserConfirmation
from app.models.stt import STTResult
from app.models.diarization import DiarizationResult
from app.services.agent_data_loader import load_agent_input_data_by_file_id
from app.agents.graph import get_speaker_tagging_app
from app.schemas.tagging import (
    TaggingSuggestionDetailResponse,
    SuggestedMapping,
    TranscriptSegment,
    TaggingConfirmRequest,
    TaggingConfirmResponse,
    SpeakerInfoConfirmRequest
)

router = APIRouter()

# Mock 데이터 저장소 (일부 엔드포인트에서 계속 사용)
TAGGING_RESULTS = {}
SPEAKER_INFO = {}  # 화자 정보 확인 페이지에서 저장한 데이터


@router.get("/speaker-info/{file_id}")
async def get_speaker_info(file_id: str, db: Session = Depends(get_db)):
    """
    화자 정보 조회 - 화자 수 + 감지된 이름
    프로세싱 완료 후 사용자 확인을 위한 기본 정보 제공
    """
    # DB에서 audio_file 찾기
    audio_file = db.query(AudioFile).filter(
        (AudioFile.file_path.like(f"%{file_id}%")) |
        (AudioFile.original_filename.like(f"%{file_id}%"))
    ).first()

    if not audio_file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

    # 화자 수 조회 (SpeakerMapping에서 고유 화자 레이블 개수)
    speaker_count = db.query(func.count(SpeakerMapping.id)).filter(
        SpeakerMapping.audio_file_id == audio_file.id
    ).scalar() or 0

    # 감지된 이름 조회 (DetectedName에서 중복 제거한 이름 리스트)
    detected_names_query = db.query(DetectedName.detected_name).filter(
        DetectedName.audio_file_id == audio_file.id
    ).distinct().all()

    detected_names = [name[0] for name in detected_names_query]

    # 닉네임 조회 (화자별 닉네임)
    speaker_mappings = db.query(SpeakerMapping).filter(
        SpeakerMapping.audio_file_id == audio_file.id
    ).all()
    detected_nicknames = []
    for mapping in speaker_mappings:
        if mapping.nickname:
            detected_nicknames.append(mapping.nickname)

    return {
        "file_id": file_id,
        "speaker_count": speaker_count,
        "detected_names": detected_names,
        "detected_nicknames": detected_nicknames,  # 닉네임 추가
        "processing_status": audio_file.status.value if audio_file.status else "unknown"
    }


@router.post("/speaker-info/confirm")
async def confirm_speaker_info(request: SpeakerInfoConfirmRequest, db: Session = Depends(get_db)):
    """
    화자 정보 확정 - 사용자가 수정한 화자 수 및 이름 저장
    """
    try:
        file_id = request.file_id
        speaker_count = request.speaker_count
        detected_names = request.detected_names
        detected_nicknames = request.detected_nicknames or []

        print(f"🔍 화자 정보 확정 요청: file_id={file_id}, speaker_count={speaker_count}, detected_names={detected_names}, detected_nicknames={detected_nicknames}")

        # DB에서 audio_file 찾기
        audio_file = db.query(AudioFile).filter(
            (AudioFile.file_path.like(f"%{file_id}%")) |
            (AudioFile.original_filename.like(f"%{file_id}%"))
        ).first()

        if not audio_file:
            print(f"❌ 파일을 찾을 수 없음: file_id={file_id}")
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

        print(f"✅ AudioFile 찾음: id={audio_file.id}, file_path={audio_file.file_path}")

        # 기존 UserConfirmation이 있는지 확인 (업데이트 vs 생성)
        existing_confirmation = db.query(UserConfirmation).filter(
            UserConfirmation.audio_file_id == audio_file.id
        ).first()

        if existing_confirmation:
            # 업데이트
            print(f"🔄 기존 UserConfirmation 업데이트: id={existing_confirmation.id}")
            existing_confirmation.confirmed_speaker_count = speaker_count
            existing_confirmation.confirmed_names = detected_names
            existing_confirmation.confirmed_nicknames = detected_nicknames
        else:
            # 새로 생성
            print(f"➕ 새 UserConfirmation 생성: audio_file_id={audio_file.id}")
            user_confirmation = UserConfirmation(
                audio_file_id=audio_file.id,
                confirmed_speaker_count=speaker_count,
                confirmed_names=detected_names,
                confirmed_nicknames=detected_nicknames
            )
            db.add(user_confirmation)

        db.commit()
        print(f"✅ 화자 정보 저장 완료: audio_file_id={audio_file.id}")

        return {
            "message": "화자 정보가 저장되었습니다.",
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 화자 정보 저장 중 오류 발생: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"화자 정보 저장 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/{file_id}", response_model=TaggingSuggestionDetailResponse)
async def get_tagging_suggestion(file_id: str, db: Session = Depends(get_db)):
    """
    화자 태깅 제안 조회
    I,O.md Step 5d - 시스템이 분석한 결과를 사용자에게 제안
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
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

    # STT 결과 조회
    stt_results = db.query(STTResult).filter(
        STTResult.audio_file_id == audio_file.id
    ).order_by(STTResult.start_time).all()

    # Diarization 결과 조회
    diar_results = db.query(DiarizationResult).filter(
        DiarizationResult.audio_file_id == audio_file.id
    ).order_by(DiarizationResult.start_time).all()

    # STT와 Diarization 병합
    merged_segments = []
    for stt in stt_results:
        speaker_label = "UNKNOWN"
        for diar in diar_results:
            if diar.start_time <= stt.start_time < diar.end_time:
                speaker_label = diar.speaker_label
                break

        merged_segments.append({
            "speaker": speaker_label,
            "start": stt.start_time,
            "end": stt.end_time,
            "text": stt.text
        })

    # SpeakerMapping에서 Agent가 제안한 이름 가져오기
    speaker_mappings = db.query(SpeakerMapping).filter(
        SpeakerMapping.audio_file_id == audio_file.id
    ).all()

    # suggested_mappings 구성 (기존 final_name도 포함)
    suggested_mappings = []
    for sm in speaker_mappings:
        suggested_mappings.append(
            SuggestedMapping(
                speaker_label=sm.speaker_label,
                suggested_name=sm.suggested_name,
                nickname=sm.nickname,
                final_name=sm.final_name  # 기존 확정된 이름
            )
        )

    # 사용자가 확정한 이름 및 닉네임 목록
    user_confirmation = db.query(UserConfirmation).filter(
        UserConfirmation.audio_file_id == audio_file.id
    ).first()

    detected_names = user_confirmation.confirmed_names if user_confirmation and user_confirmation.confirmed_names else []
    detected_nicknames = user_confirmation.confirmed_nicknames if user_confirmation and user_confirmation.confirmed_nicknames else []

    # UserConfirmation이 없으면 DetectedName 테이블에서 가져오기
    if not detected_names:
        detected_names_query = db.query(DetectedName.detected_name).filter(
            DetectedName.audio_file_id == audio_file.id
        ).distinct().all()
        detected_names = [name[0] for name in detected_names_query if name[0]]

    # 닉네임이 없으면 SpeakerMapping에서 가져오기
    if not detected_nicknames:
        detected_nicknames = [sm.nickname for sm in speaker_mappings if sm.nickname]

    # sample_transcript 구성 (처음 20개 세그먼트)
    sample_transcript = []
    for seg in merged_segments[:20]:
        sample_transcript.append(
            TranscriptSegment(
                speaker_label=seg["speaker"],
                start_time=seg["start"],
                end_time=seg["end"],
                text=seg["text"]
            )
        )

    return TaggingSuggestionDetailResponse(
        file_id=file_id,
        detected_names=detected_names,
        detected_nicknames=detected_nicknames,  # 닉네임 추가
        suggested_mappings=suggested_mappings,
        sample_transcript=sample_transcript
    )


@router.post("/analyze/{file_id}")
async def analyze_speakers(
    file_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    LangGraph Agent 실행 (백그라운드)
    I,O.md Step 5a~5c - 멀티턴 LLM 추론으로 화자 태깅
    """
    # AudioFile 찾기
    audio_file = db.query(AudioFile).filter(
        (AudioFile.file_path.like(f"%{file_id}%")) |
        (AudioFile.original_filename.like(f"%{file_id}%"))
    ).first()

    if not audio_file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

    # Agent 실행 (백그라운드)
    background_tasks.add_task(
        run_tagging_agent,
        file_id=file_id,
        audio_file_id=audio_file.id,
        user_id=audio_file.user_id
    )

    return {
        "file_id": file_id,
        "message": "화자 태깅 분석이 시작되었습니다.",
        "status": "processing"
    }


async def run_tagging_agent(file_id: str, audio_file_id: int, user_id: int):
    """
    Agent 실행 및 결과 DB 저장
    """
    import os
    from app.db.base import SessionLocal
    
    # LangSmith 추적 환경 변수 확인 및 자동 조정 (백그라운드 태스크에서도 동작 확인)
    langchain_tracing = os.getenv("LANGCHAIN_TRACING_V2", "false")
    if langchain_tracing.lower() == "true":
        # LANGSMITH_API_KEY도 확인 (일부 설정에서 사용)
        langchain_api_key = os.getenv("LANGCHAIN_API_KEY") or os.getenv("LANGSMITH_API_KEY")
        if langchain_api_key and langchain_api_key.strip():
            # LANGCHAIN_API_KEY가 없으면 LANGSMITH_API_KEY를 복사
            if not os.getenv("LANGCHAIN_API_KEY") and os.getenv("LANGSMITH_API_KEY"):
                os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMITH_API_KEY")
            print(f"🔍 LangSmith 추적 활성화: file_id={file_id}, audio_file_id={audio_file_id}")
        else:
            # API 키가 없으면 자동으로 추적 비활성화 (에러 방지)
            os.environ["LANGCHAIN_TRACING_V2"] = "false"
            print(f"⚠️ LANGCHAIN_TRACING_V2=true이지만 LANGCHAIN_API_KEY 또는 LANGSMITH_API_KEY가 없어서 추적을 비활성화했습니다. file_id={file_id}")
    else:
        print(f"ℹ️ LangSmith 추적 비활성화: file_id={file_id}")
    
    # 백그라운드 태스크용 새 DB 세션 생성
    db = SessionLocal()
    
    try:
        # 1. DB에서 데이터 로드
        agent_input = load_agent_input_data_by_file_id(file_id, db)
        
        # 2. AgentState 구성
        initial_state = {
            "user_id": user_id,
            "audio_file_id": audio_file_id,
            "stt_result": agent_input["stt_result"],
            "diar_result": agent_input["diar_result"],
            "participant_names": agent_input.get("participant_names", []),
            "previous_profiles": [],
            "auto_matched": {},
            "name_mentions": agent_input["name_mentions"],
            "speaker_utterances": {},
            "mapping_history": [],
            "name_based_results": {},
            "final_mappings": {},
            "needs_manual_review": []
        }

        # 3. Agent 실행 (LangSmith 추적 포함)
        app = get_speaker_tagging_app()
        
        # LangSmith 추적을 위한 config 설정
        # 각 실행을 구분하기 위해 run_name과 metadata 추가
        config = {
            "configurable": {
                "thread_id": f"audio_file_{audio_file_id}",
            },
            "metadata": {
                "file_id": file_id,
                "audio_file_id": audio_file_id,
                "user_id": user_id,
                "run_name": f"speaker_tagging_{file_id}",
            }
        }
        
        final_state = await app.ainvoke(initial_state, config=config)

        # 4. 결과를 SpeakerMapping 테이블에 저장
        final_mappings = final_state.get("final_mappings", {})
        
        for speaker_label, mapping_info in final_mappings.items():
            # 기존 SpeakerMapping 찾기
            speaker_mapping = db.query(SpeakerMapping).filter(
                SpeakerMapping.audio_file_id == audio_file_id,
                SpeakerMapping.speaker_label == speaker_label
            ).first()

            if speaker_mapping:
                # 업데이트
                speaker_mapping.suggested_name = mapping_info.get("name")
                speaker_mapping.name_confidence = mapping_info.get("confidence")
                speaker_mapping.name_mentions = len([
                    m for m in final_state.get("name_mentions", [])
                    if m.get("name") == mapping_info.get("name")
                ])
                speaker_mapping.needs_manual_review = mapping_info.get("needs_review", False)
                speaker_mapping.conflict_detected = False  # name_based만 사용하므로 conflict 없음
            else:
                # 새로 생성
                speaker_mapping = SpeakerMapping(
                    audio_file_id=audio_file_id,
                    speaker_label=speaker_label,
                    suggested_name=mapping_info.get("name"),
                    name_confidence=mapping_info.get("confidence"),
                    name_mentions=len([
                        m for m in final_state.get("name_mentions", [])
                        if m.get("name") == mapping_info.get("name")
                    ]),
                    suggested_role=None,
                    role_confidence=None,
                    conflict_detected=False,
                    needs_manual_review=mapping_info.get("needs_review", False),
                    final_name="",
                    is_modified=False
                )
                db.add(speaker_mapping)

        db.commit()
        print(f"✅ Agent 실행 완료: audio_file_id={audio_file_id}, 매핑 {len(final_mappings)}개 저장")

    except Exception as e:
        print(f"⚠️ Agent 실행 실패: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()


@router.post("/confirm", response_model=TaggingConfirmResponse)
async def confirm_tagging(
    request: TaggingConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    화자 태깅 확정
    I,O.md Step 5e - 사용자가 최종 확정한 화자 이름 저장
    """
    # AudioFile 찾기 - ID(숫자)로 먼저 시도, 실패시 문자열 검색
    audio_file = None
    if request.file_id.isdigit():
        audio_file = db.query(AudioFile).filter(AudioFile.id == int(request.file_id)).first()
    if not audio_file:
        audio_file = db.query(AudioFile).filter(
            (AudioFile.file_path.like(f"%{request.file_id}%")) |
            (AudioFile.original_filename.like(f"%{request.file_id}%"))
        ).first()

    if not audio_file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

    # 화자명 변경 감지 및 벡터 DB 삭제
    needs_rag_reinit = False
    if audio_file.rag_initialized:
        # 기존 매핑과 비교하여 변경 여부 확인
        existing_mappings = db.query(SpeakerMapping).filter(
            SpeakerMapping.audio_file_id == audio_file.id
        ).all()
        existing_final_names = {sm.speaker_label: sm.final_name for sm in existing_mappings if sm.final_name}
        
        # 새로운 매핑과 비교
        for mapping in request.mappings:
            old_name = existing_final_names.get(mapping.speaker_label)
            if old_name and old_name != mapping.final_name:
                needs_rag_reinit = True
                break
        
        # 벡터 DB 삭제
        if needs_rag_reinit:
            from app.services.rag_service import RAGService
            rag_service = RAGService()
            rag_service.delete_collection(str(audio_file.id))
            audio_file.rag_initialized = False
            audio_file.rag_collection_name = None
            audio_file.rag_initialized_at = None

    # SpeakerMapping 업데이트
    for mapping in request.mappings:
        speaker_mapping = db.query(SpeakerMapping).filter(
            SpeakerMapping.audio_file_id == audio_file.id,
            SpeakerMapping.speaker_label == mapping.speaker_label
        ).first()

        if speaker_mapping:
            # 사용자가 수정했는지 확인
            is_modified = speaker_mapping.suggested_name != mapping.final_name
            
            speaker_mapping.final_name = mapping.final_name
            speaker_mapping.is_modified = is_modified
        else:
            # 새로 생성
            speaker_mapping = SpeakerMapping(
                audio_file_id=audio_file.id,
                speaker_label=mapping.speaker_label,
                suggested_name=None,
                name_confidence=None,
                name_mentions=0,
                suggested_role=None,
                role_confidence=None,
                conflict_detected=False,
                needs_manual_review=False,
                final_name=mapping.final_name,
                is_modified=True
            )
            db.add(speaker_mapping)

    # FinalTranscript 생성/업데이트 (Step 5f)
    from app.models.transcript import FinalTranscript
    from app.models.stt import STTResult
    from app.models.diarization import DiarizationResult
    
    # 기존 FinalTranscript 삭제 (재생성을 위해)
    db.query(FinalTranscript).filter(
        FinalTranscript.audio_file_id == audio_file.id
    ).delete()
    
    # STT 결과 조회
    stt_results = db.query(STTResult).filter(
        STTResult.audio_file_id == audio_file.id
    ).order_by(STTResult.start_time).all()

    # Diarization 결과 조회
    diar_results = db.query(DiarizationResult).filter(
        DiarizationResult.audio_file_id == audio_file.id
    ).order_by(DiarizationResult.start_time).all()

    # SpeakerMapping에서 final_name 가져오기
    speaker_mappings = db.query(SpeakerMapping).filter(
        SpeakerMapping.audio_file_id == audio_file.id
    ).all()
    mappings = {sm.speaker_label: sm.final_name for sm in speaker_mappings if sm.final_name}

    # FinalTranscript 생성
    for idx, stt in enumerate(stt_results):
        speaker_label = "UNKNOWN"
        for diar in diar_results:
            if diar.start_time <= stt.start_time < diar.end_time:
                speaker_label = diar.speaker_label
                break

        # final_name 매핑 적용 (없으면 speaker_label 사용)
        speaker_name = mappings.get(speaker_label, speaker_label)

        final_transcript = FinalTranscript(
            audio_file_id=audio_file.id,
            segment_index=idx,
            speaker_name=speaker_name,
            start_time=stt.start_time,
            end_time=stt.end_time,
            text=stt.text
        )
        db.add(final_transcript)

    db.commit()

    # 화자 태깅 완료 후 효율성 분석 자동 실행
    from app.api.v1.efficiency import run_efficiency_analysis
    background_tasks.add_task(run_efficiency_analysis, audio_file.id)

    response_message = "화자 태깅이 완료되었습니다. 효율성 분석이 백그라운드에서 실행됩니다."
    if needs_rag_reinit:
        response_message += " 화자명이 변경되어 벡터 DB가 삭제되었습니다. RAG 기능을 사용하려면 다시 초기화해주세요."

    return TaggingConfirmResponse(
        file_id=request.file_id,
        message=response_message,
        status="confirmed"
    )


@router.get("/{file_id}/result")
async def get_tagging_result(file_id: str, db: Session = Depends(get_db)):
    """
    확정된 태깅 결과 조회
    I,O.md Step 5f - 사용자가 확정한 화자 이름이 적용된 최종 대본
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
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

    # SpeakerMapping에서 final_name 가져오기
    speaker_mappings = db.query(SpeakerMapping).filter(
        SpeakerMapping.audio_file_id == audio_file.id
    ).all()

    # final_name이 있는지 확인
    mappings = {sm.speaker_label: sm.final_name for sm in speaker_mappings if sm.final_name}
    
    if not mappings:
        raise HTTPException(
            status_code=404,
            detail="태깅 결과를 찾을 수 없습니다. 먼저 태깅을 완료해주세요."
        )

    # STT 결과 조회
    stt_results = db.query(STTResult).filter(
        STTResult.audio_file_id == audio_file.id
    ).order_by(STTResult.start_time).all()

    # Diarization 결과 조회
    diar_results = db.query(DiarizationResult).filter(
        DiarizationResult.audio_file_id == audio_file.id
    ).order_by(DiarizationResult.start_time).all()

    # STT와 Diarization 병합하여 최종 대본 생성
    final_transcript = []
    for stt in stt_results:
        speaker_label = "UNKNOWN"
        for diar in diar_results:
            if diar.start_time <= stt.start_time < diar.end_time:
                speaker_label = diar.speaker_label
                break

        # final_name 매핑 적용
        speaker_name = mappings.get(speaker_label, "Unknown")

        final_transcript.append({
            "speaker_name": speaker_name,
            "speaker_label": speaker_label,
            "start_time": stt.start_time,
            "end_time": stt.end_time,
            "text": stt.text
        })

    return {
        "file_id": file_id,
        "audio_file_id": audio_file.id,  # RAG 등에서 사용할 숫자 ID
        "status": "confirmed",
        "mappings": mappings,
        "final_transcript": final_transcript,
        "total_segments": len(final_transcript)
    }
