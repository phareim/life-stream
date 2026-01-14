/**
 * View generation utilities - create markdown views from event stream
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getOpenTasks, getActiveGoals, getWeeklySummary } from './query.js';
import type { Task, Goal } from './types.js';

/**
 * Get the views directory path
 */
function getViewsDir(): string {
  return process.env.LIFE_DIR
    ? join(process.env.LIFE_DIR, 'views')
    : join(process.cwd(), 'views');
}

/**
 * Format a date string for display
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Generate the open tasks view
 */
export async function generateOpenTasksView(): Promise<string> {
  const tasks = await getOpenTasks();

  let md = '# Open Tasks\n\n';
  md += `*Last updated: ${new Date().toLocaleString()}*\n\n`;

  if (tasks.length === 0) {
    md += 'No open tasks! 🎉\n';
    return md;
  }

  // Group by area
  const byArea: Record<string, Task[]> = {};
  for (const task of tasks) {
    const area = task.area || 'uncategorized';
    if (!byArea[area]) {
      byArea[area] = [];
    }
    byArea[area].push(task);
  }

  // Sort areas alphabetically
  const sortedAreas = Object.keys(byArea).sort();

  for (const area of sortedAreas) {
    md += `## ${area}\n\n`;

    // Sort tasks by due date (tasks without due date at the end)
    const areaTasks = byArea[area].sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });

    for (const task of areaTasks) {
      let line = `- [ ] **${task.title}**`;

      if (task.priority) {
        const priorityEmoji = {
          urgent: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢',
        }[task.priority] || '';
        line += ` ${priorityEmoji}`;
      }

      if (task.due) {
        const dueDate = formatDate(task.due);
        const daysUntil = Math.ceil((new Date(task.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let dueSuffix = '';
        if (daysUntil < 0) {
          dueSuffix = ' ⚠️ OVERDUE';
        } else if (daysUntil === 0) {
          dueSuffix = ' 📅 TODAY';
        } else if (daysUntil === 1) {
          dueSuffix = ' 📅 TOMORROW';
        }
        line += ` *(due: ${dueDate}${dueSuffix})*`;
      }

      line += ` \`${task.id}\`\n`;
      md += line;
    }

    md += '\n';
  }

  md += `---\n\n*Total open tasks: ${tasks.length}*\n`;

  return md;
}

/**
 * Generate the goals status view
 */
export async function generateGoalsView(): Promise<string> {
  const goals = await getActiveGoals();

  let md = '# Active Goals\n\n';
  md += `*Last updated: ${new Date().toLocaleString()}*\n\n`;

  if (goals.length === 0) {
    md += 'No active goals. Consider setting some!\n';
    return md;
  }

  // Group by horizon
  const byHorizon: Record<string, Goal[]> = {};
  for (const goal of goals) {
    const horizon = goal.horizon || 'unspecified';
    if (!byHorizon[horizon]) {
      byHorizon[horizon] = [];
    }
    byHorizon[horizon].push(goal);
  }

  // Sort by horizon (week -> month -> quarter -> year -> ongoing -> unspecified)
  const horizonOrder = ['week', 'month', 'quarter', 'year', 'ongoing', 'unspecified'];
  const sortedHorizons = Object.keys(byHorizon).sort((a, b) => {
    return horizonOrder.indexOf(a) - horizonOrder.indexOf(b);
  });

  for (const horizon of sortedHorizons) {
    md += `## ${horizon.charAt(0).toUpperCase() + horizon.slice(1)}\n\n`;

    for (const goal of byHorizon[horizon]) {
      md += `### ${goal.title}\n\n`;
      md += `- **ID:** \`${goal.id}\`\n`;

      if (goal.area) {
        md += `- **Area:** ${goal.area}\n`;
      }

      if (goal.target_date) {
        md += `- **Target:** ${formatDate(goal.target_date)}\n`;
      }

      if (goal.success_criteria) {
        md += `- **Success criteria:** ${goal.success_criteria}\n`;
      }

      if (goal.latest_status) {
        const statusEmoji = {
          on_track: '🟢',
          at_risk: '🟡',
          behind: '🔴',
        }[goal.latest_status] || '';
        md += `- **Status:** ${statusEmoji} ${goal.latest_status.replace('_', ' ')}\n`;
      }

      if (goal.history.length > 0) {
        md += `- **Updates:** ${goal.history.length}\n`;
      }

      md += '\n';
    }
  }

  md += `---\n\n*Total active goals: ${goals.length}*\n`;

  return md;
}

/**
 * Generate the weekly review view
 */
export async function generateWeeklyReviewView(): Promise<string> {
  const summary = await getWeeklySummary();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  let md = '# Weekly Review\n\n';
  md += `*${formatDate(startDate.toISOString())} - ${formatDate(new Date().toISOString())}*\n\n`;

  // Overview
  md += '## Overview\n\n';
  md += `- **Tasks created:** ${summary.tasks_created.length}\n`;
  md += `- **Tasks completed:** ${summary.tasks_completed.length}\n`;
  md += `- **Meetings:** ${summary.meetings.length}\n`;
  md += `- **Exercise sessions:** ${summary.exercise_sessions.length}\n`;
  md += `- **Work hours:** ${summary.work_hours.toFixed(1)}h\n`;
  md += `- **Check-ins:** ${summary.checkins.length}\n\n`;

  // Tasks completed
  if (summary.tasks_completed.length > 0) {
    md += '## ✅ Tasks Completed\n\n';
    for (const event of summary.tasks_completed) {
      const title = event.data.title || 'Untitled task';
      const date = formatDate(event.ts);
      md += `- ${title} *(${date})* \`${event.id}\`\n`;
    }
    md += '\n';
  }

  // Exercise
  if (summary.exercise_sessions.length > 0) {
    md += '## 🏃 Exercise\n\n';
    let totalDistance = 0;
    let totalDuration = 0;

    for (const event of summary.exercise_sessions) {
      const activity = event.data.activity || 'unknown';
      const duration = event.data.duration_min || 0;
      const distance = event.data.distance_km || 0;
      const date = formatDate(event.ts);

      totalDuration += duration;
      totalDistance += distance;

      let line = `- **${activity}**: ${duration} min`;
      if (distance > 0) {
        line += `, ${distance} km`;
      }
      line += ` *(${date})*\n`;
      md += line;
    }

    md += `\n**Total:** ${totalDuration} min`;
    if (totalDistance > 0) {
      md += `, ${totalDistance.toFixed(1)} km`;
    }
    md += '\n\n';
  }

  // Meetings
  if (summary.meetings.length > 0) {
    md += '## 👥 Meetings\n\n';
    for (const event of summary.meetings) {
      const title = event.data.title || 'Untitled meeting';
      const duration = event.data.duration_min ? `${event.data.duration_min} min` : '';
      const date = formatDate(event.ts);
      md += `- ${title} ${duration ? `(${duration})` : ''} *(${date})*\n`;
    }
    md += '\n';
  }

  // Mental health check-ins
  if (summary.checkins.length > 0) {
    md += '## 🧠 Mental Health\n\n';

    let totalMood = 0;
    let totalEnergy = 0;
    let totalAnxiety = 0;

    for (const event of summary.checkins) {
      totalMood += event.data.mood || 0;
      totalEnergy += event.data.energy || 0;
      totalAnxiety += event.data.anxiety || 0;
    }

    const count = summary.checkins.length;
    md += `- **Average mood:** ${(totalMood / count).toFixed(1)}/10\n`;
    md += `- **Average energy:** ${(totalEnergy / count).toFixed(1)}/10\n`;
    md += `- **Average anxiety:** ${(totalAnxiety / count).toFixed(1)}/10\n\n`;
  }

  return md;
}

/**
 * Generate all views and write to files
 */
export async function generateAllViews(): Promise<void> {
  const viewsDir = getViewsDir();

  const openTasks = await generateOpenTasksView();
  await writeFile(join(viewsDir, 'open-tasks.md'), openTasks, 'utf-8');

  const goals = await generateGoalsView();
  await writeFile(join(viewsDir, 'goals-status.md'), goals, 'utf-8');

  const weeklyReview = await generateWeeklyReviewView();
  await writeFile(join(viewsDir, 'weekly-review.md'), weeklyReview, 'utf-8');
}
