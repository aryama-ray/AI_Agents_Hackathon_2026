import asyncio
from fastapi import APIRouter, HTTPException
from app.models import GuestLoginResponse
from app.database import get_supabase

router = APIRouter()

ALEX_UUID = "00000000-0000-0000-0000-000000000001"

@router.post("/guest", response_model=GuestLoginResponse)
async def guest_login():
    """Create or retrieve the guest Alex account with pre-seeded data."""
    db = get_supabase()
    # Check if Alex exists
    result = db.table("users").select("*").eq("id", ALEX_UUID).execute()
    if result.data:
        # Check if seed data is complete (should have 14 checkins)
        checkins = db.table("checkins").select("id", count="exact").eq("user_id", ALEX_UUID).execute()
        if not checkins.count or checkins.count < 14:
            # Seed data is incomplete or missing — re-seed
            from app.services.seed_service import seed_alex_data
            await asyncio.to_thread(seed_alex_data)
        profile = db.table("cognitive_profiles").select("id").eq("user_id", ALEX_UUID).limit(1).execute()
        return GuestLoginResponse(
            userId=ALEX_UUID,
            name="Alex",
            isGuest=True,
            hasProfile=bool(profile.data),
        )
    # Create Alex
    db.table("users").insert({
        "id": ALEX_UUID,
        "email": "alex@attune-demo.com",
        "name": "Alex",
        "is_guest": True,
        "cognitive_profile_summary": "Deep-Diver with strong hyperfocus and variable task initiation",
    }).execute()
    # Seed data
    from app.services.seed_service import seed_alex_data
    await asyncio.to_thread(seed_alex_data)
    return GuestLoginResponse(
        userId=ALEX_UUID,
        name="Alex",
        isGuest=True,
        hasProfile=True,
    )
