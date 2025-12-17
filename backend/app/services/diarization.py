"""
화자 분리 서비스 (I,O.md Step 4)
- 모델 1: Senko (빠름, 간단)
- 모델 2: NeMo (정확, 세밀한 설정)
- 화자별 임베딩 추출
"""
import app.patch_torch  # Apply monkey patch first
from pathlib import Path
from typing import Dict, List
import numpy as np

try:
    import senko
    SENKO_AVAILABLE = True
except ImportError:
    SENKO_AVAILABLE = False
    print("⚠️ Senko not installed. Install with: pip install git+https://github.com/narcotic-sh/senko.git")

from app.core.device import get_device


def run_diarization(audio_path: Path, device: str = None, mode: str = "senko", num_speakers: int = None) -> Dict:
    """
    화자 분리 통합 인터페이스

    Args:
        audio_path: 오디오 파일 경로
        device: 디바이스 ("cuda", "cpu", None=auto)
        mode: 화자 분리 모델 ("senko" or "nemo")

    Returns:
        화자 분리 결과 (turns + embeddings)
    """
    if mode == "nemo":
        # NeMo 모델 사용
        from app.services.diarization_nemo import run_diarization_nemo
        return run_diarization_nemo(audio_path, device, num_speakers=num_speakers)
    else:
        # Senko 모델 사용 (기본값)
        return run_diarization_senko(audio_path, device)


def run_diarization_senko(audio_path: Path, device: str = None) -> Dict:
    """
    Senko를 사용한 화자 분리

    Args:
        audio_path: 오디오 파일 경로 (전처리된 WAV)
        device: 디바이스 ("cuda", "mps", "cpu", None=auto)

    Returns:
        {
            "turns": [
                {"speaker_label": "speaker_00", "start": 0.0, "end": 5.2},
                ...
            ],
            "embeddings": {
                "speaker_00": [0.1, 0.2, ...],  # 192차원 벡터
                ...
            }
        }
    """
    import torch

    if not SENKO_AVAILABLE:
        raise ImportError("Senko is not installed. Please install it first.")

    # 디바이스 자동 감지
    if device is None:
        device = get_device()

    # CUDA 실제 사용 가능 여부 재확인 (Docker와 실제 환경 불일치 방지)
    if device == "cuda" and not torch.cuda.is_available():
        print("⚠️ CUDA requested but not available. Falling back to CPU.")
        device = "cpu"

    # Senko는 'auto' 또는 'cpu'/'cuda' 지원
    # MPS는 지원하지 않으므로 CPU로 폴백
    if device == "mps":
        print("⚠️ Senko does not support MPS. Using CPU instead.")
        device = "cpu"

    print(f"[Diarization] Using device: {device}")
    print(f"[Diarization] Processing: {audio_path}")

    # 메모리 정리 (Diarization 시작 전)
    import gc
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # Senko Diarizer 초기화 (warmup은 메모리를 많이 사용하므로 CPU에서는 비활성화)
    warmup = device != "cpu"  # CPU에서는 warmup 비활성화로 메모리 절약
    print(f"[Diarization] Warmup: {warmup}")
    diarizer = senko.Diarizer(device=device, warmup=warmup, quiet=False)

    # 화자 분리 실행
    senko_result = diarizer.diarize(str(audio_path), generate_colors=False)

    # 결과 변환
    result = convert_senko_to_custom_format(senko_result)

    # Diarization 완료 후 메모리 정리
    del diarizer
    del senko_result
    gc.collect()

    print(f"[Diarization] Detected {len(result['embeddings'])} speakers")
    print(f"[Diarization] {len(result['turns'])} segments")

    return result


def convert_senko_to_custom_format(senko_result: Dict) -> Dict:
    """
    Senko 결과를 우리 프로젝트 형식으로 변환

    Args:
        senko_result: Senko diarizer 결과
            - merged_segments: List[Dict] - 화자별 시간 구간
            - speaker_centroids: Dict[str, np.ndarray] - 화자별 임베딩

    Returns:
        {
            "turns": [{"speaker_label": str, "start": float, "end": float}],
            "embeddings": {speaker_label: List[float]}
        }
    """
    # 1. turns 데이터 생성
    turns = []
    for segment in senko_result['merged_segments']:
        turns.append({
            "speaker_label": segment['speaker'],
            "start": round(segment['start'], 2),
            "end": round(segment['end'], 2)
        })

    # 2. embeddings 데이터 생성
    embeddings = {}
    for speaker, centroid in senko_result['speaker_centroids'].items():
        # numpy array를 list로 변환
        if isinstance(centroid, np.ndarray):
            embeddings[speaker] = centroid.tolist()
        else:
            embeddings[speaker] = list(centroid)

    result = {
        "turns": turns,
        "embeddings": embeddings
    }

    return result


def merge_stt_with_diarization(
    stt_segments: List[Dict], diarization_result: Dict
) -> Dict:
    """
    STT 결과와 화자 분리 결과 병합 (개선된 버전)
    - STT 세그먼트 손실 방지 (100% 보존)
    - 가장 많이 겹치는 화자에게 할당
    - 겹치지 않는 경우 가까운 화자에게 할당하거나 UNKNOWN 처리
    - 정렬 품질 점수 계산

    Args:
        stt_segments: STT 결과 [{"text": str, "start": float, "end": float}, ...]
        diarization_result: 화자 분리 결과 {"turns": [...], "embeddings": {...}}

    Returns:
        {
            "merged_result": [
                {"speaker": "speaker_00", "start": 0.0, "end": 5.2, "text": "안녕하세요"}, ...
            ],
            "alignment_score": 95.5,  # 0~100점
            "unassigned_duration": 2.5 # 초 단위
        }
    """
    import copy
    
    turns = diarization_result.get('turns', [])
    if not turns:
        # 분리 결과가 없으면 전체를 UNKNOWN으로 처리
        return {
            "merged_result": [
                {
                    "speaker": "UNKNOWN", 
                    "start": s['start'], 
                    "end": s['end'], 
                    "text": s['text']
                } for s in stt_segments
            ],
            "alignment_score": 0.0,
            "unassigned_duration": sum(s['end'] - s['start'] for s in stt_segments)
        }

    merged = []
    
    total_stt_duration = 0.0
    total_overlap_duration = 0.0
    total_unassigned_duration = 0.0
    
    # 턴을 시작 시간 순으로 정렬 (이미 되어있겠지만 확인)
    sorted_turns = sorted(turns, key=lambda x: x['start'])
    
    for stt in stt_segments:
        s_start = stt['start']
        s_end = stt['end']
        s_text = stt['text']
        s_dur = s_end - s_start
        
        total_stt_duration += s_dur
        
        # 1. 겹치는 화자 턴 찾기
        overlaps = []
        for turn in sorted_turns:
            t_start = turn['start']
            t_end = turn['end']
            speaker = turn['speaker_label']
            
            # None 값 체크 (방어 코드)
            if t_start is None or t_end is None or s_start is None or s_end is None:
                continue

            # 겹치는 구간 계산
            o_start = max(s_start, t_start)
            o_end = min(s_end, t_end)
            
            if o_end > o_start:
                overlap_dur = o_end - o_start
                overlaps.append({
                    "speaker": speaker,
                    "duration": overlap_dur,
                    "turn_start": t_start,
                    "turn_end": t_end
                })
        
        assigned_speaker = "UNKNOWN"
        is_assigned = False

        if overlaps:
            # 가장 많이 겹치는 화자 선택
            best_overlap = max(overlaps, key=lambda x: x['duration'])
            assigned_speaker = best_overlap['speaker']
            total_overlap_duration += best_overlap['duration']
            is_assigned = True
        else:
            # 겹치지 않는 경우: 가까운 화자 찾기 (Gap Filling)
            # 허용 오차: 1.0초 이내면 인접 화자에게 붙임
            gap_threshold = 1.0
            min_dist = float('inf')
            nearest_speaker = None
            
            for turn in sorted_turns:
                t_start = turn['start']
                t_end = turn['end']
                
                # STT가 턴보다 앞에 있는 경우거리
                dist_before = max(0, t_start - s_end)
                # STT가 턴보다 뒤에 있는 경우 거리
                dist_after = max(0, s_start - t_end)
                
                dist = min(dist_before, dist_after) if dist_before > 0 and dist_after > 0 else max(dist_before, dist_after)
                
                # 턴 내부에 포함된 경우는 위 overlaps에서 처리되었으므로 여기선 고려 안함
                # (실제로는 위에서 걸러지므로 여기 올 일 없음)
                
                if dist < min_dist:
                    min_dist = dist
                    nearest_speaker = turn['speaker_label']
            
            if min_dist <= gap_threshold and nearest_speaker:
                assigned_speaker = nearest_speaker
                # 인접 할당은 정렬 점수에는 일부만 반영하거나 반영 안 할 수도 있음
                # 여기서는 '구제된' 것으로 보고 절반 정도 점수 부여 (선택사항)
                # 우선 엄격하게 overlap만 점수로 치고, 이건 unassigned에서는 뺌
            else:
                total_unassigned_duration += s_dur

        # 결과 리스트에 추가 (이전 화자와 같으면 텍스트 병합 여부는 선택사항. 여기선 세그먼트 1:1 유지)
        # 단, 연속된 세그먼트가 같은 화자일 경우 병합하는 로직이 있으면 깔끔함
        # 여기서는 세그먼트 단위 유지를 기본으로 함
        
        merged.append({
            "speaker": assigned_speaker,
            "start": s_start,
            "end": s_end,
            "text": s_text
        })
        
    # 점수 계산
    alignment_score = 0.0
    if total_stt_duration > 0:
        alignment_score = (total_overlap_duration / total_stt_duration) * 100.0
        
    return {
        "merged_result": merged,
        "alignment_score": round(alignment_score, 2),
        "unassigned_duration": round(total_unassigned_duration, 2)
    }
