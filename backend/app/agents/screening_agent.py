import json
from crewai import Agent, Task, Crew, Process, LLM
from app.agents.tools.scoring_tools import score_asrs
from app.agents.tools.db_tools import save_profile_to_db

_llm = LLM(model="anthropic/claude-sonnet-4-20250514")

screening_agent = Agent(
    role="ADHD Cognitive Portrait Specialist",
    goal=(
        "Analyze ASRS-6 screening responses to generate a personalized cognitive profile "
        "with empowering, recognition-based language. Create cognitive portraits — not diagnoses. "
        "See strengths where others see deficits."
    ),
    backstory=(
        "You are an expert in attention-related neurodivergence with deep knowledge of the "
        "Harvard Adult ADHD Self-Report Scale (ASRS) methodology. You understand that ADHD is "
        "not a deficit — it is a different operating system. Your job is to create a cognitive "
        "portrait that makes the person feel SEEN, not labeled.\n\n"
        "CRITICAL LANGUAGE RULES:\n"
        "- NEVER use clinical labels like 'Inattentive Presentation' or 'Hyperactive Type'\n"
        "- NEVER use deficit language\n"
        "- Profile tags MUST be empowering: 'Deep-Diver' not 'Hyperfocuser', "
        "'Momentum-Builder' not 'Hyperactive', 'Pattern-Thinker' not 'Inattentive', "
        "'Intensity-Engine' not 'Emotionally Dysregulated', 'Time-Bender' not 'Poor Time Management'\n"
        "- The summary should feel like recognition of how their brain works"
    ),
    tools=[score_asrs, save_profile_to_db],
    llm=_llm,
    verbose=True,
)


def create_screening_task(user_id: str, answers: list[dict]) -> Task:
    answers_str = json.dumps(answers)
    return Task(
        description=(
            f"Analyze the following ASRS-6 screening answers for user {user_id}:\n"
            f"{answers_str}\n\n"
            "Step 1: Use the score_asrs tool to calculate scores.\n"
            "Step 2: Generate a cognitive profile with 6 radar dimensions:\n"
            "  - attention_regulation (label: 'Attention Regulation')\n"
            "  - time_perception (label: 'Time Perception')\n"
            "  - emotional_intensity (label: 'Emotional Intensity')\n"
            "  - working_memory (label: 'Working Memory')\n"
            "  - task_initiation (label: 'Task Initiation')\n"
            "  - hyperfocus_capacity (label: 'Hyperfocus Capacity')\n\n"
            "Each dimension needs a value (0-100) and a one-sentence insight that is "
            "empowering and specific to the person's pattern. Higher value means MORE of "
            "that trait (not worse, just more).\n\n"
            "Step 3: Generate exactly 3 profile tags that are empowering. Examples: "
            "'Deep-Diver', 'Momentum-Builder', 'Pattern-Thinker', 'Rapid-Connector', "
            "'Intensity-Engine', 'Time-Bender'.\n\n"
            "Step 4: Write a 2-3 sentence empowering narrative summary.\n\n"
            f"Step 5: Use save_profile_to_db to save with user_id={user_id}.\n\n"
            "Return your final answer as a JSON object with this exact structure:\n"
            "{\n"
            '  "dimensions": [{"key": "...", "label": "...", "value": 0-100, "insight": "..."}],\n'
            '  "profileTags": ["Tag1", "Tag2", "Tag3"],\n'
            '  "summary": "...",\n'
            '  "asrsTotalScore": number,\n'
            '  "isPositiveScreen": boolean,\n'
            '  "profileId": "..."\n'
            "}"
        ),
        expected_output=(
            "A JSON object containing dimensions (6 radar dimensions with empowering insights), "
            "profileTags (3 empowering tags), summary (2-3 sentence narrative), "
            "asrsTotalScore, isPositiveScreen, and profileId."
        ),
        agent=screening_agent,
    )


def run_screening(user_id: str, answers: list[dict]) -> dict:
    task = create_screening_task(user_id, answers)
    crew = Crew(
        agents=[screening_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )
    result = crew.kickoff()
    # Parse the raw output into a dict
    raw = str(result.raw) if hasattr(result, "raw") else str(result)
    # Try to extract JSON from the result
    try:
        # Find JSON in the output
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass
    return {"error": "Failed to parse screening result", "raw": raw}
