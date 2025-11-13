from fastapi import APIRouter, HTTPException
from app.schemas.tagging import (
    TaggingSuggestionDetailResponse,
    SuggestedMapping,
    TranscriptSegment,
    TaggingConfirmRequest,
    TaggingConfirmResponse
)

router = APIRouter()

# Mock 데이터 저장소
TAGGING_RESULTS = {}
SPEAKER_INFO = {}  # 화자 정보 확인 페이지에서 저장한 데이터


@router.get("/speaker-info/{file_id}")
async def get_speaker_info(file_id: str):
    """
    화자 정보 조회 (Mock) - 화자 수 + 감지된 이름
    프로세싱 완료 후 사용자 확인을 위한 기본 정보 제공
    """
    # 저장된 정보가 있으면 반환, 없으면 기본값
    if file_id in SPEAKER_INFO:
        return SPEAKER_INFO[file_id]

    # Mock 기본 데이터
    default_data = {
        "file_id": file_id,
        "speaker_count": 3,  # 시스템이 감지한 화자 수
        "detected_names": ["민서", "인서", "김팀장"],  # STT에서 추출한 이름들
        "processing_status": "completed"
    }
    SPEAKER_INFO[file_id] = default_data
    return default_data


@router.post("/speaker-info/confirm")
async def confirm_speaker_info(request: dict):
    """
    화자 정보 확정 - 사용자가 수정한 화자 수 및 이름 저장
    """
    file_id = request.get("file_id")
    speaker_count = request.get("speaker_count")
    detected_names = request.get("detected_names")

    SPEAKER_INFO[file_id] = {
        "file_id": file_id,
        "speaker_count": speaker_count,
        "detected_names": detected_names,
        "processing_status": "confirmed"
    }

    return {
        "message": "화자 정보가 저장되었습니다.",
        "status": "success"
    }


@router.get("/tagging/{file_id}", response_model=TaggingSuggestionDetailResponse)
async def get_tagging_suggestion(file_id: str):
    """
    화자 태깅 제안 조회 (Mock)
    I,O.md Step 5d - 시스템이 분석한 결과를 사용자에게 제안
    """
    # 사용자가 확정한 화자 정보 가져오기
    speaker_info = SPEAKER_INFO.get(file_id, {
        "speaker_count": 3,
        "detected_names": ["민서", "인서", "김팀장"]
    })

    speaker_count = speaker_info.get("speaker_count", 3)
    detected_names = speaker_info.get("detected_names", ["민서", "인서", "김팀장"])

    # 화자 수에 따라 동적으로 매핑 생성
    suggested_mappings = []
    for i in range(speaker_count):
        suggested_name = detected_names[i] if i < len(detected_names) else None
        suggested_mappings.append(
            SuggestedMapping(
                speaker_label=f"SPEAKER_{i:02d}",
                suggested_name=suggested_name
            )
        )

    # Mock 데이터 (실제로는 STT + Diarization 결과 기반으로 생성)
    mock_data = {
        "file_id": file_id,
        "detected_names": detected_names,  # 사용자가 확정한 이름들
        "suggested_mappings": suggested_mappings,
        "sample_transcript": [
            TranscriptSegment(
                speaker_label="SPEAKER_00",
                start_time=0.5,
                end_time=3.2,
                text="오늘 회의 안건은 프로젝트 진행 상황 공유입니다."
            ),
            TranscriptSegment(
                speaker_label="SPEAKER_01",
                start_time=3.5,
                end_time=6.8,
                text="네, 김팀장입니다. 먼저 제가 말씀드리겠습니다."
            ),
            TranscriptSegment(
                speaker_label="SPEAKER_00",
                start_time=7.0,
                end_time=10.5,
                text="아, 민서씨 먼저 시작하시죠. 인서씨 준비되셨나요?"
            ),
            TranscriptSegment(
                speaker_label="SPEAKER_02",
                start_time=10.8,
                end_time=13.5,
                text="네, 준비되었습니다. 지금 바로 시작하겠습니다."
            ),
            TranscriptSegment(
                speaker_label="SPEAKER_01",
                start_time=14.0,
                end_time=18.2,
                text="좋습니다. 김팀장이 정리해드리겠습니다."
            ),
            TranscriptSegment(
                speaker_label="SPEAKER_00",
                start_time=18.5,
                end_time=22.0,
                text="민서가 말씀드린 것처럼 일정대로 진행하면 될 것 같습니다."
            )
        ]
    }

    return TaggingSuggestionDetailResponse(**mock_data)


@router.post("/tagging/confirm", response_model=TaggingConfirmResponse)
async def confirm_tagging(request: TaggingConfirmRequest):
    """
    화자 태깅 확정 (Mock)
    I,O.md Step 5e - 사용자가 최종 확정한 화자 이름 저장
    """
    # Mock: 사용자 확정 결과 저장
    TAGGING_RESULTS[request.file_id] = {
        "mappings": {mapping.speaker_label: mapping.final_name for mapping in request.mappings},
        "status": "confirmed"
    }

    return TaggingConfirmResponse(
        file_id=request.file_id,
        message="화자 태깅이 완료되었습니다.",
        status="confirmed"
    )


@router.get("/tagging/{file_id}/result")
async def get_tagging_result(file_id: str):
    """
    확정된 태깅 결과 조회
    """
    if file_id not in TAGGING_RESULTS:
        raise HTTPException(
            status_code=404,
            detail="태깅 결과를 찾을 수 없습니다. 먼저 태깅을 완료해주세요."
        )

    result = TAGGING_RESULTS[file_id]

    # Mock 최종 대본 생성 (I,O.md Step 5f)
    mappings = result["mappings"]

    mock_final_transcript = [
        {
            "speaker_name": mappings.get("SPEAKER_00", "Unknown"),
            "start_time": 0.5,
            "end_time": 3.2,
            "text": "오늘 회의 안건은 프로젝트 진행 상황 공유입니다."
        },
        {
            "speaker_name": mappings.get("SPEAKER_01", "Unknown"),
            "start_time": 3.5,
            "end_time": 6.8,
            "text": "네, 김팀장입니다. 먼저 제가 말씀드리겠습니다."
        },
        {
            "speaker_name": mappings.get("SPEAKER_00", "Unknown"),
            "start_time": 7.0,
            "end_time": 10.5,
            "text": "아, 민서씨 먼저 시작하시죠. 인서씨 준비되셨나요?"
        },
        {
            "speaker_name": mappings.get("SPEAKER_02", "Unknown"),
            "start_time": 10.8,
            "end_time": 13.5,
            "text": "네, 준비되었습니다. 지금 바로 시작하겠습니다."
        },
        {
            "speaker_name": mappings.get("SPEAKER_01", "Unknown"),
            "start_time": 14.0,
            "end_time": 18.2,
            "text": "좋습니다. 김팀장이 정리해드리겠습니다."
        },
        {
            "speaker_name": mappings.get("SPEAKER_00", "Unknown"),
            "start_time": 18.5,
            "end_time": 22.0,
            "text": "민서가 말씀드린 것처럼 일정대로 진행하면 될 것 같습니다."
        }
    ]

    return {
        "file_id": file_id,
        "status": result["status"],
        "mappings": mappings,
        "final_transcript": mock_final_transcript
    }
