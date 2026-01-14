# life-stream
Life. Annotated.

An event-sourced personal life management system built on append-only principles. Track tasks, goals, exercise, mental health, work time, and more—all as an immutable stream of events.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run example
npm run example

# Test MCP server
npm run test-mcp

# Generate views
npm run views

# Sync external data (requires API credentials)
npm run sync
```

## 📖 Documentation

- **[REQUIREMENTS.md](./REQUIREMENTS.md)** - System vision and event schema
- **[CLAUDE.md](./CLAUDE.md)** - Instructions for working with this codebase
- **[PHASE1.md](./PHASE1.md)** - Core infrastructure (complete ✅)
- **[PHASE2.md](./PHASE2.md)** - MCP server (complete ✅)
- **[PHASE3.md](./PHASE3.md)** - View generation (complete ✅)
- **[PHASE4.md](./PHASE4.md)** - External integrations (complete ✅)
- **[MCP-SETUP.md](./MCP-SETUP.md)** - Configure Claude Desktop

## 🎯 Features

### Phase 1: Core Infrastructure ✅
- Event read/write functions
- Query and filtering
- ID generation
- Task and goal state derivation
- Weekly summaries

### Phase 2: MCP Server ✅
- 6 MCP tools for Claude interaction
- `add_task`, `complete_task`, `list_open_tasks`
- `log_event`, `query_events`, `get_summary`
- Full Claude Desktop integration

### Phase 3: View Generation ✅
- Open tasks markdown view
- Weekly review reports
- Goal status dashboard
- Auto-regeneration script (`npm run views`)

### Phase 4: External Sync ✅
- Strava activity sync (`npm run sync:strava`)
- Fitbit health data sync (`npm run sync:fitbit`)
- Idempotent, incremental sync operations
- OAuth token refresh handling

## 🔧 Usage with Claude

After setting up the MCP server (see [MCP-SETUP.md](./MCP-SETUP.md)), you can interact naturally:

> "Add a task to review the Q1 roadmap by Friday"

> "Log that I just did a 5km run in 30 minutes"

> "What tasks do I have open?"

> "Give me a summary of my week"

## 📦 Project Structure

```
life-stream/
├── events/              # Your life events (.jsonl files)
├── synced/              # External service data
├── schema/              # Event type documentation
├── views/               # Generated summaries
├── tools/
│   ├── lib/            # Core library
│   ├── mcp-server.ts   # MCP server
│   ├── example.ts      # Usage examples
│   └── test-mcp.ts     # MCP tool tests
├── REQUIREMENTS.md      # System requirements
├── CLAUDE.md            # Developer guide
└── MCP-SETUP.md         # Claude Desktop setup
```

## 💡 Philosophy

1. **Append-only** - Events are never edited or deleted
2. **Source of truth** - The event stream is primary; views are derived
3. **Multi-source** - Manual entry, Claude, or external services
4. **Evolvable** - Add new event types without migrations
5. **Plain text** - Human-readable, git-friendly JSON Lines

## 📝 Example

```typescript
import { logEvent, generateId, getOpenTasks } from './tools/lib/index.js';

// Create a task
const taskId = await generateId('t');
await logEvent('task.created', {
  title: 'Build the future',
  area: 'work',
  priority: 'high'
}, { id: taskId });

// Query tasks
const tasks = await getOpenTasks();
console.log(tasks);
```

## 🧪 Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Test tools
npm run test-mcp

# Run example
npm run example
```

## 📄 License

MIT 
