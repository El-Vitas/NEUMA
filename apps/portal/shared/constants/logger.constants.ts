/** One level of nesting is covered too, and `params.query` is what a person typed into the search box. */
export const LOGGER_REDACT_PATHS: string[] = [
  'password',
  'token',
  'secret',
  'email',
  'authorization',
  '*.password',
  '*.token',
  '*.secret',
  '*.email',
  '*.authorization',
  'params.query',
];
