# Phase 1: Core Infrastructure ✅

Phase 1 is complete! The foundational event-sourcing infrastructure is now in place.

## What's Implemented

### 1. Project Structure
```
life-stream/
├── events/              # Event storage (append-only .jsonl files)
├── synced/              # External service events (strava/, fitbit/)
├── schema/              # Event type documentation
├── views/               # Generated summaries
├── tools/               # Core library and utilities
│   └── lib/
│       ├── types.ts     # TypeScript type definitions
│       ├── events.ts    # Read/write functions
│       ├── query.ts     # State derivation
│       └── index.ts     # Main exports
├── package.json
└── tsconfig.json
```

### 2. Core Library (`tools/lib/`)

#### Type Definitions (`types.ts`)
- Complete TypeScript interfaces for all event types
- Task, Meeting, Exercise, Investment, Health, Mental, Work, Goal events
- Type-safe event data structures
- Query filter interfaces

#### Event Functions (`events.ts`)
- `readEvents(filters?)` - Read and filter events from the stream
- `logEvent(type, data, options?)` - Append new events
- `generateId(prefix)` - Generate IDs for tasks and meetings (t-YYYYMMDD-NNN)
- `generateGoalId()` - Generate goal IDs (g-YYYY-NNN)
- Automatic timezone handling
- Reads from both `events/` and `synced/` directories

#### Query Functions (`query.ts`)
- `getOpenTasks()` - Get all incomplete tasks
- `getGoalStatus(goalId)` - Get status of a specific goal
- `getActiveGoals()` - Get all goals not yet achieved
- `getWeeklySummary()` - Summary of the past 7 days
- `queryEvents(filters)` - Custom event queries

### 3. Example Script

Run the example to test the system:

```bash
npm run example
```

This demonstrates:
- Logging a mental check-in
- Creating a task with auto-generated ID
- Logging an exercise session
- Reading events
- Querying open tasks
- Generating weekly summaries

## Usage

### Install Dependencies
```bash
npm install
```

### Build TypeScript
```bash
npm run build
```

### Use in Your Code
```typescript
import { logEvent, generateId, getOpenTasks } from './tools/lib/index.js';

// Log a simple event
await logEvent('mental.checkin', {
  mood: 8,
  energy: 7,
  anxiety: 2,
  notes: 'Feeling great!'
});

// Create a task
const taskId = await generateId('t');
await logEvent('task.created', {
  title: 'Build the MCP server',
  area: 'work',
  priority: 'high'
}, { id: taskId });

// Query tasks
const tasks = await getOpenTasks();
console.log(tasks);
```

## Event Storage

Events are stored in `events/YYYY-MM.jsonl` files:
```json
{"ts":"2026-01-12T11:23:09.672Z","type":"mental.checkin","source":"manual","data":{"mood":8,"energy":7,"anxiety":2,"notes":"Feeling productive today"}}
{"ts":"2026-01-12T11:23:09.678Z","type":"task.created","source":"manual","data":{"title":"Review the Q1 roadmap","area":"work","due":"2026-01-17","priority":"high"},"id":"t-20260112-001"}
```

Each line is a valid JSON object representing one event.

## Key Principles

✅ **Append-only** - Events are never edited or deleted
✅ **Type-safe** - Full TypeScript support
✅ **Queryable** - Derive current state by replaying events
✅ **Plain text** - Human-readable, git-friendly JSON Lines
✅ **Multi-source** - Support for manual and synced events

## Next Steps

Ready for **Phase 2: MCP Server** - Build the MCP server to enable Claude to interact with the life stream conversationally.
