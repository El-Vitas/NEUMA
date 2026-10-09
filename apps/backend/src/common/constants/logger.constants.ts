/** Lo que nunca se escribe en un log, esté arriba o dentro de otro objeto: datos personales y secretos. */
export const LOG_REDACTED_FIELDS: readonly string[] = ['email', 'password', 'secret', 'token'];
