/** Cuánto puede medir el nombre de un token de acceso. Lo validan el portal y el servidor. */
export const ACCESS_TOKEN_NAME_MAX_LENGTH = 80;

/** Cuántos espacios puede nombrar un token uno por uno. Para más, está «todos los espacios». */
export const ACCESS_TOKEN_SPACE_GRANT_LIMIT = 50;

/**
 * Lo que un token puede hacer, cada cosa por su nombre.
 *
 * Es un catálogo cerrado: un permiso que el servidor no conoce no se guarda, y
 * uno que deja de existir no se arrastra. Separa leer de escribir, y páginas de
 * colecciones, porque son las líneas por las que la gente quiere cortar: «que
 * lea todo pero solo cree tareas», «que escriba páginas pero no toque la forma
 * de las colecciones».
 */
export const ACCESS_TOKEN_PERMISSIONS = {
  pagesRead: 'pages:read',
  pagesWrite: 'pages:write',
  pagesTrash: 'pages:trash',
  collectionsRead: 'collections:read',
  collectionsWrite: 'collections:write',
  collectionsConfigure: 'collections:configure',
} as const;

export const ACCESS_TOKEN_PERMISSION_VALUES = [
  ACCESS_TOKEN_PERMISSIONS.pagesRead,
  ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  ACCESS_TOKEN_PERMISSIONS.pagesTrash,
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
] as const;

/** Los permisos que cambian algo. Solo puede darlos quien puede escribir. */
export const ACCESS_TOKEN_WRITE_PERMISSIONS = [
  ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  ACCESS_TOKEN_PERMISSIONS.pagesTrash,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
] as const;

/**
 * Los niveles con nombre, para no marcar casilla por casilla en el caso común.
 * Cada uno incluye al anterior; lo que no calza con ninguno es personalizado.
 */
export const ACCESS_TOKEN_LEVELS = {
  read: 'READ',
  readWrite: 'READ_WRITE',
  full: 'FULL',
  custom: 'CUSTOM',
} as const;

export const ACCESS_TOKEN_LEVEL_VALUES = [
  ACCESS_TOKEN_LEVELS.read,
  ACCESS_TOKEN_LEVELS.readWrite,
  ACCESS_TOKEN_LEVELS.full,
  ACCESS_TOKEN_LEVELS.custom,
] as const;

/** Los niveles que tienen un conjunto fijo de permisos. Personalizado no lo tiene. */
export const ACCESS_TOKEN_PRESET_LEVELS = [
  ACCESS_TOKEN_LEVELS.read,
  ACCESS_TOKEN_LEVELS.readWrite,
  ACCESS_TOKEN_LEVELS.full,
] as const;

/** Los permisos que solo leen. Con cualquiera de ellos, el token ve el espacio. */
export const ACCESS_TOKEN_READ_PERMISSIONS = [
  ACCESS_TOKEN_PERMISSIONS.pagesRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
] as const;

const ACCESS_TOKEN_READ_WRITE_PERMISSIONS = [
  ...ACCESS_TOKEN_READ_PERMISSIONS,
  ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
] as const;

export const ACCESS_TOKEN_LEVEL_PERMISSIONS = {
  [ACCESS_TOKEN_LEVELS.read]: ACCESS_TOKEN_READ_PERMISSIONS,
  [ACCESS_TOKEN_LEVELS.readWrite]: ACCESS_TOKEN_READ_WRITE_PERMISSIONS,
  [ACCESS_TOKEN_LEVELS.full]: ACCESS_TOKEN_PERMISSION_VALUES,
} as const;

/** Cuánto puede medir el id de un espacio dentro de lo que se le da a un token. */
export const ACCESS_TOKEN_SPACE_ID_MAX_LENGTH = 128;
