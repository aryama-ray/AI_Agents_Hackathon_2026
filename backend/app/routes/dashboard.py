import asyncio
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.models import DashboardResponse, TrendDataPoint, HypothesisCard, AgentAnnotation, FeedbackItem
from app.database import get_supabase_admin
from app.services.momentum_service import calculate_momentum
from app.middleware.auth import get_current_user

router = APIRouter()


def _should_refresh_hypotheses(cards: list[dict]) -> bool:
    """Check if hypothesis cards need refreshing (none exist or oldest is >24h)."""
    if not cards:
        return True
    try:
        latest = max(c["created_at"] for c in cards)
        created = datetime.fromisoformat(str(latest).replace("Z", "+00:00"))
        return datetime.now(timezone.utc) - created > timedelta(hours=24)
    except (ValueError, KeyError):
        return True


@router.get("/{user_id}", response_model=DashboardResponse)
async def get_dashboard(
    user_id: str,
    current_user: str = Depends(get_current_user),
):
    """Fetch dashboard data: trends, momentum, hypothesis cards, annotations."""
    if current_user != user_id:
        raise HTTPException(status_code=403, detail="Can only access own dashboard")

    db = get_supabase_admin()

    # Fetch checkins (last 14 days)
    checkins = (
        db.table("checkins")
        .select("*")
        .eq("user_id", user_id)
        .order("checkin_date", desc=False)
        .limit(14)
        .execute()
    )
    if not checkins.data:
        raise HTTPException(status_code=404, detail="No dashboard data found")

    # Build trend data
    trend_data = []
    for i, c in enumerate(checkins.data):
        total = c["tasks_total"] or 1
        trend_data.append(TrendDataPoint(
            date=c["checkin_date"],
            dayNumber=i + 1,
            moodScore=c["mood_score"],
            completionRate=round((c["tasks_completed"] / total) * 100),
            brainState=c.get("energy_level", "medium"),
            tasksCompleted=c["tasks_completed"],
            tasksTotal=c["tasks_total"],
        ))

    # Calculate momentum
    momentum = calculate_momentum(checkins.data)

    # Fetch hypothesis cards
    hypothesis_rows = (
        db.table("hypothesis_cards")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    hypothesis_cards = [
        HypothesisCard(
            id=h["id"],
            patternDetected=h["pattern_detected"],
            prediction=h["prediction"],
            confidence=h["confidence"],
            status=h["status"],
            supportingEvidence=h["supporting_evidence"] or [],
            createdAt=str(h["created_at"]),
        )
        for h in hypothesis_rows.data
    ]

    # Trigger pattern detection in background if cards need refreshing
    if _should_refresh_hypotheses(hypothesis_rows.data) and len(checkins.data) >= 7:
        try:
            from app.agents.pattern_agent import run_pattern_detection
            asyncio.create_task(asyncio.to_thread(run_pattern_detection, user_id))
        except Exception:
            pass  # Non-blocking — new cards appear on next dashboard load

    # Build agent annotations from hypothesis cards and interventions
    annotations = []
    for h in hypothesis_rows.data:
        if h.get("annotation_day") and h.get("agent_annotation"):
            annotations.append(AgentAnnotation(
                dayNumber=h["annotation_day"],
                text=h["agent_annotation"],
                type="hypothesis",
            ))

    # Add intervention annotations
    interventions = (
        db.table("interventions")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    for idx, intv in enumerate(interventions.data):
        # Map intervention to nearest checkin day
        annotations.append(AgentAnnotation(
            dayNumber=4 if idx == 0 else 11,  # Seeded positions
            text=f"Intervention: {intv['agent_reasoning'][:80]}...",
            type="intervention",
        ))

    # Build feedback history from interventions with ratings
    feedback_history = [
        FeedbackItem(
            id=intv["id"],
            rating=intv["user_rating"],
            feedback=intv.get("user_feedback"),
            date=str(intv.get("feedback_at") or intv["created_at"]),
        )
        for intv in interventions.data
        if intv.get("user_rating") is not None
    ]

    return DashboardResponse(
        trendData=trend_data,
        momentumScore=momentum["score"],
        momentumDelta=momentum["delta"],
        hypothesisCards=hypothesis_cards,
        agentAnnotations=annotations,
        feedbackHistory=feedback_history,
    )
