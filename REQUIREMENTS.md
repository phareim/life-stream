# Life Stream — Requirements

## Vision

A personal life management system built on event sourcing principles. Life is treated as an append-only stream of events. Current state is derived by replaying history—never by mutating it.

The system should feel lightweight to use daily while accumulating a rich, queryable history over time.

---

## Core Principles

1. **Append-only**: Events are never edited or deleted. Corrections are new events that reference what they correct.
2. **Source of truth**: The event stream is the primary data. Views, summaries, and dashboards are derived artifacts.
3. **Multi-source**: Events can originate from manual entry, Claude via MCP, or synced external services.
4. **Evolvable schema**: New event types can be added anytime without migrating existing data.
5. **Plain text**: Everything is human-readable JSON Lines files, version-controllable with git.

---

## Event Structure

Every event follows this base structure:

```json
{
  "ts": "ISO 8601 timestamp with timezone",
  "type": "domain.action",
  "id": "optional, required for updatable entities",
  "source": "manual|claude|strava|fitbit|etc",
  "data": {}
}
```

### ID Conventions

| Entity  | Pattern           | Example           |
|---------|-------------------|-------------------|
| Task    | `t-YYYYMMDD-NNN`  | `t-20260107-003`  |
| Meeting | `m-YYYYMMDD-NNN`  | `m-20260107-001`  |
| Goal    | `g-YYYY-NNN`      | `g-2026-004`      |

IDs are required for entities that have state transitions (tasks, goals, meetings). Pure log events (measurements, check-ins) don't need IDs.

---

## Event Domains

### Tasks

Track work and personal tasks through their lifecycle.

| Event Type       | Purpose                                      |
|------------------|----------------------------------------------|
| `task.created`   | New task added                               |
| `task.started`   | Work begun on task                           |
| `task.blocked`   | Task blocked, with reason                    |
| `task.completed` | Task finished                                |
| `task.abandoned` | Task dropped, with reason                    |

**Data fields:**
- `title` (required): What the task is
- `area`: `work` | `personal` | project name
- `project`: Optional grouping
- `due`: Optional deadline (ISO date)
- `priority`: `low` | `medium` | `high` | `urgent`

### Meetings

Track scheduled meetings and capture outcomes.

| Event Type          | Purpose                          |
|---------------------|----------------------------------|
| `meeting.scheduled` | Meeting planned                  |
| `meeting.completed` | Meeting finished, with notes     |
| `meeting.cancelled` | Meeting didn't happen            |

**Data fields:**
- `title` (required): Meeting subject
- `with`: List of participants/groups
- `duration_min`: Planned or actual duration
- `location`: Physical location or video platform
- `notes`: What was discussed/decided
- `action_items`: List of task IDs spawned from meeting
- `energy`: `high` | `neutral` | `draining`

### Exercise

Track physical activity, primarily synced from Strava.

| Event Type           | Purpose                    |
|----------------------|----------------------------|
| `exercise.completed` | Workout finished           |
| `exercise.planned`   | Future workout scheduled   |

**Data fields:**
- `activity`: `run` | `cycle` | `swim` | `strength` | `walk` | `ski` | `other`
- `duration_min`: Length of activity
- `distance_km`: For distance-based activities
- `avg_hr`: Average heart rate
- `notes`: Subjective notes
- `strava_id`: Reference to Strava activity (when synced)

### Investments

Track portfolio transactions and periodic snapshots.

| Event Type            | Purpose                           |
|-----------------------|-----------------------------------|
| `investment.buy`      | Asset purchased                   |
| `investment.sell`     | Asset sold                        |
| `investment.dividend` | Dividend received                 |
| `investment.snapshot` | Point-in-time portfolio value     |

**Data fields:**
- `asset`: Ticker or asset name (e.g., `KOG`, `ETH`, `DNB-teknologi`)
- `quantity`: Units bought/sold
- `price_nok`: Price per unit or total amount
- `account`: `nordnet-ask` | `nordnet-ips` | `firi` | `dnb-funds` | etc.
- `realized_gain_nok`: For sells, the gain/loss
- `total_nok`: For snapshots, total portfolio value
- `breakdown`: For snapshots, value by category

### Health (Measurements)

Track physical health metrics, primarily synced from Fitbit.

| Event Type             | Purpose                    |
|------------------------|----------------------------|
| `health.weight`        | Weight measurement         |
| `health.sleep`         | Sleep session              |
| `health.blood_pressure`| BP reading                 |
| `health.note`          | Freeform health note       |

**Data fields vary by type:**
- Weight: `value`, `unit`
- Sleep: `duration_min`, `quality`, `deep_min`, `rem_min`
- Blood pressure: `systolic`, `diastolic`
- Note: `note`

### Mental Health

Track mood, energy, and psychological well-being.

| Event Type          | Purpose                              |
|---------------------|--------------------------------------|
| `mental.checkin`    | Regular mood/energy snapshot         |
| `mental.gratitude`  | Things to be grateful for            |
| `mental.reflection` | Processing a specific situation      |

**Data fields:**
- Check-in: `mood` (1-10), `energy` (1-10), `anxiety` (0-10), `notes`
- Gratitude: `items` (list of strings)
- Reflection: `trigger`, `thought`, `reframe`

### Work Logging

Track time spent on projects and clients.

| Event Type     | Purpose                              |
|----------------|--------------------------------------|
| `work.started` | Begin a work session                 |
| `work.stopped` | End a work session                   |
| `work.logged`  | After-the-fact time entry            |

**Data fields:**
- `project`: Project or client name
- `task_id`: Optional link to task
- `duration_min`: Time spent
- `description`: What was done
- `billable`: Boolean

### Goals

Track longer-term objectives and their progress.

| Event Type      | Purpose                          |
|-----------------|----------------------------------|
| `goal.set`      | New goal established             |
| `goal.progress` | Progress update                  |
| `goal.revised`  | Goal scope/timeline changed      |
| `goal.achieved` | Goal completed                   |
| `goal.abandoned`| Goal dropped                     |

**Data fields:**
- `title` (required): The goal
- `horizon`: `week` | `month` | `quarter` | `year` | `ongoing`
- `area`: Life area this relates to
- `target_date`: When to achieve by
- `success_criteria`: How to know it's done
- `status`: `on_track` | `at_risk` | `behind`

---

## Future Event Domains (Not Yet Implemented)

These may be added as usage patterns emerge:

- **Ideas**: `idea.captured`, `idea.developed`, `idea.archived`
- **Decisions**: `decision.made` with reasoning
- **Journal**: `journal.entry` for freeform daily writing
- **Learning**: `learning.noted` for insights from reading
- **Habits**: `habit.completed` for recurring behaviors
- **Finances**: `finance.transaction` for spending/income

---

## External Integrations

### Strava (Exercise)

- **Sync method**: Pull-based via Strava API
- **Frequency**: Daily or on-demand
- **Data**: Activities become `exercise.completed` events
- **Storage**: `synced/strava/YYYY-MM.jsonl`

### Fitbit (Health)

- **Sync method**: Pull-based via Fitbit API
- **Frequency**: Daily or on-demand
- **Data**: Weight → `health.weight`, Sleep → `health.sleep`
- **Storage**: `synced/fitbit/YYYY-MM.jsonl`

### Future Integrations

Potential additions based on value:

- Bank APIs (Sbanken, DNB) for transactions
- Google Calendar for meetings
- Toggl for work time tracking
- GitHub for development activity

---

## MCP Server

An MCP server enables Claude to interact with the life stream conversationally.

### Required Tools

| Tool              | Purpose                                        |
|-------------------|------------------------------------------------|
| `log_event`       | Append any event to the stream                 |
| `query_events`    | Search/filter events by type, date, content    |
| `list_open_tasks` | Get tasks not yet completed                    |
| `get_summary`     | Generate a status overview                     |
| `complete_task`   | Mark a task as done (convenience wrapper)      |
| `add_task`        | Create a new task (convenience wrapper)        |

### Interaction Examples

User: "Add a task to review the Q1 roadmap by Friday"
→ `add_task` with title, due date, area

User: "Log that I just finished a 30 min strength session"
→ `log_event` with `exercise.completed`

User: "How am I doing on my Legacy RPG goal?"
→ `query_events` filtered to goal progress + related tasks

User: "What did I work on this week?"
→ `query_events` for `work.logged` and `task.completed` in date range

---

## File Structure

```
~/life/
  events/
    YYYY-MM.jsonl          # Manual events, one file per month
  synced/
    strava/
      YYYY-MM.jsonl        # Synced Strava activities
    fitbit/
      YYYY-MM.jsonl        # Synced Fitbit data
  schema/
    SCHEMA.md              # Event type documentation
  views/
    open-tasks.md          # Generated: current open tasks
    weekly-review.md       # Generated: weekly summary
    goals-status.md        # Generated: goal progress
  tools/
    mcp-server.py          # MCP server for Claude
    sync-strava.py         # Strava sync script
    sync-fitbit.py         # Fitbit sync script
    query.py               # CLI query utility
  REQUIREMENTS.md          # This file
  CLAUDE.md                # Instructions for Claude Code
```

---

## Views (Derived Artifacts)

Views are generated from the event stream, not manually maintained.

### Required Views

1. **Open Tasks**: All tasks without a `completed` or `abandoned` event
2. **Weekly Review**: Summary of past 7 days across all domains
3. **Goals Status**: Current goals with recent progress

### View Generation

Views should be regenerable at any time from the event stream. They can be cached as markdown files for quick access but are never the source of truth.

---

## Non-Functional Requirements

### Performance

- System should handle 10,000+ events per year without issues
- Queries across a full year should complete in under 1 second

### Portability

- All data in plain text (JSON Lines)
- No database server required
- Easily backed up via git, Syncthing, or cloud storage

### Privacy

- All data stored locally
- External syncs only pull data, never push
- No third-party analytics or telemetry

---

## Success Criteria

The system is successful if:

1. Daily logging feels effortless (< 2 minutes of friction)
2. Weekly reviews surface useful patterns
3. Historical queries answer questions like "when did I last..." or "how has X changed over time"
4. The schema evolves naturally without breaking old data
