export const THROTTLER_NAMES = {
  perIp: 'credentials-per-ip',
  global: 'credentials-global',
  exports: 'exports-per-user',
  mcp: 'mcp-per-token',
} as const;

/**
 * How often credentials may be offered.
 *
 * These are the doors somebody knocks on without a session — signing in,
 * renewing a session, opening an account — so they are the doors that can be
 * knocked on all day by a machine. The per-address count stops one machine;
 * the shared count stops a thousand of them, since a list of addresses is
 * cheap and a guess is only worth making in bulk.
 */
export const CREDENTIAL_RATE_LIMIT = {
  windowSeconds: 60,
  perIpLimit: 20,
  globalLimit: 300,
} as const;

/**
 * Cuántas veces seguidas se puede pedir el espacio entero.
 *
 * Exportar lee todas las páginas activas, se trae sus adjuntos y arma el
 * archivo en memoria, así que es de lo más caro que el servidor hace por una
 * sola petición. Se cuenta por persona y no por dirección porque hace falta
 * sesión para pedirlo, y una oficina entera comparte una dirección.
 *
 * Cinco por minuto es más de lo que nadie exporta a mano, y corta en seco a una
 * pestaña que reintente sola.
 */
export const EXPORT_RATE_LIMIT = {
  windowSeconds: 60,
  perUserLimit: 5,
} as const;

/**
 * Cuántas llamadas por minuto admite un agente.
 *
 * Un agente trabajando de verdad encadena llamadas —buscar, leer, leer otra
 * sección, escribir—, así que el tope es holgado para eso. Lo que corta es un
 * agente en bucle, que sin tope se come la base para todos los demás. Se cuenta
 * por token y no por persona: una persona con dos agentes no los hace
 * competir por el mismo cupo.
 */
export const MCP_RATE_LIMIT = {
  windowSeconds: 60,
  perTokenLimit: 120,
} as const;
