# Phase 3: View Generation ✅

Phase 3 is complete! You can now generate human-readable markdown views from your event stream.

## What's Implemented

### View Generation Library (`tools/lib/views.ts`)

A complete view generation system that creates markdown files from the event stream.

### 3 Core Views

#### 1. Open Tasks (`views/open-tasks.md`)
Shows all incomplete tasks organized by area.

**Features:**
- Grouped by area (work, personal, etc.)
- Sorted by due date within each area
- Priority indicators (🔴 urgent, 🟠 high, 🟡 medium, 🟢 low)
- Due date warnings (⚠️ OVERDUE, 📅 TODAY, 📅 TOMORROW)
- Task count summary

**Example:**
```markdown
## work

- [ ] **Review the Q1 roadmap** 🟠 *(due: Jan 17, 2026)* `t-20260112-001`
- [ ] **Build the future** 🔴 *(due: Jan 20, 2026 📅 TODAY)* `t-20260113-004`

---

*Total open tasks: 2*
```

#### 2. Goals Status (`views/goals-status.md`)
Shows all active goals organized by time horizon.

**Features:**
- Grouped by horizon (week → month → quarter → year → ongoing)
- Status indicators (🟢 on_track, 🟡 at_risk, 🔴 behind)
- Target dates and success criteria
- Progress update count
- Active goals count summary

**Example:**
```markdown
## Quarter

### Launch MVP

- **ID:** `g-2026-001`
- **Area:** work
- **Target:** Mar 31, 2026
- **Success criteria:** 100 users, positive feedback
- **Status:** 🟢 on_track
- **Updates:** 3
```

#### 3. Weekly Review (`views/weekly-review.md`)
Comprehensive summary of the past 7 days across all event types.

**Features:**
- Quick overview counts (tasks, meetings, exercise, work hours, check-ins)
- Completed tasks list with dates
- Exercise summary with totals (duration, distance)
- Meetings with duration
- Mental health averages (mood, energy, anxiety)

**Example:**
```markdown
## Overview

- **Tasks created:** 5
- **Tasks completed:** 3
- **Meetings:** 2
- **Exercise sessions:** 4
- **Work hours:** 12.5h
- **Check-ins:** 5

## ✅ Tasks Completed

- Build authentication system *(Jan 12, 2026)* `t-20260112-001`
- Review PRs *(Jan 13, 2026)* `t-20260113-002`

## 🏃 Exercise

- **run**: 35 min, 6.2 km *(Jan 12, 2026)*
- **cycle**: 60 min, 20 km *(Jan 14, 2026)*

**Total:** 95 min, 26.2 km

## 🧠 Mental Health

- **Average mood:** 7.8/10
- **Average energy:** 7.2/10
- **Average anxiety:** 3.1/10
```

## File Structure

```
views/
├── open-tasks.md       # All incomplete tasks
├── goals-status.md     # Active goals by horizon
└── weekly-review.md    # Past 7 days summary

tools/
├── generate-views.ts   # CLI script to regenerate all views
└── lib/
    └── views.ts        # View generation functions
```

## Usage

### Generate All Views

```bash
npm run views
```

This regenerates all three markdown views from the current event stream.

### Output

```
✅ Views generated successfully:
   - views/open-tasks.md
   - views/goals-status.md
   - views/weekly-review.md

Views are up to date!
```

### Programmatic Usage

```typescript
import {
  generateOpenTasksView,
  generateGoalsView,
  generateWeeklyReviewView,
  generateAllViews
} from './tools/lib/views.js';

// Generate individual views as strings
const tasksMarkdown = await generateOpenTasksView();
console.log(tasksMarkdown);

// Generate all views and write to files
await generateAllViews();
```

## View Features

### Smart Formatting

- **Dates:** Human-readable format (Jan 12, 2026)
- **Durations:** Time in minutes and hours
- **Distances:** Kilometers with one decimal
- **Averages:** Rounded to one decimal place
- **Timestamps:** Last updated timestamp on each view

### Visual Indicators

- 🔴 Urgent priority / Behind schedule
- 🟠 High priority
- 🟡 Medium priority / At risk
- 🟢 Low priority / On track
- ⚠️ Overdue warning
- 📅 Due today/tomorrow
- ✅ Completed tasks
- 🏃 Exercise
- 👥 Meetings
- 🧠 Mental health

### Empty States

Views handle empty data gracefully:
- "No open tasks! 🎉"
- "No active goals. Consider setting some!"
- Sections only appear if there's data

## When to Regenerate Views

Views should be regenerated:

1. **On demand** - Run `npm run views` anytime you want fresh data
2. **After bulk changes** - After syncing external data or batch operations
3. **For review sessions** - Before your weekly review or planning
4. **In automation** - Daily cron job or git pre-commit hook (future)

## Key Principles

✅ **Derived data** - Views are generated from events, never the source of truth
✅ **Regenerable** - Can be deleted and recreated anytime
✅ **Human-readable** - Markdown format for easy reading
✅ **Git-friendly** - Track changes to your life state over time
✅ **Zero dependencies** - Uses only Node.js built-ins

## Integration with Workflow

### Daily Usage

```bash
# Morning: Check what's on your plate
cat views/open-tasks.md

# Evening: Review what happened this week
cat views/weekly-review.md

# Monthly: Check goal progress
cat views/goals-status.md
```

### Git Tracking

Views can be committed to git to see how your life evolves:

```bash
git add views/
git commit -m "Weekly snapshot"
git log -p views/weekly-review.md  # See how your weeks changed
```

### MCP Integration

Views are perfect for Claude to read and discuss:

> "Read my open tasks and prioritize them"
> "Summarize my weekly review"
> "How am I tracking on my goals?"

## Future Enhancements

Potential additions for Phase 4 or beyond:

- **Custom date ranges** - Generate reviews for any period
- **Filtering** - Views filtered by area or project
- **Charts** - ASCII charts for trends (mood over time, exercise frequency)
- **Export formats** - PDF, HTML, or JSON in addition to markdown
- **Automated generation** - Git hooks or cron jobs
- **Aggregated views** - Monthly/quarterly/yearly summaries

## Development

When extending views:

```bash
# Watch mode (auto-rebuild)
npm run dev

# Make changes to tools/lib/views.ts

# Test your changes
npm run views

# Check the generated markdown
cat views/open-tasks.md
```

## Next Steps

Ready for **Phase 4: External Integrations**

Sync data from external services:
- Strava for exercise activities
- Fitbit for health metrics
- Other APIs as needed

Or start using the system daily:
- Log events through Claude (MCP)
- Generate views regularly
- Track your life!
