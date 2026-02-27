import asyncio
import logging
from collections import defaultdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from crewai.events.event_bus import crewai_event_bus
from crewai.events.event_types import (
    AgentExecutionStartedEvent,
    AgentExecutionCompletedEvent,
    TaskStartedEvent,
    TaskCompletedEvent,
    ToolUsageStartedEvent,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Global registry of active WebSocket queues per user
_active_connections: dict[str, set[asyncio.Queue]] = defaultdict(set)

# Progress message mapping by agent role
PROGRESS_MESSAGES = {
    "Executive Function Planning Strategist": {
        "start": "Analyzing your cognitive profile...",
        "tools": "Checking your history and patterns...",
        "complete": "Plan ready!",
    },
    "ADHD Crisis Response & Plan Restructuring Specialist": {
        "start": "Attune is listening...",
        "tools": "Understanding your situation...",
        "complete": "New plan ready!",
    },
    "ADHD Cognitive Portrait Specialist": {
        "start": "Reading your responses...",
        "tools": "Scoring your assessment...",
        "complete": "Profile ready!",
    },
    "Attune Executive Function Manager": {
        "start": "Coordinating your AI agents...",
        "tools": "Gathering context from your history...",
        "complete": "Coordination complete!",
    },
    "Behavioral Pattern Analyst": {
        "start": "Scanning your behavioral data...",
        "tools": "Analyzing patterns...",
        "complete": "Patterns detected!",
    },
}

_handlers_registered = False


def _broadcast(message: dict):
    """Broadcast a message to all active WebSocket connections."""
    for queues in _active_connections.values():
        for q in queues:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                pass


def _register_global_handlers():
    """Register CrewAI event handlers once (globally)."""
    global _handlers_registered
    if _handlers_registered:
        return
    _handlers_registered = True

    @crewai_event_bus.on(AgentExecutionStartedEvent)
    def on_agent_started(source, event):
        role = getattr(event, "agent_role", None) or "Agent"
        messages = PROGRESS_MESSAGES.get(role, {})
        msg = messages.get("start", f"{role} is working...")
        _broadcast({"type": "agent_started", "agent": role, "message": msg})

    @crewai_event_bus.on(AgentExecutionCompletedEvent)
    def on_agent_completed(source, event):
        role = getattr(event, "agent_role", None) or "Agent"
        messages = PROGRESS_MESSAGES.get(role, {})
        msg = messages.get("complete", "Processing complete")
        _broadcast({"type": "agent_completed", "agent": role, "message": msg})

    @crewai_event_bus.on(ToolUsageStartedEvent)
    def on_tool_started(source, event):
        tool_name = getattr(event, "tool_name", None) or "tool"
        # Map tool names to user-friendly messages
        tool_messages = {
            "get_cognitive_profile": "Checking your cognitive profile...",
            "get_user_history": "Reviewing your recent history...",
            "save_daily_plan": "Saving your plan...",
            "save_intervention": "Recording intervention...",
            "score_asrs": "Scoring your assessment...",
            "save_profile_to_db": "Saving your profile...",
        }
        msg = tool_messages.get(tool_name, f"Using {tool_name}...")
        _broadcast({"type": "tool_started", "tool": tool_name, "message": msg})

    @crewai_event_bus.on(TaskCompletedEvent)
    def on_task_completed(source, event):
        _broadcast({"type": "task_completed", "message": "Processing complete"})


@router.websocket("/ws/agent-progress/{user_id}")
async def agent_progress(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time agent progress updates."""
    await websocket.accept()

    # Ensure global handlers are registered
    _register_global_handlers()

    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _active_connections[user_id].add(queue)

    try:
        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=120)
                await websocket.send_json(message)
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        _active_connections[user_id].discard(queue)
        if not _active_connections[user_id]:
            del _active_connections[user_id]
