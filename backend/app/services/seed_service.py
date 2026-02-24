from datetime import datetime, timedelta
from app.database import get_supabase

ALEX_UUID = "00000000-0000-0000-0000-000000000001"


def seed_alex_data():
    """Seed 14 days of demo data for the guest user Alex.

    This function is idempotent: it deletes all existing Alex data
    before re-inserting, so it can be called multiple times safely.
    """
    db = get_supabase()
    today = datetime.utcnow().date()

    # ── Clean up existing Alex data (order matters for FK constraints) ──
    db.table("interventions").delete().eq("user_id", ALEX_UUID).execute()
    db.table("hypothesis_cards").delete().eq("user_id", ALEX_UUID).execute()
    db.table("daily_plans").delete().eq("user_id", ALEX_UUID).execute()
    db.table("checkins").delete().eq("user_id", ALEX_UUID).execute()
    db.table("asrs_responses").delete().eq("user_id", ALEX_UUID).execute()
    db.table("cognitive_profiles").delete().eq("user_id", ALEX_UUID).execute()

    # ── 1. Cognitive Profile ──
    dimensions = [
        {"key": "attention", "label": "Attention Regulation", "value": 42,
         "insight": "You often lose focus during low-stimulation tasks but can lock in when interest is high."},
        {"key": "time", "label": "Time Awareness", "value": 35,
         "insight": "Time blindness is a significant factor; you frequently underestimate how long tasks take."},
        {"key": "emotional", "label": "Emotional Regulation", "value": 78,
         "insight": "Strong emotional awareness; frustration can spike but you recover relatively quickly."},
        {"key": "memory", "label": "Working Memory", "value": 51,
         "insight": "Average working memory capacity; external systems like lists and reminders help a lot."},
        {"key": "initiation", "label": "Task Initiation", "value": 30,
         "insight": "Starting tasks is your biggest challenge, especially when the first step is ambiguous."},
        {"key": "hyperfocus", "label": "Hyperfocus Capacity", "value": 88,
         "insight": "Exceptional ability to enter deep flow states, particularly on novel or creative work."},
    ]
    profile_tags = ["Deep-Diver", "Momentum-Builder", "Intensity-Engine"]
    profile_summary = (
        "Alex is a Deep-Diver with exceptional hyperfocus capacity (88) and strong emotional "
        "regulation (78), but faces significant challenges with task initiation (30) and time "
        "awareness (35). Structured momentum-building strategies and clear first-step definitions "
        "are key to unlocking Alex's productivity potential."
    )

    db.table("cognitive_profiles").insert({
        "user_id": ALEX_UUID,
        "dimensions": dimensions,
        "profile_tags": profile_tags,
        "summary": profile_summary,
    }).execute()

    # ── 2. ASRS Screening Responses ──
    asrs_questions = [
        "How often do you have difficulty concentrating on what people say to you, even when they are speaking to you directly?",
        "How often do you leave your seat in meetings or other situations in which you are expected to remain seated?",
        "How often do you have difficulty unwinding and relaxing when you have time to yourself?",
        "When you're in a conversation, how often do you find yourself finishing the sentences of the people you are talking to before they can finish them themselves?",
        "How often do you put things off until the last minute?",
        "How often do you depend on others to keep your life in order and attend to details?",
    ]
    asrs_scores = [3, 3, 2, 4, 2, 4]

    for i, (question, score) in enumerate(zip(asrs_questions, asrs_scores)):
        labels = ["Never", "Rarely", "Sometimes", "Often", "Very Often"]
        db.table("asrs_responses").insert({
            "user_id": ALEX_UUID,
            "question_index": i,
            "question_text": question,
            "answer_label": labels[score],
            "score": score,
        }).execute()

    # ── 3. Daily Check-ins (14 days) ──
    mood_scores = [5, 6, 5, 3, 5, 6, 6, 7, 6, 7, 6, 8, 7, 8]
    energy_levels = [
        "medium", "high", "medium", "low", "medium", "medium",
        "high", "high", "medium", "high", "low", "high", "medium", "high",
    ]
    # Map energy levels to valid brain_state values for daily_plans table
    # Schema CHECK constraint: brain_state IN ('foggy', 'focused', 'wired')
    energy_to_brain_state = {"low": "foggy", "medium": "focused", "high": "wired"}
    tasks_completed = [3, 4, 3, 2, 3, 4, 4, 5, 4, 5, 4, 5, 5, 5]
    tasks_total = [6, 6, 5, 6, 5, 6, 5, 6, 6, 6, 5, 6, 6, 6]

    # Daily task titles for a knowledge worker (realistic titles per day)
    daily_task_titles = [
        # Day 1
        ["Review quarterly OKRs", "Draft project brief for client X", "Respond to Slack threads",
         "Update Jira backlog", "Read research paper on LLMs", "Prep slides for Monday standup"],
        # Day 2
        ["Standup presentation", "Code review for PR #142", "Write unit tests for auth module",
         "1:1 with team lead", "Refactor database queries", "Update API documentation"],
        # Day 3
        ["Sprint planning meeting", "Design system architecture diagram", "Fix CSS layout bug",
         "Write integration tests", "Review pull request feedback"],
        # Day 4 (low energy day)
        ["Morning journaling", "Reply to emails", "Light code review",
         "Organize project files", "Update task tracker", "Read industry newsletter"],
        # Day 5
        ["Implement user onboarding flow", "Write API endpoint tests", "Team retrospective",
         "Document deployment process", "Review analytics dashboard"],
        # Day 6
        ["Build notification service", "Write database migration", "Design review meeting",
         "Update CI/CD pipeline config", "Pair programming session", "End-of-week summary"],
        # Day 7
        ["Prototype new feature UI", "Optimize image loading pipeline", "Write technical RFC",
         "Review security audit findings", "Update dependency versions"],
        # Day 8
        ["Implement search functionality", "Write E2E tests for checkout", "Architecture review",
         "Mentor junior developer", "Deploy staging build", "Update project roadmap"],
        # Day 9
        ["Debug production error", "Refactor payment module", "Write post-mortem report",
         "Update error handling middleware", "Review feature flag configs", "Team sync call"],
        # Day 10
        ["Launch feature behind flag", "Monitor error rates", "Write release notes",
         "Customer feedback review", "Plan next sprint priorities", "Update status page"],
        # Day 11 (low energy day)
        ["Light documentation work", "Respond to code review comments", "Organize bookmarks",
         "Review meeting notes", "Update personal dev log"],
        # Day 12
        ["Implement caching layer", "Benchmark API performance", "Write load test scripts",
         "Present findings to team", "Optimize database indexes", "Update monitoring alerts"],
        # Day 13
        ["Build data export feature", "Write migration rollback plan", "Cross-team sync",
         "Review accessibility audit", "Update component library", "Prep demo for stakeholders"],
        # Day 14
        ["Demo to stakeholders", "Collect feedback and prioritize", "Write sprint summary",
         "Plan next iteration scope", "Update project documentation", "Celebrate team wins"],
    ]

    checkin_ids = []
    plan_ids = []

    for day_index in range(14):
        checkin_date = (today - timedelta(days=13 - day_index)).isoformat()

        # Insert checkin
        checkin_result = db.table("checkins").insert({
            "user_id": ALEX_UUID,
            "checkin_date": checkin_date,
            "mood_score": mood_scores[day_index],
            "energy_level": energy_levels[day_index],
            "tasks_completed": tasks_completed[day_index],
            "tasks_total": tasks_total[day_index],
            "notes": f"Day {day_index + 1} check-in",
        }).execute()
        checkin_ids.append(checkin_result.data[0]["id"] if checkin_result.data else None)

        # Build task list for daily plan
        day_tasks = daily_task_titles[day_index]
        num_completed = tasks_completed[day_index]
        plan_tasks = []
        for t_idx, title in enumerate(day_tasks):
            status = "completed" if t_idx < num_completed else "skipped"
            categories = ["deep-work", "communication", "planning", "admin", "learning", "review"]
            plan_tasks.append({
                "index": t_idx,
                "title": title,
                "description": f"Auto-seeded task for demo day {day_index + 1}",
                "duration_minutes": 30 if "review" in title.lower() or "email" in title.lower() else 45,
                "time_slot": ["09:00", "10:00", "11:00", "13:00", "14:30", "16:00"][t_idx % 6],
                "category": categories[t_idx % len(categories)],
                "rationale": "Seeded for demo purposes",
                "priority": "high" if t_idx < 2 else "medium",
                "status": status,
            })

        brain_state = energy_to_brain_state[energy_levels[day_index]]
        plan_result = db.table("daily_plans").insert({
            "user_id": ALEX_UUID,
            "plan_date": checkin_date,
            "brain_state": brain_state,
            "tasks": plan_tasks,
            "overall_rationale": f"Day {day_index + 1} plan optimized for {brain_state} state ({energy_levels[day_index]} energy).",
        }).execute()
        plan_ids.append(plan_result.data[0]["id"] if plan_result.data else None)

    # ── 4. Interventions (Day 4 and Day 11) ──
    # Day 4 intervention (low energy day, stuck on task index 2)
    day4_original_tasks = daily_task_titles[3]
    day4_restructured = [
        {"index": 0, "title": "5-min brain dump", "description": "Write down everything on your mind without filtering",
         "duration_minutes": 5, "time_slot": "10:00", "category": "admin",
         "rationale": "Externalize cognitive load to reduce overwhelm", "priority": "high", "status": "completed"},
        {"index": 1, "title": "Reply to one easy email", "description": "Pick the shortest email and reply",
         "duration_minutes": 5, "time_slot": "10:10", "category": "communication",
         "rationale": "Quick win to build momentum", "priority": "high", "status": "completed"},
        {"index": 2, "title": "Organize project files (15 min only)", "description": "Set a timer, stop when it rings",
         "duration_minutes": 15, "time_slot": "10:20", "category": "admin",
         "rationale": "Timeboxed to prevent perfectionism spiral", "priority": "medium", "status": "pending"},
    ]
    db.table("interventions").insert({
        "user_id": ALEX_UUID,
        "plan_id": plan_ids[3],
        "trigger_type": "stuck_button",
        "stuck_task_index": 2,
        "user_message": "I can't focus on anything today, everything feels overwhelming.",
        "emotional_acknowledgment": (
            "That makes total sense, Alex. Low-energy days are not failures -- they are data. "
            "Your brain is telling you it needs a different approach right now."
        ),
        "original_tasks": [{"index": i, "title": t} for i, t in enumerate(day4_original_tasks)],
        "restructured_tasks": day4_restructured,
        "agent_reasoning": (
            "Detected low energy + overwhelm pattern. Broke tasks into micro-steps (5-15 min) to lower "
            "activation threshold. Prioritized externalization (brain dump) to reduce cognitive load, then "
            "a quick win for momentum. This matches Alex's Momentum-Builder profile tag."
        ),
        "followup_message": "How are you feeling after the brain dump? Want to tackle one more small thing?",
    }).execute()

    # Day 11 intervention (low energy day, stuck on task index 1)
    day11_original_tasks = daily_task_titles[10]
    day11_restructured = [
        {"index": 0, "title": "Copy the comment into a fresh doc", "description": "Isolate it from the noisy PR interface",
         "duration_minutes": 2, "time_slot": "11:00", "category": "deep-work",
         "rationale": "Reduce visual clutter and context-switching cost", "priority": "high", "status": "completed"},
        {"index": 1, "title": "Write 3 bullet points responding to the comment", "description": "No prose, just bullets",
         "duration_minutes": 10, "time_slot": "11:05", "category": "deep-work",
         "rationale": "Bullets lower the writing activation threshold vs. full sentences", "priority": "high", "status": "completed"},
        {"index": 2, "title": "Convert bullets to a reply and submit", "description": "Polish only lightly",
         "duration_minutes": 5, "time_slot": "11:20", "category": "communication",
         "rationale": "Separate drafting from editing to reduce perfectionism", "priority": "medium", "status": "pending"},
    ]
    db.table("interventions").insert({
        "user_id": ALEX_UUID,
        "plan_id": plan_ids[10],
        "trigger_type": "stuck_button",
        "stuck_task_index": 1,
        "user_message": "I keep re-reading the same code review comment and can't figure out what to write.",
        "emotional_acknowledgment": (
            "Code review paralysis is real, especially on low-energy days. "
            "Let's break this down so you don't have to hold it all in working memory."
        ),
        "original_tasks": [{"index": i, "title": t} for i, t in enumerate(day11_original_tasks)],
        "restructured_tasks": day11_restructured,
        "agent_reasoning": (
            "Detected working memory overload during code review. Alex's working memory score (51) suggests "
            "externalizing the problem is key. Split the task into isolate-draft-submit pipeline to reduce "
            "cognitive load at each step. Bullets-first approach lowers the initiation barrier (initiation score: 30)."
        ),
        "followup_message": "Once you submit that reply, take a 5-minute break. You earned it.",
    }).execute()

    # ── 5. Hypothesis Cards ──
    db.table("hypothesis_cards").insert({
        "user_id": ALEX_UUID,
        "pattern_detected": "Low-energy days consistently follow 2+ consecutive high-output days",
        "prediction": (
            "If Alex has two consecutive days completing 5+ tasks with high energy, "
            "the next day is likely to be a low-energy day (80% confidence based on 14-day pattern)."
        ),
        "confidence": "high",
        "status": "active",
        "supporting_evidence": [
            {"day": 7, "detail": "Days 7-8 were high energy with 4-5 tasks completed, Day 9 dropped to medium"},
            {"day": 11, "detail": "Days 9-10 were high output, Day 11 was low energy with only 4/5 tasks"},
        ],
        "annotation_day": 4,
        "agent_annotation": "Pattern detected: energy crash after sustained high output. Consider proactive rest scheduling.",
    }).execute()

    db.table("hypothesis_cards").insert({
        "user_id": ALEX_UUID,
        "pattern_detected": "Mood scores improve when first task of the day is completed within 30 minutes",
        "prediction": (
            "Starting with a small, completable task in the first 30 minutes correlates with "
            "+1.5 higher mood score for the rest of the day. Quick wins activate Alex's Momentum-Builder trait."
        ),
        "confidence": "medium",
        "status": "confirmed",
        "supporting_evidence": [
            {"day": 2, "detail": "Started with standup (quick task), mood 6 vs day 1 mood 5"},
            {"day": 8, "detail": "First task completed by 9:30, mood peaked at 7"},
            {"day": 14, "detail": "Demo (prepared in advance) as first task, mood reached 8"},
        ],
        "annotation_day": 11,
        "agent_annotation": "Hypothesis confirmed: early quick wins boost mood by ~1.5 points. Recommending morning micro-task ritual.",
    }).execute()
