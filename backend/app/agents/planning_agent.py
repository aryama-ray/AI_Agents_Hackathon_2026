import json
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.tools.db_tools import get_cognitive_profile, save_daily_plan

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")


BRAIN_STATE_STRATEGIES = {
    "foggy": (
        "FOGGY DAY STRATEGY: Maximum 4 tasks. Start with the easiest task (lowest "
        "cognitive load). 15-minute buffers between tasks. No deep work blocks longer "
        "than 20 minutes. Include one physical movement task. Overall tone: gentle, "
        "no pressure. This person's brain is running low today — protect them from "
        "overcommitment."
    ),
    "focused": (
        "FOCUSED DAY STRATEGY: 5-6 tasks. Optimal cognitive scheduling — hardest task "
        "in the person's peak attention window. Medium-difficulty task first as warmup. "
        "One deep work block of 45-60 minutes. Include variety to prevent monotony. "
        "This is a good brain day — make the most of it without burning out."
    ),
    "wired": (
        "WIRED DAY STRATEGY: 6-7 tasks. Front-load the hardest tasks immediately "
        "(channel the energy). Short 15-minute blocks to match rapid attention shifts. "
        "Build in 2 physical movement breaks. End with a cooldown creative task. "
        "This person has excess energy — aim it before it scatters."
    ),
}


planning_agent = Agent(
    role="Executive Function Planning Strategist",
    goal=(
        "Create brain-state-adaptive daily plans where every task placement is justified "
        "by the user's cognitive profile. Never generate a task without explaining WHY it "
        "is placed where it is, referencing the user's specific cognitive dimensions."
    ),
    backstory=(
        "You are a specialist in ADHD-aware task management. You understand that Foggy, "
        "Focused, and Wired days require fundamentally different strategies. You build plans "
        "that work WITH the brain's current state, not against it.\n\n"
        "CRITICAL RATIONALE RULES:\n"
        "Every task MUST have a rationale that:\n"
        "1. References a specific dimension from the person's cognitive profile\n"
        "2. Explains the scheduling decision (why this time, this order, this duration)\n"
        "3. Uses language like 'your profile shows...', 'based on your pattern of...'\n\n"
        "Example rationales:\n"
        "- 'Scheduled first — your Attention Regulation score suggests peak focus in the "
        "first 90 minutes. This task needs sustained attention, so it gets your best window.'\n"
        "- 'Shortened to 15 minutes — on Foggy days, your Working Memory needs smaller "
        "chunks. You can always extend if momentum builds.'"
    ),
    tools=[get_cognitive_profile, save_daily_plan],
    llm=_llm,
    verbose=True,
)


def create_planning_task(user_id: str, brain_state: str, user_tasks: list[str] | None = None) -> Task:
    strategy = BRAIN_STATE_STRATEGIES.get(brain_state, BRAIN_STATE_STRATEGIES["focused"])
    task_context = ""
    if user_tasks:
        task_context = f"\nUser's tasks to schedule: {json.dumps(user_tasks)}\n"

    return Task(
        description=(
            f"Generate a personalized daily plan for user {user_id}.\n\n"
            f"Brain state: {brain_state}\n"
            f"Strategy: {strategy}\n"
            f"{task_context}\n"
            f"Step 1: Use get_cognitive_profile tool with user_id={user_id} to fetch "
            "the user's cognitive profile.\n"
            "Step 2: Generate tasks following the brain state strategy, ensuring each task "
            "has a rationale referencing the user's specific cognitive dimensions.\n"
            f"Step 3: Use save_daily_plan tool to save the plan with user_id={user_id}.\n\n"
            "Each task must include: index, title, description, duration_minutes, time_slot "
            "(e.g. '9:00 AM'), category (deep_work|admin|creative|physical|social), "
            "rationale (referencing cognitive profile), priority (high|medium|low), "
            "status ('pending').\n\n"
            "Return your final answer as a JSON object:\n"
            "{\n"
            '  "planId": "...",\n'
            '  "tasks": [{"index": 0, "title": "...", "description": "...", '
            '"duration_minutes": 25, "time_slot": "9:00 AM", "category": "deep_work", '
            '"rationale": "...", "priority": "high", "status": "pending"}],\n'
            '  "overallRationale": "..."\n'
            "}"
        ),
        expected_output=(
            "A JSON object containing planId, tasks (array of task objects with rationale), "
            "and overallRationale explaining the overall strategy."
        ),
        agent=planning_agent,
    )


def run_planning(user_id: str, brain_state: str, user_tasks: list[str] | None = None) -> dict:
    task = create_planning_task(user_id, brain_state, user_tasks)
    crew = Crew(
        agents=[planning_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )
    result = crew.kickoff()
    raw = str(result.raw) if hasattr(result, "raw") else str(result)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass
    return {"error": "Failed to parse planning result", "raw": raw}
