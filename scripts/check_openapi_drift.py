#!/usr/bin/env python3
"""Check openapi/schedule-estimate.yaml against the server it describes.

Run with `npm run lint:openapi`. Exits non-zero on drift.

This exists because the spec is not documentation - it is the ADK agent's tool
contract (agent/openapi_toolset.py), so drift is a functional bug. The failure
that motivated it: `predecessorIds` was returned and written by the server but
appeared nowhere in the spec, while updateScheduleItem was documented as a full
replace. The generated tool therefore had no argument for it, and every
agent-driven edit of a schedule item silently wiped its Gantt dependency links.

WHAT THIS CANNOT CHECK, and still needs a human:
  - Whether a prose `description` is true. That text is the agent's primary
    steering signal, and nothing here reads English.
  - Whether an `enum` is an exhaustive contract or a captured subset.
  - Semantics: that updateDailyLog refuses jobId/likes, that a group id of
    "unassigned" is synthetic, that weather is snapshotted rather than live.
  - Response *values* - only field names and presence are compared. See the
    round-trip idea in the plan for that.

Zero third-party deps beyond pyyaml, which agent/requirements.txt declares.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "openapi" / "schedule-estimate.yaml"
DB = ROOT / "server" / "db.js"
INDEX = ROOT / "server" / "index.js"

# Each rowTo* mapper in server/db.js is the single source of truth for one
# response shape. Mapping them explicitly (rather than guessing by name) keeps
# the check honest about which schema is supposed to describe which mapper.
MAPPER_TO_SCHEMA = {
    "rowToItem": "ScheduleItem",
    "rowToEstimateItem": "EstimateItem",
    "rowToGroup": "EstimateGroup",
    "rowToDailyLog": "DailyLog",
    "rowToSettings": "DailyLogSettings",
}

# Fields a mapper returns that the response schema legitimately omits, each
# with the reason. Anything not listed here is reported.
ALLOWED_MAPPER_ONLY: dict[tuple[str, str], str] = {}

# The inverse: fields a schema declares that its mapper does NOT return,
# because a decorator adds them on the way out. These are derived-on-read by
# design - storing them would let them drift from their source of truth - so
# they belong in the response schema but never in the mapper.
DECORATED: dict[str, dict[str, str]] = {
    "EstimateItem": {
        # server/estimateRoutes.js:withFinancials - recomputed per request so a
        # markup change can't leave a stale total behind.
        "builderCost": "withFinancials",
        "unitPrice": "withFinancials",
        "clientPrice": "withFinancials",
        "margin": "withFinancials",
        "profit": "withFinancials",
    },
    "DailyLog": {
        # server/dailyLogRoutes.js:decorate - counted from the comments table
        # and the likes array so they cannot disagree with them.
        "commentCount": "decorate",
        "likeCount": "decorate",
        "likedByMe": "decorate",
        "comments": "getLog (single-log reads only)",
    },
}

failures: list[str] = []
notes: list[str] = []


def fail(check: str, msg: str) -> None:
    failures.append(f"[{check}] {msg}")


# --------------------------------------------------------------------------
# Spec loading + schema flattening
# --------------------------------------------------------------------------
def load_spec() -> dict:
    return yaml.safe_load(SPEC.read_text())


def resolve(spec: dict, node: dict, seen: frozenset[str] = frozenset()) -> dict:
    """Collapse $ref and allOf into one property map.

    ADK inlines internal refs the same way, so flattening here matches what the
    agent actually ends up with.
    """
    props: dict[str, dict] = {}
    required: set[str] = set()

    if "$ref" in node:
        ref = node["$ref"]
        if not ref.startswith("#"):
            fail("refs", f"external $ref {ref!r} - ADK's parser raises on these")
            return {"properties": props, "required": required}
        if ref in seen:
            return {"properties": props, "required": required}
        target = spec
        for part in ref.lstrip("#/").split("/"):
            target = target[part]
        inner = resolve(spec, target, seen | {ref})
        props.update(inner["properties"])
        required |= inner["required"]

    for sub in node.get("allOf", []):
        inner = resolve(spec, sub, seen)
        props.update(inner["properties"])
        required |= inner["required"]

    props.update(node.get("properties", {}) or {})
    required |= set(node.get("required", []) or [])
    return {"properties": props, "required": required}


def schema_fields(spec: dict, name: str) -> tuple[set[str], set[str]]:
    schemas = spec.get("components", {}).get("schemas", {})
    if name not in schemas:
        fail("mappers", f"schema {name!r} referenced by this checker does not exist")
        return set(), set()
    flat = resolve(spec, schemas[name])
    return set(flat["properties"]), flat["required"]


# --------------------------------------------------------------------------
# Check 1 - mapper/response-schema field parity  (catches the real bugs)
# --------------------------------------------------------------------------
def mapper_keys(source: str, fn: str) -> set[str] | None:
    """Top-level keys of the object literal a `rowTo*` mapper returns.

    Depth-aware so nested literals (rowToSettings' share/notify) contribute
    their parent key only, not their children.
    """
    m = re.search(rf"export function {fn}\(", source)
    if not m:
        return None
    start = source.index("return {", m.end())
    i = start + len("return ")
    depth, keys, buf = 0, set(), ""
    while i < len(source):
        ch = source[i]
        if ch in "{[(":
            depth += 1
            if depth == 1:
                buf = ""
        elif ch in "}])":
            depth -= 1
            if depth == 0:
                break
        elif depth == 1:
            if ch == ",":
                buf = ""
            elif ch == ":":
                key = buf.strip().strip("'\"")
                if re.fullmatch(r"[A-Za-z_]\w*", key):
                    keys.add(key)
                buf = ""
            else:
                buf += ch
        i += 1
    return keys


def check_mappers(spec: dict) -> None:
    source = DB.read_text()
    for fn, schema_name in MAPPER_TO_SCHEMA.items():
        keys = mapper_keys(source, fn)
        if keys is None:
            fail("mappers", f"{fn} not found in server/db.js - checker is stale")
            continue
        props, required = schema_fields(spec, schema_name)

        missing = {
            k for k in keys - props
            if (fn, k) not in ALLOWED_MAPPER_ONLY
        }
        if missing:
            fail(
                "mappers",
                f"{fn} returns {sorted(missing)} but {schema_name} does not declare "
                f"them. An agent doing a read-modify-write cannot round-trip these.",
            )

        decorated = DECORATED.get(schema_name, {})
        phantom = props - keys - set(decorated)
        if phantom:
            fail("mappers", f"{schema_name} declares {sorted(phantom)} but {fn} never returns them")

        # A decorator listed here must still actually exist, or the allowance is
        # covering for a field nothing populates any more.
        for field, producer in decorated.items():
            producer_fn = producer.split()[0]
            if field not in props:
                fail("mappers", f"{schema_name} no longer declares {field!r} - drop it from DECORATED")
            elif not any(
                producer_fn in (ROOT / "server" / f).read_text()
                for f in ("estimateRoutes.js", "dailyLogRoutes.js")
            ):
                fail("mappers", f"{producer_fn!r} (claimed producer of {field!r}) not found in server/")

        # These mappers populate every key unconditionally, so `required` should
        # match exactly - an under-specified required list leaves an agent
        # unable to tell an always-present nullable field from an absent one.
        under = keys - required - phantom
        if under:
            notes.append(
                f"{schema_name}.required omits always-present {sorted(under)} "
                f"(returned unconditionally by {fn})"
            )


# --------------------------------------------------------------------------
# Check 2 - route/operation parity
# --------------------------------------------------------------------------
def server_routes() -> set[tuple[str, str]]:
    """Every (path, METHOD) server/index.js actually handles.

    index.js is a hand-rolled if/else dispatcher rather than a route table, so
    this reads its two shapes: literal `pathname === '...'` comparisons, and
    regex routes bound to a local via `pathname.match(SOME_ROUTE)`. The binding
    is resolved by variable name rather than guessed, so a renamed constant
    surfaces as a loud "checker is stale" failure instead of a silent miss.
    """
    source = INDEX.read_text()

    patterns = dict(re.findall(r"const (\w*ROUTE) = /\^(.+?)\$/", source))
    # `const idMatch = pathname.match(ID_ROUTE)` -> {'idMatch': 'ID_ROUTE'}
    bindings = dict(re.findall(r"const (\w+) = pathname\.match\((\w+)\)", source))

    unresolved = {c for c in bindings.values() if c not in patterns}
    if unresolved:
        fail("routes", f"pathname.match() references unknown constant(s): {sorted(unresolved)}")

    def templated(pattern: str) -> str:
        return pattern.replace("\\/", "/").replace("([^/]+)", "{id}")

    routes: set[tuple[str, str]] = set()

    for path, method in re.findall(
        r"pathname === '([^']+)'\s*&&\s*req\.method === '(\w+)'", source
    ):
        routes.add((path, method))

    # Regex branches, incl. the multi-verb `(req.method === 'PUT' || ... 'PATCH')`
    # form. Anchored on a known binding name so nothing is matched by accident.
    for var, const in bindings.items():
        if const not in patterns:
            continue
        path = templated(patterns[const])
        for methods_blob in re.findall(
            rf"\b{re.escape(var)}\s*&&\s*\(?((?:req\.method === '\w+'(?:\s*\|\|\s*)?)+)\)?",
            source,
        ):
            for method in re.findall(r"req\.method === '(\w+)'", methods_blob):
                routes.add((path, method))
    return routes


def check_routes(spec: dict) -> None:
    spec_ops = {
        (path, method.upper())
        for path, item in spec.get("paths", {}).items()
        for method in item
        if method.lower() in {"get", "post", "put", "patch", "delete"}
    }
    impl = server_routes()

    # /openapi.yaml is deliberately undocumented: as an operation it would
    # become a tool handing the agent the very spec it already has as tools.
    impl = {r for r in impl if r[0] != "/openapi.yaml"}

    # PATCH may be left undocumented where PUT is documented on the same path.
    # Since the update handlers became partial-merge both verbs share one
    # handler, so documenting both hands the agent two byte-identical tools for
    # no gain - but documenting PATCH is a legitimate choice too, so only an
    # UNdocumented PATCH gets the pass. A PATCH on a path with no documented
    # PUT is still reported, and a documented PATCH must still be implemented.
    documented_puts = {p for p, m in spec_ops if m == "PUT"}
    impl = {
        r for r in impl
        if not (r[1] == "PATCH" and r[0] in documented_puts and r not in spec_ops)
    }

    undocumented = impl - spec_ops
    if undocumented:
        fail(
            "routes",
            "handled by server/index.js but absent from the spec: "
            + ", ".join(f"{m} {p}" for p, m in sorted(undocumented)),
        )

    phantom = spec_ops - impl
    if phantom:
        fail(
            "routes",
            "declared in the spec but not handled: "
            + ", ".join(f"{m} {p}" for p, m in sorted(phantom)),
        )


# --------------------------------------------------------------------------
# Check 3 - operationId contract ADK relies on
# --------------------------------------------------------------------------
def to_snake(name: str) -> str:
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    return re.sub(r"[^0-9a-zA-Z]+", "_", s).lower()


def check_operation_ids(spec: dict) -> None:
    ids: list[str] = []
    for path, item in spec.get("paths", {}).items():
        for method, op in item.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            op_id = op.get("operationId")
            if not op_id:
                fail("operationIds", f"{method.upper()} {path} has no operationId - ADK raises on this")
                continue
            if not op.get("description"):
                fail(
                    "operationIds",
                    f"{op_id} has no description - that prose is the ONLY guidance "
                    "the model gets, since response schemas never reach it",
                )
            ids.append(op_id)

    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        fail("operationIds", f"duplicated: {sorted(dupes)}")

    # ADK names tools _to_snake_case(operationId)[:60]; collisions there would
    # silently shadow a tool.
    seen: dict[str, str] = {}
    for op_id in ids:
        tool = to_snake(op_id)[:60]
        if tool in seen and seen[tool] != op_id:
            fail("operationIds", f"{op_id!r} and {seen[tool]!r} both become tool {tool!r}")
        seen[tool] = op_id


# --------------------------------------------------------------------------
def main() -> int:
    spec = load_spec()
    check_mappers(spec)
    check_routes(spec)
    check_operation_ids(spec)

    for note in notes:
        print(f"note: {note}")
    if failures:
        print(f"\n{len(failures)} drift problem(s) between the spec and the server:\n")
        for f in failures:
            print(f"  {f}")
        print(f"\nspec: {SPEC.relative_to(ROOT)}")
        return 1
    print(f"OK - spec matches the server ({len(spec.get('paths', {}))} paths)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
