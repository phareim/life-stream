# MCP Server Setup for Claude Desktop

This guide shows how to configure Claude Desktop to use the Life Stream MCP server.

## Prerequisites

1. **Claude Desktop** installed on your machine
2. **Life Stream** repository built: `npm run build`

## Configuration

### 1. Locate Your Claude Desktop Config

The Claude Desktop configuration file is located at:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Add Life Stream MCP Server

Edit the config file to add the Life Stream server to the `mcpServers` section:

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

**Important**: Replace the paths with the absolute path to your life-stream repository.

### 3. Restart Claude Desktop

After saving the config file, completely quit and restart Claude Desktop for the changes to take effect.

## Verify Installation

Once Claude Desktop restarts, you should see the Life Stream tools available. You can verify by asking Claude:

> "What MCP tools do you have available?"

Claude should list these 6 tools:
- `log_event` - Log any event to the stream
- `query_events` - Search and filter events
- `list_open_tasks` - Get incomplete tasks
- `get_summary` - Get weekly activity summary
- `complete_task` - Mark a task as done
- `add_task` - Create a new task

## Usage Examples

Once configured, you can interact with your life stream naturally:

### Creating Tasks
> "Add a task to review the Q1 roadmap by Friday"

### Logging Events
> "Log that I just finished a 5km run that took 30 minutes"

### Querying Data
> "What tasks do I have open right now?"
> "Show me my exercise activity from this week"
> "Give me a summary of my week"

### Completing Tasks
> "Mark task t-20260112-001 as complete"

## Troubleshooting

### Server Not Appearing

1. Check that the path in your config is correct and absolute
2. Verify the MCP server file exists: `ls dist/tools/mcp-server.js`
3. Ensure you've built the project: `npm run build`
4. Completely quit Claude Desktop (not just close the window)

### Permission Errors

Ensure the MCP server is executable:
```bash
chmod +x dist/tools/mcp-server.js
```

### Path Issues

Make sure `LIFE_DIR` environment variable points to your repository root, where the `events/` directory should be created.

### Check Logs

Claude Desktop logs MCP server output. Check the logs:
- **macOS**: `~/Library/Logs/Claude/mcp-server-life-stream.log`
- **Windows**: `%LOCALAPPDATA%\Claude\logs\mcp-server-life-stream.log`

## Development Mode

When developing the MCP server, you need to rebuild after changes:

```bash
npm run build
```

Then restart Claude Desktop to pick up the changes.

For faster development, you can run the dev script in a separate terminal:
```bash
npm run dev
```

This will watch for TypeScript changes and rebuild automatically. You still need to restart Claude Desktop to pick up the changes.

## Testing Without Claude Desktop

You can test the MCP server tools directly:

```bash
npm run build
node dist/tools/test-mcp.js
```

This runs all 6 tools and verifies they work correctly.
