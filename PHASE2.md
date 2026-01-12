# Phase 2: MCP Server ✅

Phase 2 is complete! You can now interact with your Life Stream through Claude Desktop.

## What's Implemented

### MCP Server (`tools/mcp-server.ts`)

A fully functional Model Context Protocol server that enables Claude to interact with your life stream conversationally.

### 6 Required Tools

#### 1. `log_event`
Log any event to the stream. The most flexible tool for recording any type of event.

**Parameters:**
- `event_type` - Event type (e.g., `mental.checkin`, `exercise.completed`)
- `data` - Event-specific data object
- `id` - Optional entity ID
- `source` - Event source (defaults to `claude`)

**Example:**
> "Log that I just did a 5km run in 30 minutes"

#### 2. `query_events`
Search and filter events by various criteria.

**Parameters:**
- `event_type` - Filter by type prefix (e.g., `task`, `exercise`)
- `start_date` - ISO date for range start
- `end_date` - ISO date for range end
- `source` - Filter by source
- `id` - Filter by entity ID

**Example:**
> "Show me all my exercise sessions from last week"

#### 3. `list_open_tasks`
Get all tasks that haven't been completed or abandoned.

**Example:**
> "What tasks do I have open?"

#### 4. `get_summary`
Generate a weekly summary of activity across all domains.

Returns counts and details for:
- Tasks created/completed
- Meetings
- Exercise sessions
- Work hours logged
- Mental health check-ins
- Active goals

**Example:**
> "Give me a summary of my week"

#### 5. `complete_task`
Mark a task as completed (convenience wrapper).

**Parameters:**
- `task_id` - Task ID to complete
- `notes` - Optional completion notes

**Example:**
> "Mark task t-20260112-001 as complete"

#### 6. `add_task`
Create a new task with auto-generated ID (convenience wrapper).

**Parameters:**
- `title` - Task title (required)
- `area` - Task area (work, personal, project name)
- `due` - Due date (YYYY-MM-DD)
- `priority` - low, medium, high, urgent

**Example:**
> "Add a task to review the Q1 roadmap by Friday"

## File Structure

```
tools/
├── mcp-server.ts       # MCP server implementation
├── test-mcp.ts         # Test script for MCP tools
└── lib/                # Core library (from Phase 1)
```

## Testing

### Test All Tools
```bash
npm run test-mcp
```

This simulates calling all 6 MCP tools and verifies they work correctly.

### Test Output
```
Testing MCP Server Tools

1. Testing add_task...
   ✓ Created task t-20260112-003

2. Testing log_event...
   ✓ Logged exercise event

3. Testing list_open_tasks...
   ✓ Found 3 open tasks

4. Testing query_events...
   ✓ Found 3 task events

5. Testing get_summary...
   ✓ Weekly summary:
      - Tasks created: 3
      - Tasks completed: 0
      - Exercise sessions: 3

6. Testing complete_task...
   ✓ Completed task t-20260112-003

All MCP tools working correctly! ✅
```

## Claude Desktop Configuration

See [MCP-SETUP.md](./MCP-SETUP.md) for detailed setup instructions.

### Quick Start

1. **Edit Claude Desktop config** at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add this configuration:**
```json
{
  "mcpServers": {
    "life-stream": {
      "command": "node",
      "args": [
        "/Users/petter/github/petter/life-stream/dist/tools/mcp-server.js"
      ],
      "env": {
        "LIFE_DIR": "/Users/petter/github/petter/life-stream"
      }
    }
  }
}
```

3. **Restart Claude Desktop** completely (quit and reopen)

4. **Verify** by asking Claude: "What MCP tools do you have available?"

## Usage Examples

Once configured in Claude Desktop, you can:

**Log activities naturally:**
> "I just finished a 45 minute bike ride, about 15km"

**Manage tasks:**
> "Add a task to prepare slides for Monday's presentation"
> "What are my open tasks?"
> "Mark task t-20260112-003 as done"

**Track mental health:**
> "Log a mental check-in: mood 8, energy 7, anxiety 2"

**Query history:**
> "Show me all my workouts this month"
> "What did I work on last week?"

**Get insights:**
> "Give me a weekly summary"
> "How many tasks have I completed this week?"

## Key Features

✅ **Conversational interface** - Talk to Claude naturally about your life
✅ **Type-safe** - Full TypeScript implementation with strong types
✅ **Tested** - All tools verified working
✅ **Error handling** - Graceful error messages
✅ **Source tracking** - All Claude-logged events tagged with `source: "claude"`
✅ **Auto ID generation** - Tasks and meetings get sequential IDs automatically

## Next Steps

Ready for **Phase 3: View Generation** - Create markdown views for open tasks, weekly reviews, and goal status. Or start using the MCP server in Claude Desktop right away!

## Development

When making changes to the MCP server:

```bash
# Watch mode (rebuilds on changes)
npm run dev

# In another terminal, test your changes
npm run test-mcp
```

Remember to restart Claude Desktop after rebuilding to pick up changes.
