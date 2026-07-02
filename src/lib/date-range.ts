// Shared reporting-window resolver for Google integrations (GSC, GA).
// Supports preset ranges plus a custom start/end. Defaults to the last 90 days.
export interface ResolvedRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export function resolveRange(searchParams: URLSearchParams, fallbackDays = 90): ResolvedRange {
  const range = searchParams.get("range") || `${fallbackDays}d`;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case "30d":
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: end, label: "last 30 days" };
    case "90d":
      start.setDate(start.getDate() - 90);
      return { startDate: start, endDate: end, label: "last 90 days" };
    case "120d":
      start.setDate(start.getDate() - 120);
      return { startDate: start, endDate: end, label: "last 120 days" };
    case "thisYear":
      return { startDate: new Date(now.getFullYear(), 0, 1), endDate: end, label: "this year" };
    case "lastYear":
      return {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31),
        label: "last year",
      };
    case "custom": {
      const s = searchParams.get("start");
      const e = searchParams.get("end");
      if (s && e) return { startDate: new Date(s), endDate: new Date(e), label: "custom range" };
      break;
    }
  }

  start.setDate(start.getDate() - fallbackDays);
  return { startDate: start, endDate: end, label: `last ${fallbackDays} days` };
}

// The equal-length window immediately preceding the given range, for
// period-over-period comparisons.
export function previousPeriod(r: ResolvedRange): { startDate: Date; endDate: Date } {
  const spanMs = r.endDate.getTime() - r.startDate.getTime();
  const prevEnd = new Date(r.startDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { startDate: prevStart, endDate: prevEnd };
}
