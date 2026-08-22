"""Builds the ADK toolset that gives the agent read/write access to Schedule
and Estimate, generated directly from the repo's own openapi/schedule-
estimate.yaml - written and maintained specifically for this purpose (see
its `info.description`).

Verified against the installed google-adk version: OpenAPIToolset turns each
operationId into a tool named in snake_case (e.g. listScheduleItems ->
list_schedule_items), and each operation's query/body parameters into
snake_case arguments (jobId -> job_id) whose descriptions - including the
full-replace-not-a-patch warning on the two update operations - come
straight from the spec, so the agent sees them without any of this needing
to be duplicated in the system prompt.
"""

from pathlib import Path

from google.adk.tools.openapi_tool import OpenAPIToolset

SPEC_PATH = Path(__file__).parent.parent / "openapi" / "schedule-estimate.yaml"


def build_schedule_estimate_toolset() -> OpenAPIToolset:
    return OpenAPIToolset(spec_str=SPEC_PATH.read_text(), spec_str_type="yaml")
