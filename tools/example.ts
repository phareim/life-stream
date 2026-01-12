/**
 * Example usage of the Life Stream library
 *
 * Run with: node dist/tools/example.js
 */

import { logEvent, generateId, readEvents, getOpenTasks, getWeeklySummary } from './lib/index.js';

async function main() {
  console.log('Life Stream - Example Usage\n');

  // Example 1: Log a simple event
  console.log('1. Logging a mental check-in...');
  await logEvent('mental.checkin', {
    mood: 8,
    energy: 7,
    anxiety: 2,
    notes: 'Feeling productive today',
  });
  console.log('   ✓ Logged\n');

  // Example 2: Create a task with generated ID
  console.log('2. Creating a new task...');
  const taskId = await generateId('t');
  await logEvent('task.created', {
    title: 'Review the Q1 roadmap',
    area: 'work',
    due: '2026-01-17',
    priority: 'high',
  }, { id: taskId });
  console.log(`   ✓ Created task ${taskId}\n`);

  // Example 3: Log an exercise session
  console.log('3. Logging an exercise session...');
  await logEvent('exercise.completed', {
    activity: 'run',
    duration_min: 35,
    distance_km: 6.2,
    notes: 'Morning run, felt great',
  });
  console.log('   ✓ Logged\n');

  // Example 4: Query all events
  console.log('4. Reading all events...');
  const allEvents = await readEvents();
  console.log(`   Found ${allEvents.length} events\n`);

  // Example 5: Get open tasks
  console.log('5. Fetching open tasks...');
  const openTasks = await getOpenTasks();
  console.log(`   Found ${openTasks.length} open tasks:`);
  openTasks.forEach(task => {
    console.log(`   - [${task.id}] ${task.title} (${task.area || 'uncategorized'})`);
  });
  console.log();

  // Example 6: Get weekly summary
  console.log('6. Generating weekly summary...');
  const summary = await getWeeklySummary();
  console.log(`   - Tasks created: ${summary.tasks_created.length}`);
  console.log(`   - Tasks completed: ${summary.tasks_completed.length}`);
  console.log(`   - Exercise sessions: ${summary.exercise_sessions.length}`);
  console.log(`   - Work hours: ${summary.work_hours.toFixed(1)}`);
  console.log(`   - Mental check-ins: ${summary.checkins.length}`);
  console.log();

  console.log('Done! Check the events/ directory for the logged events.');
}

main().catch(console.error);
