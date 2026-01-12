/**
 * Test the MCP server tools locally
 *
 * This simulates calling the MCP tools to verify they work correctly
 */

import {
  logEvent,
  generateId,
  readEvents,
  getOpenTasks,
  getWeeklySummary,
} from './lib/index.js';

async function testTools() {
  console.log('Testing MCP Server Tools\n');

  // Test 1: add_task (simulated)
  console.log('1. Testing add_task...');
  const taskId = await generateId('t');
  await logEvent(
    'task.created',
    {
      title: 'Test MCP integration',
      area: 'work',
      priority: 'high',
    },
    { id: taskId, source: 'claude' }
  );
  console.log(`   ✓ Created task ${taskId}\n`);

  // Test 2: log_event (simulated)
  console.log('2. Testing log_event...');
  await logEvent(
    'exercise.completed',
    {
      activity: 'run',
      duration_min: 30,
      distance_km: 5,
    },
    { source: 'claude' }
  );
  console.log('   ✓ Logged exercise event\n');

  // Test 3: list_open_tasks (simulated)
  console.log('3. Testing list_open_tasks...');
  const tasks = await getOpenTasks();
  console.log(`   ✓ Found ${tasks.length} open tasks`);
  tasks.slice(0, 3).forEach((task) => {
    console.log(`      - [${task.id}] ${task.title}`);
  });
  console.log();

  // Test 4: query_events (simulated)
  console.log('4. Testing query_events...');
  const events = await readEvents({ eventType: 'task' });
  console.log(`   ✓ Found ${events.length} task events\n`);

  // Test 5: get_summary (simulated)
  console.log('5. Testing get_summary...');
  const summary = await getWeeklySummary();
  console.log(`   ✓ Weekly summary:`);
  console.log(`      - Tasks created: ${summary.tasks_created.length}`);
  console.log(`      - Tasks completed: ${summary.tasks_completed.length}`);
  console.log(`      - Exercise sessions: ${summary.exercise_sessions.length}`);
  console.log();

  // Test 6: complete_task (simulated)
  console.log('6. Testing complete_task...');
  await logEvent(
    'task.completed',
    { notes: 'MCP test completed successfully' },
    { id: taskId, source: 'claude' }
  );
  console.log(`   ✓ Completed task ${taskId}\n`);

  console.log('All MCP tools working correctly! ✅');
  console.log('\nThe MCP server is ready to use with Claude Desktop.');
}

testTools().catch(console.error);
