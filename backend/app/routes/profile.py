from fastapi import APIRouter, HTTPException, Depends
from app.models import ProfileResponse
from app.database import get_supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter()


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_profile(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Fetch the cognitive profile for a user."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only access own profile")

    db = get_supabase_admin()
    result = (
        db.table("cognitive_profiles")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No profile found for this user")
    row = result.data[0]
    return ProfileResponse(
        dimensions=row["dimensions"],
        profileTags=row["profile_tags"],
        summary=row["summary"] or "",
    )
