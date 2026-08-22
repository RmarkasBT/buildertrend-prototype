"""Builds the ADK toolsets that give the agent read/write access to Schedule,
Estimate and Daily Logs, generated directly from the repo's own
openapi/schedule-estimate.yaml - written and maintained specifically for this
purpose (see its `info.description`).

Verified against the installed google-adk (2.7.1):

- OpenAPIToolset turns each operationId into a tool named in snake_case (e.g.
  listScheduleItems -> list_schedule_items), and each operation's query/body
  parameters into snake_case arguments (jobId -> job_id) whose descriptions
  come straight from the spec, so the agent sees them without any of this
  needing to be duplicated in the system prompt.
- RestApiTool._get_declaration builds the FunctionDeclaration from `name`,
  `description` and the request schema ONLY. Response schemas never reach the
  model, which is why the spec's prose descriptions - not its `responses:`
  blocks - are what actually steer the agent.
- The spec must stay a single self-contained file. OpenApiSpecParser.resolve_ref
  raises ValueError on any `$ref` that doesn't start with "#", and because
  `root_agent` is built at import time that would be a uvicorn startup crash
  rather than a soft failure. Split the spec across files only behind a
  bundling step.

Toolsets are split by the spec's own `tags` rather than by hand-written name
lists, so adding an operation to the YAML puts it in the right toolset with no
change here. Today all three are handed to one agent (23 tools), but the seam
means scoping them per-agent or per-screen later is a one-line change.
"""

from pathlib import Path

import yaml
from google.adk.tools.openapi_tool import OpenAPIToolset

SPEC_PATH = Path(__file__).parent.parent / "openapi" / "schedule-estimate.yaml"

# Read once at import. Each OpenAPIToolset re-parses the text (~35ms warm)
# against a ~5s `google.adk` import, so three toolsets cost nothing worth
# optimising - but there's no reason to re-read the file three times.
_SPEC_TEXT = SPEC_PATH.read_text()

SCHEDULE = "Schedule"
ESTIMATE = "Estimate"
DAILY_LOGS = "Daily Logs"


def _spec_tags() -> set[str]:
    """The tag names the spec actually declares at the top level."""
    return {t["name"] for t in yaml.safe_load(_SPEC_TEXT).get("tags", [])}


def _by_tags(*tags: str):
    """A ToolPredicate selecting operations carrying any of `tags`.

    RestApiTool keeps the parsed `.operation`, so the spec's own tags are
    available here and no operation names need duplicating.
    """
    wanted = set(tags)

    def predicate(tool, readonly_context=None) -> bool:  # noqa: ARG001 - ADK's signature
        return bool(wanted & set(tool.operation.tags or []))

    return predicate


def build_domain_toolset(*tags: str) -> OpenAPIToolset:
    """An OpenAPIToolset limited to the operations tagged with `tags`.

    Fails loudly on an unknown tag or an empty result. That guard is the whole
    reason this is a function: ADK's `tool_filter` matches the SNAKE_CASED tool
    names and `_is_tool_selected` is a plain `in` test with no validation, so a
    filter that matches nothing yields zero tools *silently*. The agent would
    boot fine and then hallucinate its way through every request, which is a
    far worse failure than not starting.
    """
    available = _spec_tags()
    unknown = set(tags) - available
    if unknown:
        raise ValueError(
            f"Unknown spec tag(s) {sorted(unknown)} in {SPEC_PATH.name}. "
            f"Available: {sorted(available)}"
        )

    toolset = OpenAPIToolset(
        spec_str=_SPEC_TEXT,
        spec_str_type="yaml",
        tool_filter=_by_tags(*tags),
    )
    # _tools is populated at construction; tool_filter is applied on get_tools,
    # so check the filter's effect here rather than trusting it.
    matched = [t for t in toolset._tools if _by_tags(*tags)(t)]
    if not matched:
        raise ValueError(
            f"No operations in {SPEC_PATH.name} are tagged {sorted(tags)} - "
            "the resulting toolset would be silently empty."
        )
    return toolset


def build_schedule_toolset() -> OpenAPIToolset:
    return build_domain_toolset(SCHEDULE)


def build_estimate_toolset() -> OpenAPIToolset:
    return build_domain_toolset(ESTIMATE)


def build_daily_logs_toolset() -> OpenAPIToolset:
    return build_domain_toolset(DAILY_LOGS)
