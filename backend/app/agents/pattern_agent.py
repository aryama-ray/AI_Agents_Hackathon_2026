import json
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.tools.db_tools import get_user_history, save_hypothesis_card

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

pattern_agent = Agent(
    role="Behavioral Pattern Analyst",
    goal=(
        "Analyze longitudinal user data (checkins, plan completions, interventions) "
        "to detect meaningful behavioral patterns and generate testable hypotheses. "
        "Focus on patterns that are actionable — things that can improve the user's "
        "daily planning and intervention strategy."
    ),
    backstory=(
        "You are a behavioral data scientist specializing in ADHD executive function "
        "patterns. You look for correlations between brain states, task completion, "
        "mood, intervention triggers, and time-of-day effects. Your hypotheses must "
        "be specific, testable, and backed by evidence from the user's actual data.\n\n"
        "HYPOTHESIS QUALITY RULES:\n"
        "- Every hypothesis must cite specific days/data points as evidence\n"
        "- Confidence levels: 'low' (2-3 supporting data points), 'medium' (4-6), 'high' (7+)\n"
        "- Predictions must be falsifiable ('If X happens, then Y will follow')\n"
        "- Focus on patterns the user can ACT on, not just observe\n"
        "- Do NOT generate hypotheses if insufficient data (<7 days)\n"
        "- Maximum 3 hypotheses per analysis run"
    ),
    tools=[get_user_history, save_hypothesis_card],
    llm=_llm,
    allow_delegation=False,
    max_rpm=20,
    max_iter=10,
    verbose=False,
)


def run_pattern_detection(user_id: str) -> dict:
    """Analyze user history and generate hypothesis cards."""
    task = Task(
        description=(
            f"Analyze the behavioral data for user {user_id}.\n\n"
            f"Step 1: Use get_user_history tool with user_id={user_id} to fetch "
            "recent checkins and past interventions.\n"
            "Step 2: Look for these pattern types:\n"
            "  - Energy patterns: Do low-energy days follow high-output days?\n"
            "  - Time-of-day effects: When is the user most productive?\n"
            "  - Task type preferences: Which categories have highest completion?\n"
            "  - Intervention triggers: What conditions precede getting stuck?\n"
            "  - Mood correlations: What predicts good vs bad mood days?\n"
            "  - Brain state accuracy: Does self-reported brain state match outcomes?\n"
            "Step 3: Generate 1-3 hypothesis cards. Each card must have:\n"
            "  - patternDetected: Specific pattern description\n"
            "  - prediction: Testable prediction for future behavior\n"
            "  - confidence: 'low' | 'medium' | 'high' (based on evidence strength)\n"
            "  - supportingEvidence: Array of {day: number, detail: string}\n"
            "  - status: 'testing' (always 'testing' for new hypotheses)\n"
            f"Step 4: Use save_hypothesis_card tool with user_id={user_id} to save "
            "each hypothesis card.\n"
            "Step 5: Return a JSON array of all generated cards.\n\n"
            "IMPORTANT: Only generate hypotheses backed by real data patterns. "
            "Do NOT make up patterns. If insufficient data (<7 days), return an "
            "empty array: []"
        ),
        expected_output=(
            "A JSON array of hypothesis cards, each with patternDetected, prediction, "
            "confidence, supportingEvidence, and status fields. Empty array if insufficient data."
        ),
        agent=pattern_agent,
    )

    crew = Crew(
        agents=[pattern_agent],
        tasks=[task],
        process=Process.sequential,
        memory=True,
        verbose=False,
    )

    result = crew.kickoff()
    raw = str(result.raw) if hasattr(result, "raw") else str(result)

    # Try to parse as JSON array first, then object
    try:
        start_arr = raw.find("[")
        end_arr = raw.rfind("]") + 1
        if start_arr >= 0 and end_arr > start_arr:
            return {"cards": json.loads(raw[start_arr:end_arr])}
    except json.JSONDecodeError:
        pass

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass

    return {"cards": [], "error": "Failed to parse pattern result", "raw": raw}
