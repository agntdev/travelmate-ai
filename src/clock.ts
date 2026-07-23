/**
 * Injectable clock seam — every schedule, cutoff, "today", expiry, and
 * late/on-time decision goes through now(). Tests can override with setNow().
 */
let _now: (() => number) | null = null;

/** Current wall-clock ms (or the test override). */
export function now(): number {
  return _now ? _now() : Date.now();
}

/** ISO timestamp from now(). */
export function nowIso(): string {
  return new Date(now()).toISOString();
}

/** Override the clock (tests only). Pass null to restore real time. */
export function setNow(fn: (() => number) | null): void {
  _now = fn;
}
