import 'server-only';

import { logger } from '@/lib/logger';
import { PAGES_LIST_IS_NOT_A_LIST } from '../../constants/pages.constants';
import { pageSummarySchema } from '../../schemas/pages.schemas';
import type { PageSummary } from '../../types/pages.types';

/**
 * Lee una lista de páginas quedándose con las que se dejan leer.
 *
 * Una lista se parsea entera o no se parsea: basta una página que esta versión
 * no sepa leer —guardada por otra versión, arreglada a mano en la base, dejada
 * a medias por una migración— para que la lectura falle y, con ella, el espacio
 * entero. Y un espacio que no responde deja sin abrir todas sus páginas, no
 * solo la estropeada.
 *
 * Así que la que no se deja leer se queda fuera y el resto sigue. Fuera, no en
 * silencio: queda dicho cuántas y desde dónde, porque una página que desaparece
 * del costado sin que nadie se entere es la otra manera de perderla.
 *
 * Una respuesta que ni siquiera es una lista no es una página estropeada: es
 * otra cosa, y esa sí corta la lectura.
 */
export const readPagesThatCanBeRead = (response: unknown, op: string): readonly PageSummary[] => {
  if (!Array.isArray(response)) {
    logger.error({ message: PAGES_LIST_IS_NOT_A_LIST, op });
    throw new Error(PAGES_LIST_IS_NOT_A_LIST);
  }

  const read = response.map((item) => pageSummarySchema.safeParse(item));
  const unreadable = read.filter((one) => !one.success).length;
  if (unreadable > 0) {
    logger.warn({ message: 'Some pages could not be read and were left out of the list', op, unreadable });
  }

  return read.flatMap((one) => (one.success ? [one.data] : []));
};
