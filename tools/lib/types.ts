/**
 * Type definitions for Life Stream events
 */

// Base event structure
export interface BaseEvent {
  ts: string; // ISO 8601 timestamp with timezone
  type: string;
  source: string; // manual|claude|strava|fitbit|etc
  id?: string; // Required for updatable entities (tasks, meetings, goals)
  data: Record<string, any>;
}

// Event type unions for type safety
export type EventType =
  | TaskEventType
  | MeetingEventType
  | ExerciseEventType
  | InvestmentEventType
  | HealthEventType
  | MentalEventType
  | WorkEventType
  | GoalEventType;

// Task Events
export type TaskEventType =
  | 'task.created'
  | 'task.started'
  | 'task.blocked'
  | 'task.completed'
  | 'task.abandoned';

export interface TaskData {
  title: string;
  area?: string; // work | personal | project name
  project?: string;
  due?: string; // ISO date
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  reason?: string; // For blocked/abandoned
}

// Meeting Events
export type MeetingEventType =
  | 'meeting.scheduled'
  | 'meeting.completed'
  | 'meeting.cancelled';

export interface MeetingData {
  title: string;
  with?: string[];
  duration_min?: number;
  location?: string;
  notes?: string;
  action_items?: string[]; // Task IDs
  energy?: 'high' | 'neutral' | 'draining';
}

// Exercise Events
export type ExerciseEventType = 'exercise.completed' | 'exercise.planned';

export interface ExerciseData {
  activity: 'run' | 'cycle' | 'swim' | 'strength' | 'walk' | 'ski' | 'other';
  duration_min?: number;
  distance_km?: number;
  avg_hr?: number;
  notes?: string;
  strava_id?: string;
}

// Investment Events
export type InvestmentEventType =
  | 'investment.buy'
  | 'investment.sell'
  | 'investment.dividend'
  | 'investment.snapshot';

export interface InvestmentData {
  asset?: string; // Ticker or name
  quantity?: number;
  price_nok?: number;
  account?: string;
  realized_gain_nok?: number;
  total_nok?: number;
  breakdown?: Record<string, number>;
}

// Health Events
export type HealthEventType =
  | 'health.weight'
  | 'health.sleep'
  | 'health.blood_pressure'
  | 'health.note';

export interface HealthData {
  // Weight
  value?: number;
  unit?: string;
  // Sleep
  duration_min?: number;
  quality?: string;
  deep_min?: number;
  rem_min?: number;
  // Blood pressure
  systolic?: number;
  diastolic?: number;
  // Note
  note?: string;
}

// Mental Health Events
export type MentalEventType =
  | 'mental.checkin'
  | 'mental.gratitude'
  | 'mental.reflection';

export interface MentalData {
  // Check-in
  mood?: number; // 1-10
  energy?: number; // 1-10
  anxiety?: number; // 0-10
  notes?: string;
  // Gratitude
  items?: string[];
  // Reflection
  trigger?: string;
  thought?: string;
  reframe?: string;
}

// Work Events
export type WorkEventType = 'work.started' | 'work.stopped' | 'work.logged';

export interface WorkData {
  project?: string;
  task_id?: string;
  duration_min?: number;
  description?: string;
  billable?: boolean;
}

// Goal Events
export type GoalEventType =
  | 'goal.set'
  | 'goal.progress'
  | 'goal.revised'
  | 'goal.achieved'
  | 'goal.abandoned';

export interface GoalData {
  title?: string;
  horizon?: 'week' | 'month' | 'quarter' | 'year' | 'ongoing';
  area?: string;
  target_date?: string;
  success_criteria?: string;
  status?: 'on_track' | 'at_risk' | 'behind';
  reason?: string; // For abandoned
}

// Typed event interfaces
export interface TaskEvent extends BaseEvent {
  type: TaskEventType;
  id: string;
  data: TaskData;
}

export interface MeetingEvent extends BaseEvent {
  type: MeetingEventType;
  id: string;
  data: MeetingData;
}

export interface ExerciseEvent extends BaseEvent {
  type: ExerciseEventType;
  data: ExerciseData;
}

export interface GoalEvent extends BaseEvent {
  type: GoalEventType;
  id: string;
  data: GoalData;
}

// ID prefixes
export type IDPrefix = 't' | 'm' | 'g';

// Query filters
export interface QueryFilters {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  source?: string;
  id?: string;
}

// Task status
export interface Task {
  id: string;
  title: string;
  area?: string;
  due?: string;
  priority?: string;
  status: 'open' | 'closed';
  created: string;
}

// Goal status
export interface Goal {
  id: string;
  title: string;
  horizon?: string;
  area?: string;
  target_date?: string;
  success_criteria?: string;
  latest_status?: string;
  achieved?: boolean;
  achieved_at?: string;
  history: BaseEvent[];
}
