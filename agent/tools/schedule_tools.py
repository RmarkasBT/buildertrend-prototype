import httpx

from ..settings import get_settings

# All raw CRUD (list/create/update/delete for both Schedule and Estimate) is
# generated straight from openapi/schedule-estimate.yaml via OpenAPIToolset
# (see ../openapi_toolset.py) - that spec is the one written and maintained
# for agent tool-calling, and it already documents the update-is-a-full-
# replace gotcha in each operation's own description. The only thing left
# to hand-write here is a derived read the spec doesn't define: filtering
# schedule items to a date window for a look-ahead report.


def get_schedule_look_ahead(job_id: str, start_date: str, end_date: str) -> dict:
    """Schedule items whose date range overlaps [start_date, end_date] (YYYY-MM-DD) - for a look-ahead report."""
    resp = httpx.get(f"{get_settings().node_api_base}/api/schedule", params={"jobId": job_id})
    resp.raise_for_status()
    in_range = [it for it in resp.json() if it["start"] <= end_date and it["end"] >= start_date]
    return {"items": in_range, "range": {"start": start_date, "end": end_date}}
