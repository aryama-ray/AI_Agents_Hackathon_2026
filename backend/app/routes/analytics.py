from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter()


class AnalyticsEvent(BaseModel):
    eventType: str
    eventData: dict = {}
    durationMs: Optional[int] = None


@router.post("/event")
async def track_event(
    event: AnalyticsEvent,
    user_id: str = Depends(get_current_user),
):
    """Track a user analytics event."""
    db = get_supabase_admin()
    db.table("analytics_events").insert({
        "user_id": user_id,
        "event_type": event.eventType,
        "event_data": event.eventData,
        "duration_ms": event.durationMs,
    }).execute()
    return {"status": "tracked"}


@router.get("/summary/{user_id}")
async def get_analytics_summary(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Return aggregated analytics for a user."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only access own analytics")

    db = get_supabase_admin()
    events = db.table("analytics_events").select("*").eq("user_id", user_id).execute().data

    def _avg(values: list) -> float:
        filtered = [v for v in values if v is not None]
        return round(sum(filtered) / len(filtered)) if filtered else 0

    return {
        "totalScreenings": len([e for e in events if e["event_type"] == "screening_completed"]),
        "totalPlans": len([e for e in events if e["event_type"] == "plan_generated"]),
        "totalInterventions": len([e for e in events if e["event_type"] == "intervention_triggered"]),
        "avgPlanGenerationMs": _avg([
            e["duration_ms"] for e in events
            if e["event_type"] == "plan_generated" and e.get("duration_ms")
        ]),
        "events": events[-50:],
    }
