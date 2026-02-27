import json
from crewai.tools import tool
from app.database import get_supabase_admin


@tool
def save_profile_to_db(user_id: str, profile_json: str) -> str:
    """Save a cognitive profile to the database.
    Input: user_id and profile_json containing dimensions, profileTags, summary,
    asrsTotalScore, isPositiveScreen.
    Returns: the saved profile id."""
    db = get_supabase_admin()
    profile = json.loads(profile_json)
    result = db.table("cognitive_profiles").insert({
        "user_id": user_id,
        "dimensions": profile["dimensions"],
        "profile_tags": profile["profileTags"],
        "summary": profile["summary"],
        "asrs_total_score": profile.get("asrsTotalScore", 0),
        "is_positive_screen": profile.get("isPositiveScreen", False),
    }).execute()
    return json.dumps({"profileId": result.data[0]["id"]})


@tool
def get_cognitive_profile(user_id: str) -> str:
    """Fetch the most recent cognitive profile for a user from the database.
    Returns: JSON with dimensions, profileTags, summary, or empty if none exists."""
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
        return json.dumps({"error": "No profile found"})
    row = result.data[0]
    return json.dumps({
        "dimensions": row["dimensions"],
        "profileTags": row["profile_tags"],
        "summary": row["summary"],
        "asrsTotalScore": row["asrs_total_score"],
        "isPositiveScreen": row["is_positive_screen"],
    })


@tool
def save_daily_plan(user_id: str, plan_json: str) -> str:
    """Save a generated daily plan to the database.
    Input: user_id and plan_json containing brainState, tasks, overallRationale.
    Returns: the saved plan id."""
    db = get_supabase_admin()
    plan = json.loads(plan_json)
    result = db.table("daily_plans").insert({
        "user_id": user_id,
        "brain_state": plan["brainState"],
        "tasks": plan["tasks"],
        "overall_rationale": plan.get("overallRationale", ""),
    }).execute()
    return json.dumps({"planId": result.data[0]["id"]})


@tool
def get_current_plan(user_id: str) -> str:
    """Fetch the most recent active daily plan for a user.
    Returns: JSON with plan id, brainState, tasks, overallRationale."""
    db = get_supabase_admin()
    result = (
        db.table("daily_plans")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return json.dumps({"error": "No active plan found"})
    row = result.data[0]
    return json.dumps({
        "planId": row["id"],
        "brainState": row["brain_state"],
        "tasks": row["tasks"],
        "overallRationale": row["overall_rationale"],
    })


@tool
def save_intervention(user_id: str, intervention_json: str) -> str:
    """Save an intervention record to the database.
    Input: user_id and intervention_json with planId, triggerType, stuckTaskIndex,
    userMessage, emotionalAcknowledgment, originalTasks, restructuredTasks, agentReasoning.
    Returns: the saved intervention id."""
    db = get_supabase_admin()
    data = json.loads(intervention_json)
    result = db.table("interventions").insert({
        "user_id": user_id,
        "plan_id": data["planId"],
        "trigger_type": data.get("triggerType", "stuck_button"),
        "stuck_task_index": data.get("stuckTaskIndex"),
        "user_message": data.get("userMessage"),
        "emotional_acknowledgment": data["emotionalAcknowledgment"],
        "original_tasks": data["originalTasks"],
        "restructured_tasks": data["restructuredTasks"],
        "agent_reasoning": data["agentReasoning"],
    }).execute()
    return json.dumps({"interventionId": result.data[0]["id"]})


@tool
def save_hypothesis_card(user_id: str, card_json: str) -> str:
    """Save a hypothesis card (behavioral pattern) to the database.
    Input: user_id and card_json containing patternDetected, prediction,
    confidence (low|medium|high), supportingEvidence (array), status (testing|confirmed|rejected).
    Returns: the saved card id."""
    db = get_supabase_admin()
    card = json.loads(card_json)
    result = db.table("hypothesis_cards").insert({
        "user_id": user_id,
        "pattern_detected": card["patternDetected"],
        "prediction": card["prediction"],
        "confidence": card.get("confidence", "medium"),
        "supporting_evidence": card.get("supportingEvidence", []),
        "status": card.get("status", "testing"),
    }).execute()
    return json.dumps({"cardId": result.data[0]["id"]})


@tool
def get_user_history(user_id: str) -> str:
    """Fetch a user's recent checkin history and past interventions for context.
    Returns: JSON with recent checkins and interventions."""
    db = get_supabase_admin()
    checkins = (
        db.table("checkins")
        .select("*")
        .eq("user_id", user_id)
        .order("checkin_date", desc=True)
        .limit(14)
        .execute()
    )
    interventions = (
        db.table("interventions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    return json.dumps({
        "checkins": checkins.data,
        "interventions": interventions.data,
    }, default=str)
