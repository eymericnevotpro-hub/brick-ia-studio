// Simple recurring daily tasks with per-weekday scheduling + discipline stats.
// All data lives in localStorage (and syncs via the shared space).

export interface Task {
  id: string;
  label: string;
  emoji: string;
  days: number[]; // weekdays the task is active (0=Sun … 6=Sat). Empty = every day.
  // Day the task started counting (YYYY-MM-DD). A task never affects days
  // before this, so adding a task can't retroactively break past perfect days.
  // Missing = counts for all history (legacy default tasks).
  createdAt?: string;
}

export const WEEKDAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const WEEKDAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // display Mon→Sun

export const DEFAULT_TASKS: Task[] = [
  { id: "sport", label: "Sport", emoji: "🏃", days: [1, 3, 5] },
  { id: "deep", label: "2h de deep work", emoji: "⚡", days: [1, 2, 3, 4, 5] },
  { id: "lecture", label: "Lire 10 min", emoji: "📖", days: [] },
  { id: "eau", label: "Boire 1,5 L d'eau", emoji: "💧", days: [] },
];

export function taskUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function taskTodayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isTaskActiveOn(task: Task, weekday: number): boolean {
  return task.days.length === 0 || task.days.includes(weekday);
}

// Whether a task already existed on (and applies to) a given date.
export function taskAppliesOn(task: Task, date: Date): boolean {
  if (task.createdAt && taskTodayIso(date) < task.createdAt) return false;
  return isTaskActiveOn(task, date.getDay());
}

export function tasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter((t) => taskAppliesOn(t, date));
}

export function dayLabelLong(d = new Date()): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// completions: dateISO -> array of done task ids
export type Completions = Record<string, string[]>;

export interface DayStat {
  iso: string;
  date: Date;
  scheduled: number;
  done: number;
  ratio: number; // 0..1
}

export function lastDaysStats(tasks: Task[], done: Completions, nDays: number, from = new Date()): DayStat[] {
  const out: DayStat[] = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    const iso = taskTodayIso(d);
    const scheduled = tasksForDate(tasks, d);
    const doneIds = done[iso] || [];
    const doneCount = scheduled.filter((t) => doneIds.includes(t.id)).length;
    out.push({
      iso,
      date: d,
      scheduled: scheduled.length,
      done: doneCount,
      ratio: scheduled.length ? doneCount / scheduled.length : 0,
    });
  }
  return out;
}

// Streak = consecutive days (ending today) where every scheduled task was done.
// Days with no scheduled task don't break the streak (they're skipped).
export function currentStreak(tasks: Task[], done: Completions, from = new Date()): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    const iso = taskTodayIso(d);
    const scheduled = tasksForDate(tasks, d);
    if (scheduled.length === 0) continue; // rest day, doesn't count or break
    const doneIds = done[iso] || [];
    const allDone = scheduled.every((t) => doneIds.includes(t.id));
    if (allDone) streak++;
    else {
      // today not-yet-complete shouldn't break a streak that's otherwise intact
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export interface TaskScore {
  task: Task;
  done: number;
  scheduled: number;
  pct: number;
}

export function perTaskScores(tasks: Task[], done: Completions, nDays: number, from = new Date()): TaskScore[] {
  return tasks.map((task) => {
    let sched = 0;
    let d = 0;
    for (let i = 0; i < nDays; i++) {
      const day = new Date(from);
      day.setDate(from.getDate() - i);
      if (!taskAppliesOn(task, day)) continue;
      sched++;
      if ((done[taskTodayIso(day)] || []).includes(task.id)) d++;
    }
    return { task, done: d, scheduled: sched, pct: sched ? d / sched : 0 };
  });
}

export const EMOJI_CHOICES = ["🏃", "⚡", "📖", "💧", "🧘", "🥗", "💪", "🎯", "🧠", "🌙", "☀️", "✍️", "📵", "🚭", "💼", "🎨"];
