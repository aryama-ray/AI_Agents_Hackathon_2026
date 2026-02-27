from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter()


@router.delete("/{user_id}")
async def delete_user_data(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Delete all user data (cascading). GDPR Article 17: Right to Erasure."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only delete own data")

    db = get_supabase_admin()

    # Delete in dependency order (children first)
    tables_with_user_id = [
        "analytics_events",
        "interventions",
        "hypothesis_cards",
        "checkins",
        "daily_plans",
        "cognitive_profiles",
        "asrs_responses",
    ]

    for table in tables_with_user_id:
        db.table(table).delete().eq("user_id", user_id).execute()

    # Delete the user row itself
    db.table("users").delete().eq("id", user_id).execute()

    # Also delete from Supabase Auth
    try:
        db.auth.admin.delete_user(user_id)
    except Exception:
        pass  # Best-effort — user may not exist in auth if local-only guest

    return {"status": "deleted", "userId": user_id}


@router.get("/{user_id}/export")
async def export_user_data(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Export all user data as JSON. GDPR Article 20: Data Portability."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only export own data")

    db = get_supabase_admin()

    export = {
        "exportDate": datetime.now(timezone.utc).isoformat(),
        "userId": user_id,
        "user": db.table("users").select("*").eq("id", user_id).execute().data,
        "screeningAnswers": db.table("asrs_responses").select("*").eq("user_id", user_id).execute().data,
        "cognitiveProfiles": db.table("cognitive_profiles").select("*").eq("user_id", user_id).execute().data,
        "dailyPlans": db.table("daily_plans").select("*").eq("user_id", user_id).execute().data,
        "checkins": db.table("checkins").select("*").eq("user_id", user_id).execute().data,
        "interventions": db.table("interventions").select("*").eq("user_id", user_id).execute().data,
        "hypothesisCards": db.table("hypothesis_cards").select("*").eq("user_id", user_id).execute().data,
        "analyticsEvents": db.table("analytics_events").select("*").eq("user_id", user_id).execute().data,
    }

    return export
