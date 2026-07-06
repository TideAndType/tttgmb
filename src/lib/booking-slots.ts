// Availability + slot generation for booking calendars. Times are the
// business's wall-clock (the calendar's timezone label); slots are generated
// per day and returned as {date, time} pairs the visitor picks from.

export interface Window { start: string; end: string; } // "HH:mm"
export type Availability = Record<string, Window[]>; // weekday key -> windows

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function fromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
export function pad(n: number) { return String(n).padStart(2, "0"); }
export function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// Combine a "YYYY-MM-DD" + "HH:mm" into a Date (UTC-based, stable across hosts).
export function slotToDate(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
}

export interface DaySlots { date: string; label: string; slots: string[]; }

export function generateSlots(
  availability: Availability,
  durationMin: number,
  bufferMin: number,
  leadDays: number,
  booked: { startAt: Date }[],
  now: Date = new Date()
): DaySlots[] {
  const step = durationMin + bufferMin;
  const bookedKeys = new Set(booked.map((b) => `${dateKey(new Date(b.startAt))} ${pad(new Date(b.startAt).getUTCHours())}:${pad(new Date(b.startAt).getUTCMinutes())}`));
  const out: DaySlots[] = [];

  for (let i = 0; i < leadDays; i++) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const windows = availability[DAYS[day.getUTCDay()]] || [];
    if (!windows.length) continue;
    const key = dateKey(day);
    const slots: string[] = [];
    for (const w of windows) {
      const start = toMinutes(w.start), end = toMinutes(w.end);
      for (let t = start; t + durationMin <= end; t += step) {
        const time = fromMinutes(t);
        if (bookedKeys.has(`${key} ${time}`)) continue;
        // Skip past slots today.
        if (i === 0) {
          const slotDate = slotToDate(key, time);
          if (slotDate.getTime() <= now.getTime()) continue;
        }
        slots.push(time);
      }
    }
    if (slots.length) {
      const label = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
      out.push({ date: key, label, slots });
    }
  }
  return out;
}
