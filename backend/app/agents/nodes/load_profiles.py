"""
load_profiles_node
기존 화자 프로필 로드 (현재는 프로필 테이블 없으므로 빈 리스트 반환)
"""
from app.agents.state import AgentState


async def load_profiles_node(state: AgentState) -> AgentState:
    """
    user_speaker_profiles DB에서 기존 프로필들을 로드합니다.
    현재는 프로필 테이블이 없으므로 빈 리스트 반환.
    """
    # TODO: 프로필 테이블 추가 후 LoadProfilesTool 호출
    state["previous_profiles"] = []
    return state

