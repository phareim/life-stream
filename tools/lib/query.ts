/**
 * Query utilities for deriving state from events
 */

import { readEvents } from './events.js';
import type { BaseEvent, Task, Goal, QueryFilters } from './types.js';

/**
 * Get all open tasks (not completed or abandoned)
 */
export async function getOpenTasks(): Promise<Task[]> {
  const events = await readEvents({ eventType: 'task' });
  const tasks: Record<string, Task> = {};

  for (const event of events) {
    const id = event.id;
    if (!id) continue;

    if (event.type === 'task.created') {
      tasks[id] = {
        id,
        title: event.data.title,
        area: event.data.area,
        due: event.data.due,
        priority: event.data.priority,
        status: 'open',
        created: event.ts,
      };
    } else if (event.type === 'task.completed' || event.type === 'task.abandoned') {
      if (tasks[id]) {
        tasks[id].status = 'closed';
      }
    }
  }

  return Object.values(tasks).filter(t => t.status === 'open');
}

/**
 * Get the status of a specific goal
 */
export async function getGoalStatus(goalId: string): Promise<Goal | null> {
  const events = await readEvents({ eventType: 'goal', id: goalId });

  if (events.length === 0) {
    return null;
  }

  const goal: Goal = {
    id: goalId,
    title: '',
    history: [],
  };

  for (const event of events) {
    if (event.type === 'goal.set') {
      goal.title = event.data.title || '';
      goal.horizon = event.data.horizon;
      goal.area = event.data.area;
      goal.target_date = event.data.target_date;
      goal.success_criteria = event.data.success_criteria;
    } else if (event.type === 'goal.progress') {
      goal.latest_status = event.data.status;
      goal.history.push(event);
    } else if (event.type === 'goal.revised') {
      // Update goal details if revised
      if (event.data.title) goal.title = event.data.title;
      if (event.data.target_date) goal.target_date = event.data.target_date;
      goal.history.push(event);
    } else if (event.type === 'goal.achieved') {
      goal.achieved = true;
      goal.achieved_at = event.ts;
    }
  }

  return goal;
}

/**
 * Get all active goals (not achieved or abandoned)
 */
export async function getActiveGoals(): Promise<Goal[]> {
  const events = await readEvents({ eventType: 'goal' });
  const goals: Record<string, Goal> = {};

  for (const event of events) {
    const id = event.id;
    if (!id) continue;

    if (!goals[id]) {
      goals[id] = {
        id,
        title: '',
        history: [],
      };
    }

    const goal = goals[id];

    if (event.type === 'goal.set') {
      goal.title = event.data.title || '';
      goal.horizon = event.data.horizon;
      goal.area = event.data.area;
      goal.target_date = event.data.target_date;
      goal.success_criteria = event.data.success_criteria;
    } else if (event.type === 'goal.progress') {
      goal.latest_status = event.data.status;
      goal.history.push(event);
    } else if (event.type === 'goal.revised') {
      if (event.data.title) goal.title = event.data.title;
      if (event.data.target_date) goal.target_date = event.data.target_date;
      goal.history.push(event);
    } else if (event.type === 'goal.achieved') {
      goal.achieved = true;
      goal.achieved_at = event.ts;
    } else if (event.type === 'goal.abandoned') {
      // Mark as achieved (inactive)
      goal.achieved = true;
    }
  }

  // Return only active goals (not achieved or abandoned)
  return Object.values(goals).filter(g => !g.achieved);
}

/**
 * Generate a weekly summary
 */
export async function getWeeklySummary(): Promise<{
  tasks_completed: BaseEvent[];
  tasks_created: BaseEvent[];
  meetings: BaseEvent[];
  exercise_sessions: BaseEvent[];
  work_hours: number;
  checkins: BaseEvent[];
}> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const events = await readEvents({ startDate: weekAgo.toISOString() });

  const summary = {
    tasks_completed: [] as BaseEvent[],
    tasks_created: [] as BaseEvent[],
    meetings: [] as BaseEvent[],
    exercise_sessions: [] as BaseEvent[],
    work_hours: 0,
    checkins: [] as BaseEvent[],
  };

  for (const event of events) {
    switch (event.type) {
      case 'task.completed':
        summary.tasks_completed.push(event);
        break;
      case 'task.created':
        summary.tasks_created.push(event);
        break;
      case 'meeting.completed':
        summary.meetings.push(event);
        break;
      case 'exercise.completed':
        summary.exercise_sessions.push(event);
        break;
      case 'work.logged':
      case 'work.stopped':
        summary.work_hours += (event.data.duration_min || 0) / 60;
        break;
      case 'mental.checkin':
        summary.checkins.push(event);
        break;
    }
  }

  return summary;
}

/**
 * Query events with custom filters and return raw events
 */
export async function queryEvents(filters: QueryFilters): Promise<BaseEvent[]> {
  return readEvents(filters);
}
