/**
 * Core event read/write functions
 */

import { readFile, appendFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { BaseEvent, IDPrefix, QueryFilters } from './types.js';

// Path to the root of the life stream directory
// Defaults to the repository root (two levels up from dist/tools/lib or three from tools/lib)
const getLifeDir = () => {
  if (process.env.LIFE_DIR) {
    return process.env.LIFE_DIR;
  }
  const currentFile = import.meta.url.replace('file://', '');
  // If we're in dist/tools/lib, go up 3 levels
  // If we're in tools/lib, go up 2 levels
  const libDir = dirname(currentFile);
  const toolsDir = dirname(libDir);
  const rootDir = dirname(toolsDir);

  // Check if we're in dist/ and need to go up one more level
  if (rootDir.endsWith('dist')) {
    return dirname(rootDir);
  }
  return rootDir;
};

const LIFE_DIR = getLifeDir();
const EVENTS_DIR = join(LIFE_DIR, 'events');
const SYNCED_DIR = join(LIFE_DIR, 'synced');

/**
 * Read all events from the event stream
 */
export async function readEvents(filters?: QueryFilters): Promise<BaseEvent[]> {
  const events: BaseEvent[] = [];

  // Read from events directory
  await readEventsFromDir(EVENTS_DIR, events, filters);

  // Read from synced directories (strava, fitbit, etc.)
  if (existsSync(SYNCED_DIR)) {
    const syncedServices = await readdir(SYNCED_DIR, { withFileTypes: true });
    for (const service of syncedServices) {
      if (service.isDirectory()) {
        await readEventsFromDir(join(SYNCED_DIR, service.name), events, filters);
      }
    }
  }

  // Sort by timestamp
  events.sort((a, b) => a.ts.localeCompare(b.ts));

  return events;
}

/**
 * Read events from a specific directory
 */
async function readEventsFromDir(
  dir: string,
  events: BaseEvent[],
  filters?: QueryFilters
): Promise<void> {
  if (!existsSync(dir)) {
    return;
  }

  const files = await readdir(dir);
  const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort();

  for (const file of jsonlFiles) {
    const content = await readFile(join(dir, file), 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as BaseEvent;

        // Apply filters
        if (filters?.eventType && !event.type.startsWith(filters.eventType)) {
          continue;
        }
        if (filters?.startDate && event.ts < filters.startDate) {
          continue;
        }
        if (filters?.endDate && event.ts > filters.endDate) {
          continue;
        }
        if (filters?.source && event.source !== filters.source) {
          continue;
        }
        if (filters?.id && event.id !== filters.id) {
          continue;
        }

        events.push(event);
      } catch (err) {
        console.error(`Failed to parse event line in ${file}:`, line, err);
      }
    }
  }
}

/**
 * Log an event to the stream
 */
export async function logEvent(
  eventType: string,
  data: Record<string, any>,
  options?: {
    id?: string;
    source?: string;
    timestamp?: string;
  }
): Promise<BaseEvent> {
  const now = options?.timestamp || new Date().toISOString();
  const event: BaseEvent = {
    ts: now,
    type: eventType,
    source: options?.source || 'manual',
    data,
  };

  if (options?.id) {
    event.id = options.id;
  }

  // Determine the file to write to (YYYY-MM.jsonl)
  const date = new Date(now);
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const filename = join(EVENTS_DIR, `${yearMonth}.jsonl`);

  // Ensure events directory exists
  if (!existsSync(EVENTS_DIR)) {
    await mkdir(EVENTS_DIR, { recursive: true });
  }

  // Append the event
  await appendFile(filename, JSON.stringify(event) + '\n', 'utf-8');

  return event;
}

/**
 * Generate an ID for an entity
 * Format: {prefix}-YYYYMMDD-NNN (e.g., t-20260112-001)
 */
export async function generateId(prefix: IDPrefix): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Count existing IDs for today
  const events = await readEvents();
  const existingIds = events
    .filter(e => e.id?.startsWith(`${prefix}-${dateStr}`))
    .map(e => e.id!);

  const nextNum = existingIds.length + 1;
  return `${prefix}-${dateStr}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Generate a goal ID
 * Format: g-YYYY-NNN (e.g., g-2026-001)
 */
export async function generateGoalId(): Promise<string> {
  const year = new Date().getFullYear();

  // Count existing goal IDs for this year
  const events = await readEvents({ eventType: 'goal' });
  const existingIds = events
    .filter(e => e.id?.startsWith(`g-${year}`))
    .map(e => e.id!);

  const nextNum = existingIds.length + 1;
  return `g-${year}-${String(nextNum).padStart(3, '0')}`;
}
