const PROCESS_START_WALL_CLOCK_MS = Date.now();
const PROCESS_START_MONOTONIC_MS = performance.now();

/**
 * La hora que marca una línea de registro, contada desde que arrancó el proceso.
 *
 * Preguntar la hora del reloj de pared en mitad de un renderizado obliga al
 * marco a resolver esa página en el momento, y una consulta guardada en caché
 * no puede: ahí adentro la hora no es un valor estable. El reloj monótono sí lo
 * es —está pensado justo para medir—, así que se pregunta a él cuánto ha pasado
 * y se suma a la hora que era al arrancar.
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
