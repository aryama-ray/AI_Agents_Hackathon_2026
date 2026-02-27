import asyncio
import logging
from fastapi import APIRouter, HTTPException, Depends
from app.models import PlanRequest, PlanResponse, InterventionRequest, InterventionResponse
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_RETRIES = 3


async def _run_with_retry(fn, *args):
    """Run agent function with exponential backoff retry."""
    for attempt in range(MAX_RETRIES):
        try:
            return await asyncio.to_thread(fn, *args)
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                raise
            wait = 2 ** attempt  # 1s, 2s, 4s
            logger.warning(f"Agent call failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
            await asyncio.sleep(wait)


@router.post("/generate", response_model=PlanResponse)
async def generate_plan(
    request: PlanRequest,
    user_id: str = Depends(get_current_user),
):
    """Generate a daily plan using the CrewAI orchestrator (hierarchical) with direct fallback."""
    from app.agents.orchestrator import run_orchestrated_planning
    from app.agents.planning_agent import run_planning

    # Try orchestrated flow first, fall back to direct planning agent
    try:
        result = await _run_with_retry(
            run_orchestrated_planning, user_id, request.brainState, request.tasks
        )
    except Exception:
        logger.warning("Orchestrated planning failed, falling back to direct agent")
        result = await _run_with_retry(
            run_planning, user_id, request.brainState, request.tasks
        )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result.get("raw", "Planning failed"))
    return PlanResponse(
        planId=result.get("planId", ""),
        tasks=result.get("tasks", []),
        overallRationale=result.get("overallRationale", ""),
    )


@router.post("/intervene", response_model=InterventionResponse)
async def intervene(
    request: InterventionRequest,
    user_id: str = Depends(get_current_user),
):
    """Handle an 'I'm stuck' intervention using the CrewAI intervention agent."""
    from app.agents.intervention_agent import run_intervention

    try:
        result = await _run_with_retry(
            run_intervention,
            user_id,
            request.planId,
            request.stuckTaskIndex,
            request.userMessage,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intervention failed after retries: {str(e)}")

    if "error" in result:
        raise HTTPException(status_code=500, detail=result.get("raw", "Intervention failed"))
    return InterventionResponse(
        interventionId=result.get("interventionId", ""),
        acknowledgment=result.get("acknowledgment", ""),
        restructuredTasks=result.get("restructuredTasks", []),
        agentReasoning=result.get("agentReasoning", ""),
        followupHint=result.get("followupHint"),
    )
