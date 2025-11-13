from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.user import Token

router = APIRouter()


# ============================================
# Google OAuth
# ============================================

@router.get("/auth/google/login")
async def google_login():
    """
    구글 로그인 시작
    - 구글 OAuth 동의 화면으로 리다이렉트
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth가 설정되지 않았습니다."
        )

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid email profile"
        "&access_type=offline"
    )

    return RedirectResponse(url=google_auth_url)


@router.get("/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """
    구글 OAuth 콜백
    - 인증 코드로 액세스 토큰 받기
    - 사용자 정보 조회
    - 기존 사용자면 로그인, 신규면 회원가입
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth가 설정되지 않았습니다."
        )

    # 1. 인증 코드로 액세스 토큰 받기
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=token_data)

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google 토큰 발급 실패"
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

        # 2. 액세스 토큰으로 사용자 정보 조회
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}

        userinfo_response = await client.get(userinfo_url, headers=headers)

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google 사용자 정보 조회 실패"
            )

        userinfo = userinfo_response.json()

    # 3. 사용자 정보 추출
    email = userinfo.get("email")
    name = userinfo.get("name")
    google_id = userinfo.get("id")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일 정보를 가져올 수 없습니다."
        )

    # 4. 기존 사용자 확인 (이메일 + OAuth 제공자로 확인)
    user = db.query(User).filter(
        User.email == email,
        User.oauth_provider == "google"
    ).first()

    if not user:
        # 신규 사용자 - 회원가입
        user = User(
            email=email,
            full_name=name or email.split("@")[0],
            oauth_provider="google",
            oauth_id=google_id,
            is_active=True,
            password_hash=None  # OAuth 사용자는 비밀번호 없음
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 5. JWT 토큰 발급
    access_token_jwt = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token_jwt = create_refresh_token(data={"sub": str(user.id), "email": user.email})

    # 6. 프론트엔드로 리다이렉트 (토큰을 URL 파라미터로 전달)
    frontend_url = f"http://localhost:3000/oauth/callback?access_token={access_token_jwt}&refresh_token={refresh_token_jwt}"
    return RedirectResponse(url=frontend_url)


# ============================================
# Kakao OAuth
# ============================================

@router.get("/auth/kakao/login")
async def kakao_login():
    """
    카카오 로그인 시작
    - 카카오 OAuth 동의 화면으로 리다이렉트
    """
    if not settings.KAKAO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Kakao OAuth가 설정되지 않았습니다."
        )

    kakao_auth_url = (
        "https://kauth.kakao.com/oauth/authorize"
        f"?client_id={settings.KAKAO_CLIENT_ID}"
        f"&redirect_uri={settings.KAKAO_REDIRECT_URI}"
        "&response_type=code"
    )

    return RedirectResponse(url=kakao_auth_url)


@router.get("/auth/kakao/callback")
async def kakao_callback(code: str, db: Session = Depends(get_db)):
    """
    카카오 OAuth 콜백
    - 인증 코드로 액세스 토큰 받기
    - 사용자 정보 조회
    - 기존 사용자면 로그인, 신규면 회원가입
    """
    if not settings.KAKAO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Kakao OAuth가 설정되지 않았습니다."
        )

    # 1. 인증 코드로 액세스 토큰 받기
    token_url = "https://kauth.kakao.com/oauth/token"
    token_data = {
        "grant_type": "authorization_code",
        "client_id": settings.KAKAO_CLIENT_ID,
        "redirect_uri": settings.KAKAO_REDIRECT_URI,
        "code": code
    }

    # Client Secret이 있으면 추가
    if settings.KAKAO_CLIENT_SECRET:
        token_data["client_secret"] = settings.KAKAO_CLIENT_SECRET

    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=token_data)

        if token_response.status_code != 200:
            # 상세 에러 로깅
            error_detail = token_response.json() if token_response.text else "Unknown error"
            print(f"Kakao token error: {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kakao 토큰 발급 실패: {error_detail}"
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

        # 2. 액세스 토큰으로 사용자 정보 조회
        userinfo_url = "https://kapi.kakao.com/v2/user/me"
        headers = {"Authorization": f"Bearer {access_token}"}

        userinfo_response = await client.get(userinfo_url, headers=headers)

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kakao 사용자 정보 조회 실패"
            )

        userinfo = userinfo_response.json()

    # 3. 사용자 정보 추출
    kakao_id = str(userinfo.get("id"))
    kakao_account = userinfo.get("kakao_account", {})
    email = kakao_account.get("email")
    profile = kakao_account.get("profile", {})
    name = profile.get("nickname")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일 정보를 가져올 수 없습니다. 카카오 계정에서 이메일 제공 동의가 필요합니다."
        )

    # 4. 기존 사용자 확인
    user = db.query(User).filter(
        User.email == email,
        User.oauth_provider == "kakao"
    ).first()

    if not user:
        # 신규 사용자 - 회원가입
        user = User(
            email=email,
            full_name=name or email.split("@")[0],
            oauth_provider="kakao",
            oauth_id=kakao_id,
            is_active=True,
            password_hash=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 5. JWT 토큰 발급
    access_token_jwt = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token_jwt = create_refresh_token(data={"sub": str(user.id), "email": user.email})

    # 6. 프론트엔드로 리다이렉트 (토큰을 URL 파라미터로 전달)
    frontend_url = f"http://localhost:3000/oauth/callback?access_token={access_token_jwt}&refresh_token={refresh_token_jwt}"
    return RedirectResponse(url=frontend_url)
