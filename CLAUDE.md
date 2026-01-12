# CLAUDE.md — Life Stream

Instructions for Claude Code when working with this repository.

---

## Overview

This is an event-sourced personal life management system. All data is stored as append-only JSON Lines files. Your role is to help maintain, query, and extend this system.

**Golden rule**: Never edit or delete existing events. Always append new events.

---

## Repository Structure

```
~/life/
  events/                  # Primary event storage
    YYYY-MM.jsonl          # One file per month
  synced/                  # Events from external services
    strava/
    fitbit/
  schema/                  # Documentation
  views/                   # Generated summaries (not source of truth)
  tools/                   # Scripts and MCP server
```

---

## Working with Events

### Reading Events

To query events, read the `.jsonl` files and parse each line as JSON:

```python
import json
from pathlib import Path
from datetime import datetime

def read_events(start_date=None, end_date=None, event_type=None):
    events = []
    for f in sorted(Path("events").glob("*.jsonl")):
        for line in f.read_text().strip().split("\n"):
            if not line:
                continue
            event = json.loads(line)
            if event_type and not event["type"].startswith(event_type):
                continue
            if start_date and event["ts"] < start_date:
                continue
            if end_date and event["ts"] > end_date:
                continue
            events.append(event)
    return events
```

For a complete view, also read from `synced/` directories.

### Writing Events

Always append to the current month's file:

```python
from datetime import datetime
import json

def log_event(event_type, data, event_id=None):
    now = datetime.now().astimezone()
    event = {
        "ts": now.isoformat(),
        "type": event_type,
        "source": "claude",
        "data": data
    }
    if event_id:
        event["id"] = event_id
    
    filename = f"events/{now.strftime('%Y-%m')}.jsonl"
    with open(filename, "a") as f:
        f.write(json.dumps(event) + "\n")
    return event
```

### Generating IDs

For entities that need IDs (tasks, meetings, goals):

```python
def generate_id(prefix):
    """Generate ID like t-20260107-001"""
    today = datetime.now().strftime("%Y%m%d")
    # Count existing IDs for today to get next number
    existing = [e for e in read_events() if e.get("id", "").startswith(f"{prefix}-{today}")]
    next_num = len(existing) + 1
    return f"{prefix}-{today}-{next_num:03d}"
```

Prefixes: `t` (task), `m` (meeting), `g` (goal)

---

## Event Types Quick Reference

### Tasks
- `task.created` — New task (requires `id`)
- `task.started` — Work begun
- `task.blocked` — Blocked with reason
- `task.completed` — Finished
- `task.abandoned` — Dropped with reason

### Meetings
- `meeting.scheduled` — Planned (requires `id`)
- `meeting.completed` — Finished with notes
- `meeting.cancelled` — Didn't happen

### Exercise
- `exercise.completed` — Workout done

### Investments
- `investment.buy` — Asset purchased
- `investment.sell` — Asset sold
- `investment.dividend` — Dividend received
- `investment.snapshot` — Portfolio value capture

### Health
- `health.weight` — Weight measurement
- `health.sleep` — Sleep data
- `health.blood_pressure` — BP reading
- `health.note` — Freeform note

### Mental Health
- `mental.checkin` — Mood/energy snapshot
- `mental.gratitude` — Gratitude list
- `mental.reflection` — Situation processing

### Work
- `work.started` — Begin session
- `work.stopped` — End session
- `work.logged` — After-the-fact entry

### Goals
- `goal.set` — New goal (requires `id`)
- `goal.progress` — Progress update
- `goal.revised` — Scope/timeline changed
- `goal.achieved` — Completed
- `goal.abandoned` — Dropped

---

## Common Operations

### Get Open Tasks

```python
def get_open_tasks():
    tasks = {}
    for event in read_events(event_type="task"):
        eid = event.get("id")
        if event["type"] == "task.created":
            tasks[eid] = {
                "id": eid,
                "title": event["data"]["title"],
                "area": event["data"].get("area"),
                "due": event["data"].get("due"),
                "status": "open",
                "created": event["ts"]
            }
        elif event["type"] in ("task.completed", "task.abandoned"):
            if eid in tasks:
                tasks[eid]["status"] = "closed"
    return [t for t in tasks.values() if t["status"] == "open"]
```

### Get Goal Status

```python
def get_goal_status(goal_id):
    events = [e for e in read_events(event_type="goal") if e.get("id") == goal_id]
    if not events:
        return None
    
    goal = {"id": goal_id, "history": []}
    for e in events:
        if e["type"] == "goal.set":
            goal.update(e["data"])
        elif e["type"] == "goal.progress":
            goal["latest_status"] = e["data"].get("status")
            goal["history"].append(e)
        elif e["type"] == "goal.achieved":
            goal["achieved"] = True
            goal["achieved_at"] = e["ts"]
    return goal
```

### Weekly Summary

```python
def weekly_summary():
    from datetime import timedelta
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    events = read_events(start_date=week_ago)
    
    summary = {
        "tasks_completed": [],
        "tasks_created": [],
        "meetings": [],
        "exercise_sessions": [],
        "work_hours": 0,
        "checkins": []
    }
    
    for e in events:
        if e["type"] == "task.completed":
            summary["tasks_completed"].append(e)
        elif e["type"] == "task.created":
            summary["tasks_created"].append(e)
        elif e["type"] == "meeting.completed":
            summary["meetings"].append(e)
        elif e["type"] == "exercise.completed":
            summary["exercise_sessions"].append(e)
        elif e["type"] == "work.logged":
            summary["work_hours"] += e["data"].get("duration_min", 0) / 60
        elif e["type"] == "mental.checkin":
            summary["checkins"].append(e)
    
    return summary
```

---

## Corrections and Amendments

Never edit past events. Instead, append correction events:

```jsonl
{"ts": "2026-01-08T10:00:00+01:00", "type": "correction", "data": {"corrects": "2026-01-07T14:00:00+01:00", "field": "amount", "was": -450, "should_be": -350, "reason": "Typo in original entry"}}
```

For changing task status retroactively, just log the state change with the current timestamp—the `id` links it to the original task.

---

## MCP Server

The MCP server in `tools/mcp-server.py` exposes these tools:

| Tool | Purpose |
|------|---------|
| `log_event` | Append any event |
| `query_events` | Search with filters |
| `list_open_tasks` | Get incomplete tasks |
| `complete_task` | Mark task done |
| `add_task` | Create new task |
| `get_summary` | Overview of recent activity |

When implementing or extending the MCP server, ensure all writes go through the standard `log_event` mechanism.

---

## Synced Data

External services store events in `synced/{service}/YYYY-MM.jsonl`.

**Important**: When querying for a complete picture (e.g., all exercise), merge both `events/` and `synced/strava/`.

Sync scripts in `tools/`:
- `sync-strava.py` — Pull activities from Strava API
- `sync-fitbit.py` — Pull weight/sleep from Fitbit API

These should be idempotent—running them multiple times should not create duplicate events. Use external IDs (e.g., `strava_id`) to detect duplicates.

---

## Generating Views

Views in `views/` are derived artifacts. Regenerate them with:

```bash
python tools/generate-views.py
```

Or generate specific views:

```python
def generate_open_tasks_view():
    tasks = get_open_tasks()
    md = "# Open Tasks\n\n"
    
    by_area = {}
    for t in tasks:
        area = t.get("area", "uncategorized")
        by_area.setdefault(area, []).append(t)
    
    for area, area_tasks in sorted(by_area.items()):
        md += f"## {area}\n\n"
        for t in sorted(area_tasks, key=lambda x: x.get("due") or "9999"):
            due = f" (due: {t['due']})" if t.get("due") else ""
            md += f"- [ ] {t['title']}{due}\n"
        md += "\n"
    
    Path("views/open-tasks.md").write_text(md)
```

---

## Adding New Event Types

1. Document the new type in `schema/SCHEMA.md`
2. Add handling in relevant query functions
3. Update view generators if the new type should appear in summaries
4. No migration needed—old data remains valid

Example: Adding `idea.captured`

```python
# Just start logging it
log_event("idea.captured", {
    "content": "SaaS idea: AI retrospective facilitator",
    "tags": ["business", "ai"]
})
```

---

## Testing Changes

Before committing changes to tools:

1. Read a sample of existing events to ensure parsing works
2. Write a test event to a temporary file
3. Verify queries return expected results

```python
def test_roundtrip():
    test_event = {"ts": "2026-01-01T00:00:00+01:00", "type": "test", "data": {"foo": "bar"}}
    line = json.dumps(test_event)
    parsed = json.loads(line)
    assert parsed == test_event
```

---

## Timezone Handling

All timestamps should include timezone offset. The owner is in Norway (CET/CEST):
- Winter: `+01:00`
- Summer: `+02:00`

Use `datetime.now().astimezone()` to get the correct local timezone.

---

## Privacy Notes

- This repository contains personal data
- Do not commit API keys or tokens to the repo
- Keep `.env` or `secrets/` in `.gitignore`
- External sync credentials should be stored securely outside the repo

---

## When in Doubt

1. Append, don't edit
2. Include timezone in timestamps
3. Use established event types when they fit
4. Document new patterns in the schema
5. Keep events atomic—one thing per event
