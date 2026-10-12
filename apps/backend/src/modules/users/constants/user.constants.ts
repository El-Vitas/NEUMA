export const USER_SEARCH_LIKE_SPECIAL_SIGNS = /[\\%_]/g;

export const FIRST_ADMIN_LOG_LEVEL = 'info';

export const TRAILING_LINE_BREAK = /\r?\n$/;

export const FIRST_ADMIN_USAGE =
  'Uso: printf "%s" "$CLAVE" | bun run admin:create --email <correo> --name <nombre>. La contraseña llega por la entrada estándar, nunca como argumento.';

export const PASSWORD_FROM_TERMINAL_REFUSED = `La contraseña no se escribe en la terminal, donde queda a la vista. ${FIRST_ADMIN_USAGE}`;
