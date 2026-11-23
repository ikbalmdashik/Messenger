/**
 * Suspension helpers shared by the group panel,
 * the direct-chat panel and the composer.
 */

export interface SuspensionOption {
  label: string;
  /** null = until lifted. */
  minutes: number | null;
}

export const SUSPENSION_OPTIONS: SuspensionOption[] = [
  { label: "15 minutes", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "8 hours", minutes: 60 * 8 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 week", minutes: 60 * 24 * 7 },
  { label: "Until I lift it", minutes: null },
];

const INDEFINITE_YEAR = 9000;

/**
 * Active suspension end, or null when expired / unset.
 */
export const activeUntil = (
  value: string | Date | null | undefined,
  now: number = Date.now(),
): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) && date.getTime() > now
    ? date
    : null;
};

export const isIndefinite = (until: Date) =>
  until.getFullYear() >= INDEFINITE_YEAR;

/**
 * "until 3:40 PM", "until Mon, 3:40 PM" or
 * "until lifted".
 */
export const formatUntil = (until: Date) => {
  if (isIndefinite(until)) {
    return "until lifted";
  }

  const sameDay =
    until.toDateString() === new Date().toDateString();

  return `until ${until.toLocaleString(undefined, {
    ...(sameDay
      ? {}
      : { weekday: "short", month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

/**
 * Next moment any of these suspensions ends
 * (to re-render the composer then).
 */
export const nextExpiry = (
  values: Array<string | Date | null | undefined>,
): number | null => {
  const times = values
    .map((value) => activeUntil(value))
    .filter((date): date is Date => Boolean(date) && !isIndefinite(date!))
    .map((date) => date.getTime());

  return times.length > 0 ? Math.min(...times) : null;
};
