import json
import logging
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.planning_agent import planning_agent, create_planning_task
from app.agents.tools.db_tools import get_cognitive_profile, get_user_history
from app.models import PlanOutput

logger = logging.getLogger(__name__)

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

manager_agent = Agent(
    role="Attune Executive Function Manager",
    goal=(
        "Coordinate screening, planning, and intervention agents to provide "
        "comprehensive executive function support. Analyze user state — profile "
        "completeness, recent history, current brain state, intervention patterns — "
        "and delegate to the right specialist with the right context."
    ),
    backstory=(
        "You are an expert coordinator who understands ADHD executive function challenges "
        "holistically. You don't do the specialized work yourself — you ensure each "
        "specialist agent receives optimal context and instructions. You understand when "
        "a user needs re-screening (profile is stale), when a plan needs intervention "
        "history context, and when to proactively suggest changes."
    ),
    tools=[get_cognitive_profile, get_user_history],
    llm=_llm,
    allow_delegation=True,
    max_rpm=20,
    max_iter=10,
    verbose=False,
)


def run_orchestrated_planning(
    user_id: str, brain_state: str, user_tasks: list[str] | None = None
) -> dict:
    """
    Enhanced planning flow: manager analyzes context then delegates to planning agent.
    Falls back to direct planning if orchestration fails.
    """
    manager_task = Task(
        description=(
            f"Coordinate plan generation for user {user_id} with brain state: {brain_state}.\n\n"
            "1. Fetch the user's cognitive profile using get_cognitive_profile tool.\n"
            "2. Fetch the user's recent history using get_user_history tool.\n"
            "3. Analyze context:\n"
            "   - How many days of data does the user have?\n"
            "   - Were there recent interventions? What stuck patterns emerged?\n"
            "   - What completion rate trends exist?\n"
            "   - What brain states have worked best historically?\n"
            "4. Provide a context summary to the Planning Strategist agent.\n"
            "5. Delegate plan generation with enhanced context.\n"
            "6. Review the generated plan for quality:\n"
            "   - Does every task have a profile-referenced rationale?\n"
            "   - Are durations appropriate for the brain state?\n"
            "   - Does it account for recent intervention patterns?\n"
            "7. Return the final plan as JSON with planId, tasks, and overallRationale."
        ),
        expected_output="Complete daily plan JSON with planId, tasks array, and overallRationale",
        agent=manager_agent,
    )

    planning_task = create_planning_task(user_id, brain_state, user_tasks)

    crew = Crew(
        agents=[manager_agent, planning_agent],
        tasks=[manager_task, planning_task],
        process=Process.hierarchical,
        manager_agent=manager_agent,
        memory=True,
        verbose=False,
    )

    result = crew.kickoff()

    # Try structured output first (Pydantic model)
    if hasattr(result, "pydantic") and result.pydantic is not None:
        return result.pydantic.model_dump()

    # Fallback to raw JSON parsing
    logger.warning("Structured output unavailable for orchestrator, falling back to raw JSON parsing")
    raw = str(result.raw) if hasattr(result, "raw") else str(result)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass

    return {"error": "Failed to parse orchestrated planning result", "raw": raw}
