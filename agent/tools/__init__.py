from .schedule_tools import get_schedule_look_ahead

# The 23 raw CRUD operations (Schedule, Estimate and Daily Logs) come from
# the tag-derived OpenAPIToolsets
# in ../openapi_toolset.py, not from here - see that module and
# schedule_tools.py's module docstring for why. This is only the handful of
# derived tools that aren't a direct API operation.
CUSTOM_TOOLS = [get_schedule_look_ahead]
