#!/usr/bin/env node

/**
 * Life Stream MCP Server
 *
 * Enables Claude to interact with the life stream conversationally.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  logEvent,
  generateId,
  generateGoalId,
  readEvents,
  getOpenTasks,
  getWeeklySummary,
  getActiveGoals,
  queryEvents,
} from './lib/index.js';

// Create the server instance
const server = new Server(
  {
    name: 'life-stream',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: log_event
// Append any event to the stream
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'log_event',
        description: 'Log any event to the life stream. Events are append-only and never edited.',
        inputSchema: {
          type: 'object',
          properties: {
            event_type: {
              type: 'string',
              description: 'Event type in domain.action format (e.g., task.created, exercise.completed)',
            },
            data: {
              type: 'object',
              description: 'Event data specific to the event type',
            },
            id: {
              type: 'string',
              description: 'Optional ID for entities that need it (tasks, meetings, goals). Use generate_id if needed.',
            },
            source: {
              type: 'string',
              description: 'Event source (defaults to "claude")',
              default: 'claude',
            },
          },
          required: ['event_type', 'data'],
        },
      },
      {
        name: 'query_events',
        description: 'Search and filter events by type, date range, source, or ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_type: {
              type: 'string',
              description: 'Filter by event type prefix (e.g., "task", "exercise.completed")',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 date string for start of range',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 date string for end of range',
            },
            source: {
              type: 'string',
              description: 'Filter by event source (manual, claude, strava, etc.)',
            },
            id: {
              type: 'string',
              description: 'Filter by entity ID (e.g., t-20260112-001)',
            },
          },
        },
      },
      {
        name: 'list_open_tasks',
        description: 'Get all tasks that are not yet completed or abandoned',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_summary',
        description: 'Generate a summary of recent activity (past 7 days)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as completed (convenience wrapper)',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to complete (e.g., t-20260112-001)',
            },
            notes: {
              type: 'string',
              description: 'Optional completion notes',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'add_task',
        description: 'Create a new task (convenience wrapper that auto-generates ID)',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
            },
            area: {
              type: 'string',
              description: 'Task area (work, personal, or project name)',
            },
            due: {
              type: 'string',
              description: 'Due date (ISO date format YYYY-MM-DD)',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority',
            },
          },
          required: ['title'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'log_event': {
        const { event_type, data, id, source } = args as {
          event_type: string;
          data: Record<string, any>;
          id?: string;
          source?: string;
        };

        const event = await logEvent(event_type, data, {
          id,
          source: source || 'claude',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  event,
                  message: `Logged ${event_type} event${id ? ` with ID ${id}` : ''}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'query_events': {
        const { event_type, start_date, end_date, source, id } = args as {
          event_type?: string;
          start_date?: string;
          end_date?: string;
          source?: string;
          id?: string;
        };

        const events = await queryEvents({
          eventType: event_type,
          startDate: start_date,
          endDate: end_date,
          source,
          id,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  count: events.length,
                  events,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_open_tasks': {
        const tasks = await getOpenTasks();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  count: tasks.length,
                  tasks,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_summary': {
        const summary = await getWeeklySummary();
        const goals = await getActiveGoals();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  period: 'past 7 days',
                  summary: {
                    tasks_created: summary.tasks_created.length,
                    tasks_completed: summary.tasks_completed.length,
                    meetings: summary.meetings.length,
                    exercise_sessions: summary.exercise_sessions.length,
                    work_hours: Math.round(summary.work_hours * 10) / 10,
                    mental_checkins: summary.checkins.length,
                  },
                  active_goals: goals.length,
                  details: {
                    tasks_completed: summary.tasks_completed,
                    tasks_created: summary.tasks_created,
                    meetings: summary.meetings,
                    exercise_sessions: summary.exercise_sessions,
                    checkins: summary.checkins,
                    goals,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'complete_task': {
        const { task_id, notes } = args as {
          task_id: string;
          notes?: string;
        };

        const data: Record<string, any> = {};
        if (notes) {
          data.notes = notes;
        }

        const event = await logEvent('task.completed', data, {
          id: task_id,
          source: 'claude',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task ${task_id} marked as completed`,
                  event,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'add_task': {
        const { title, area, due, priority } = args as {
          title: string;
          area?: string;
          due?: string;
          priority?: string;
        };

        const taskId = await generateId('t');
        const data: Record<string, any> = { title };
        if (area) data.area = area;
        if (due) data.due = due;
        if (priority) data.priority = priority;

        const event = await logEvent('task.created', data, {
          id: taskId,
          source: 'claude',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  task_id: taskId,
                  message: `Created task ${taskId}: ${title}`,
                  event,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Life Stream MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
