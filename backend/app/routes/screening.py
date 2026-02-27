import asyncio
import logging
from fastapi import APIRouter, HTTPException, Depends
from app.models import ScreeningRequest, ScreeningResponse
from app.database import get_supabase_admin
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
            wait = 2 ** attempt
            logger.warning(f"Agent call failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
            await asyncio.sleep(wait)


@router.post("/evaluate", response_model=ScreeningResponse)
async def evaluate_screening(
    request: ScreeningRequest,
    user_id: str = Depends(get_current_user),
):
    """Run ASRS screening through the CrewAI screening agent."""
    db = get_supabase_admin()

    # Save ASRS answers to DB (use admin client to bypass RLS)
    for answer in request.answers:
        db.table("asrs_responses").insert({
            "user_id": user_id,
            "question_index": answer.questionIndex,
            "question_text": answer.questionText,
            "answer_label": ["Never", "Rarely", "Sometimes", "Often", "Very Often"][answer.score],
            "score": answer.score,
        }).execute()

    # Run the screening crew with retry
    from app.agents.screening_agent import run_screening
    answers_data = [{"questionIndex": a.questionIndex, "questionText": a.questionText, "score": a.score} for a in request.answers]

    try:
        result = await _run_with_retry(run_screening, user_id, answers_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screening failed after retries: {str(e)}")

    if "error" in result:
        raise HTTPException(status_code=500, detail=result.get("raw", "Screening failed"))

    total = sum(a.score for a in request.answers)
    return ScreeningResponse(
        profileId=result.get("profileId", ""),
        dimensions=result.get("dimensions", []),
        profileTags=result.get("profileTags", []),
        summary=result.get("summary", ""),
        asrsTotalScore=result.get("asrsTotalScore", total),
        isPositiveScreen=result.get("isPositiveScreen", total >= 14),
    )
