/**
 * Returns current date string in YYYY-MM-DD format based on Asia/Riyadh timezone.
 */
export function getRiyadhDateString(dateObj: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateObj); // Returns YYYY-MM-DD
}

/**
 * Returns Date object normalized to UTC midnight for database storage.
 */
export function getRiyadhDate(dateObj: Date = new Date()): Date {
  const dateStr = getRiyadhDateString(dateObj);
  return new Date(`${dateStr}T00:00:00.000Z`);
}
