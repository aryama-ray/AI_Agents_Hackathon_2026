import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.models import GuestLoginResponse, SignupRequest, LoginRequest, AuthResponse
from app.database import get_supabase_anon, get_supabase_admin

router = APIRouter()

ALEX_UUID = "00000000-0000-0000-0000-000000000001"


def _extract_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Try to extract user_id from a Bearer JWT token. Returns None if invalid/missing."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    try:
        supabase = get_supabase_anon()
        response = supabase.auth.get_user(token)
        if response.user:
            return str(response.user.id)
    except Exception:
        pass
    return None


@router.post("/guest", response_model=GuestLoginResponse)
async def guest_login(authorization: Optional[str] = Header(None)):
    """Create or retrieve the guest Alex demo account with pre-seeded data.

    If a valid JWT is provided (from frontend signInAnonymously()), seeds
    demo data for that authenticated user's UUID. Otherwise falls back to
    the hardcoded ALEX_UUID for backward compatibility (curl testing).
    """
    db = get_supabase_admin()

    # Determine which user_id to seed for
    jwt_user_id = _extract_user_id_from_token(authorization)
    user_id = jwt_user_id or ALEX_UUID

    # Check if user already has seed data
    result = db.table("users").select("*").eq("id", user_id).execute()
    if result.data:
        # Check if seed data is complete (should have 14 checkins)
        checkins = db.table("checkins").select("id", count="exact").eq("user_id", user_id).execute()
        if not checkins.count or checkins.count < 14:
            from app.services.seed_service import seed_demo_data
            await asyncio.to_thread(seed_demo_data, user_id)
        profile = db.table("cognitive_profiles").select("id").eq("user_id", user_id).limit(1).execute()

        # Ensure user row has Alex demo name
        db.table("users").update({
            "name": "Alex",
            "is_guest": True,
            "cognitive_profile_summary": "Deep-Diver with strong hyperfocus and variable task initiation",
        }).eq("id", user_id).execute()

        return GuestLoginResponse(
            userId=user_id,
            name="Alex",
            isGuest=True,
            hasProfile=bool(profile.data),
        )

    # User row doesn't exist yet — create it
    # (For JWT users, the handle_new_user trigger may have already created the row,
    #  but for ALEX_UUID fallback we need to insert manually)
    db.table("users").upsert({
        "id": user_id,
        "email": "alex@attune-demo.com" if user_id == ALEX_UUID else None,
        "name": "Alex",
        "is_guest": True,
        "cognitive_profile_summary": "Deep-Diver with strong hyperfocus and variable task initiation",
    }).execute()

    # Seed demo data
    from app.services.seed_service import seed_demo_data
    await asyncio.to_thread(seed_demo_data, user_id)

    return GuestLoginResponse(
        userId=user_id,
        name="Alex",
        isGuest=True,
        hasProfile=True,
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Create a new user account via Supabase Auth."""
    db = get_supabase_anon()

    try:
        result = db.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {"data": {"name": request.name}},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")

    if result.user is None:
        raise HTTPException(status_code=400, detail="Signup failed")

    access_token = result.session.access_token if result.session else ""

    return AuthResponse(
        userId=str(result.user.id),
        name=request.name,
        isGuest=False,
        hasProfile=False,
        accessToken=access_token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Sign in with email and password."""
    db = get_supabase_anon()

    try:
        result = db.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

    if result.user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if user has a cognitive profile
    admin_db = get_supabase_admin()
    profile = (
        admin_db.table("cognitive_profiles")
        .select("id")
        .eq("user_id", str(result.user.id))
        .limit(1)
        .execute()
    )

    return AuthResponse(
        userId=str(result.user.id),
        name=result.user.user_metadata.get("name", "User"),
        isGuest=False,
        hasProfile=bool(profile.data),
        accessToken=result.session.access_token,
    )


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Sign out the current user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.removeprefix("Bearer ")
    db = get_supabase_anon()

    try:
        db.auth.sign_out(token)
    except Exception:
        pass  # Sign-out is best-effort

    return {"status": "logged_out"}
