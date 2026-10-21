import pino from 'pino';

/** The logger of code that runs in the browser: same level names as the servers, records with their stack. */
export const browserLogger = pino({
  browser: { asObject: true },
  formatters: { level: (label: string) => ({ level: label.toUpperCase() }) },
  level: 'warn',
});
