from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter()


class FeedbackRequest(BaseModel):
    interventionId: str
    rating: int  # 1-5
    feedback: Optional[str] = None


@router.post("/intervention")
async def submit_intervention_feedback(
    request: FeedbackRequest,
    user_id: str = Depends(get_current_user),
):
    """Submit feedback for an intervention (1-5 rating + optional text)."""
    db = get_supabase_admin()

    # Verify the intervention belongs to the authenticated user
    intervention = (
        db.table("interventions")
        .select("id")
        .eq("id", request.interventionId)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not intervention.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Intervention not found")

    db.table("interventions").update({
        "user_rating": request.rating,
        "user_feedback": request.feedback,
        "feedback_at": "now()",
    }).eq("id", request.interventionId).eq("user_id", user_id).execute()

    return {"status": "saved"}
