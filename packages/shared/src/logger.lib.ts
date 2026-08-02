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

  const parts = formatter.formatToParts(new Date());
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';

  return `,"time":"${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}"`;
};
