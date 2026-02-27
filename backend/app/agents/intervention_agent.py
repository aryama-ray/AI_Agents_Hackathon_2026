import json
import logging
from crewai import Agent, Task, Crew, Process, LLM
from crewai.knowledge.source.text_file_knowledge_source import TextFileKnowledgeSource
from app.agents.tools.db_tools import (
    get_cognitive_profile,
    get_current_plan,
    save_intervention,
    get_user_history,
)
from app.models import InterventionOutput

logger = logging.getLogger(__name__)
_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

# Knowledge base: pass Path objects so CrewAI uses them as-is (strings get prefixed with "knowledge/")
from pathlib import Path as _Path
_knowledge_dir = _Path(__file__).resolve().parent.parent.parent / "knowledge"
_knowledge_sources = []
for _fname in ["intervention_playbook.md", "brain_state_research.md"]:
    _fpath = _knowledge_dir / _fname
    if _fpath.exists():
        _knowledge_sources.append(TextFileKnowledgeSource(file_paths=[_fpath]))


intervention_agent = Agent(
    role="ADHD Crisis Response & Plan Restructuring Specialist",
    goal=(
        "Provide emotional acknowledgment FIRST, then autonomously restructure the "
        "user's plan when they are stuck. The clinical sequence is: acknowledge → "
        "validate → act. Never skip the acknowledgment."
    ),
    backstory=(
        "You follow the clinically validated ADHD support sequence: acknowledge the "
        "feeling, validate it as brain-based (not character-based), then act by "
        "restructuring the plan.\n\n"
        "You have access to a clinical intervention playbook and brain state research. "
        "Follow the playbook's restructure strategies based on stuck type.\n\n"
        "EMOTIONAL ACKNOWLEDGMENT RULES:\n"
        "The FIRST thing you produce is ALWAYS an emotional acknowledgment:\n"
        "- One to two sentences maximum\n"
        "- Must name the specific feeling/experience, not generic 'I understand'\n"
        "- Must normalize the experience as brain-based, not character-based\n"
        "- Must NOT include advice or action — that comes in the restructure\n"
        "Examples:\n"
        "- 'Getting stuck on something that felt important makes sense — that's not "
        "failure, that's your brain protecting you from a mismatch between the task's "
        "demands and your current capacity.'\n"
        "- 'That feeling of starting and stopping over and over? That's task initiation "
        "friction. Your brain isn't broken — it's running a different protocol than the "
        "task expects.'\n\n"
        "RESTRUCTURE RULES:\n"
        "- Move the stuck task or break it into smaller pieces\n"
        "- If user is overwhelmed, REDUCE total remaining tasks\n"
        "- Adjust durations (shorter blocks)\n"
        "- Add a low-effort 'momentum starter' before hard work\n"
        "- Keep completed tasks unchanged"
    ),
    tools=[get_cognitive_profile, get_current_plan, save_intervention, get_user_history],
    knowledge_sources=_knowledge_sources if _knowledge_sources else None,
    llm=_llm,
    allow_delegation=True,
    max_rpm=20,
    max_iter=10,
    verbose=False,
)


def create_intervention_task(
    user_id: str,
    plan_id: str,
    stuck_task_index: int,
    user_message: str | None = None,
) -> Task:
    msg_context = f"User said: \"{user_message}\"" if user_message else "User pressed 'I'm Stuck' without a message."
    return Task(
        description=(
            f"The user {user_id} is stuck and needs help. Plan ID: {plan_id}. "
            f"Stuck on task index: {stuck_task_index}.\n"
            f"{msg_context}\n\n"
            f"Step 1: Use get_cognitive_profile tool with user_id={user_id}.\n"
            f"Step 2: Use get_user_history tool with user_id={user_id} to check past "
            "interventions and their feedback ratings. If the user rated previous interventions "
            "low and gave feedback (e.g. 'too many tasks', 'not helpful'), adapt your "
            "restructuring strategy accordingly.\n"
            f"Step 3: Use get_current_plan tool with user_id={user_id} to get the current plan.\n"
            "Step 4: Generate an emotional acknowledgment (1-2 sentences). This MUST come "
            "first. It must name the feeling, normalize it as brain-based, and NOT include "
            "any advice.\n"
            "Step 5: Restructure the remaining tasks. Rules:\n"
            "  - Move or break the stuck task into smaller pieces\n"
            "  - Reduce total tasks if user seems overwhelmed\n"
            "  - Add a momentum starter (easy 5-min task) before hard work\n"
            "  - Keep already-completed tasks unchanged\n"
            "  - Reference the user's cognitive profile in your reasoning\n"
            "  - If past intervention feedback was negative, adjust approach accordingly\n"
            "Step 6: Use save_intervention tool to save the record.\n\n"
            "Return your final answer as JSON:\n"
            "{\n"
            '  "interventionId": "...",\n'
            '  "acknowledgment": "...",\n'
            '  "restructuredTasks": [same task format as planning],\n'
            '  "agentReasoning": "...",\n'
            '  "followupHint": "optional observation about user pattern"\n'
            "}"
        ),
        expected_output=(
            "A JSON object containing interventionId, acknowledgment (emotional, 1-2 sentences), "
            "restructuredTasks (full replacement array), agentReasoning, and optional followupHint."
        ),
        output_pydantic=InterventionOutput,
        agent=intervention_agent,
    )


def run_intervention(
    user_id: str,
    plan_id: str,
    stuck_task_index: int,
    user_message: str | None = None,
) -> dict:
    task = create_intervention_task(user_id, plan_id, stuck_task_index, user_message)
    crew = Crew(
        agents=[intervention_agent],
        tasks=[task],
        process=Process.sequential,
        memory=True,
        verbose=False,
    )
    result = crew.kickoff()

    # Try structured output first (Pydantic model)
    if hasattr(result, "pydantic") and result.pydantic is not None:
        return result.pydantic.model_dump()

    # Fallback to raw JSON parsing
    logger.warning("Structured output unavailable, falling back to raw JSON parsing")
    raw = str(result.raw) if hasattr(result, "raw") else str(result)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass
    return {"error": "Failed to parse intervention result", "raw": raw}
