"""Minimal HTTP wrapper around the ADK agent, for the React panel to call.

Not part of ADK's own `adk api_server` - that exposes a much broader,
session-management-oriented REST surface. This exposes exactly one endpoint
the frontend needs, using ADK's Runner + InMemorySessionService directly.
"""

import json

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

from .agent import root_agent

app = FastAPI()
APP_NAME = "buildertrend_assistant"
session_service = InMemorySessionService()
# auto_create_session: run_async looks up (user_id, session_id) itself and
# creates it on first use - no separate pre-creation call needed here.
runner = Runner(
    agent=root_agent,
    app_name=APP_NAME,
    session_service=session_service,
    auto_create_session=True,
)


class ChatRequest(BaseModel):
    job_id: str
    session_id: str
    message: str


def sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


async def run_and_stream(req: ChatRequest):
    # job_id only reaches Runner as the session-keying user_id, never as
    # text the model can read - without this prefix the model has no way
    # to know which job "this job" refers to and guesses (reproduced live:
    # it silently defaulted to job j1 for every other job's questions).
    text = f"[Current job_id: {req.job_id}]\n{req.message}"
    content = types.Content(role="user", parts=[types.Part(text=text)])
    try:
        async for event in runner.run_async(user_id=req.job_id, session_id=req.session_id, new_message=content):
            if not event.content or not event.content.parts:
                continue
            for part in event.content.parts:
                if part.function_call:
                    yield sse({"type": "tool_call", "id": part.function_call.id, "name": part.function_call.name})
                if part.function_response:
                    yield sse({"type": "tool_result", "id": part.function_response.id})
            if event.is_final_response():
                # At effort=high (extended thinking), the final event's
                # parts[0] is a thought block (empty .text) with the real
                # answer in a later part - reproduced live as an
                # always-empty reply before this filter. Join every
                # non-thought text part, not just [0].
                texts = [p.text for p in event.content.parts if p.text and not getattr(p, "thought", False)]
                yield sse({"type": "final", "text": "".join(texts)})
    except Exception as e:
        yield sse({"type": "error", "message": str(e)})


@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    return StreamingResponse(run_and_stream(req), media_type="text/event-stream")
