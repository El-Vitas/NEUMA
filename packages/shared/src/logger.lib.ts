const PROCESS_START_WALL_CLOCK_MS = Date.now();
const PROCESS_START_MONOTONIC_MS = performance.now();

/**
 * Reading the wall clock during a render forces the framework to resolve the page
 * dynamically, which a cached query cannot do. The monotonic clock is stable
 * there, so elapsed time is added to the wall-clock time at process start.
 */
const readLogInstant = (): Date =>
  new Date(PROCESS_START_WALL_CLOCK_MS + (performance.now() - PROCESS_START_MONOTONIC_MS));

export const formatChileanTime = (): string => {
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(readLogInstant());
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  return `,"time":"${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}"`;
};
