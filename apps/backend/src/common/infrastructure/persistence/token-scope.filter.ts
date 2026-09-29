import type { Prisma } from '@company-brain/db/generated';
import type { SearchTokenScope } from '../../types/search.types';

/**
 * Las páginas que un token deja leer, como filtro de Prisma.
 *
 * Es la misma regla que aplica la búsqueda en SQL (`buildTokenScopeFilter`):
 * una página con regla de página propia o heredada la sigue; las demás, la de
 * su espacio, o la de todos. Escrita otra vez porque una consulta de Prisma no
 * recibe SQL, igual que la visibilidad de los espacios.
 */
export const buildTokenScopeWhere = (scope: SearchTokenScope): Prisma.PageWhereInput => ({
  OR: [
    { id: { in: [...scope.allowedPageIds] } },
    {
      AND: [
        { id: { notIn: [...scope.closedPageIds] } },
        scope.readsEverywhere
          ? { spaceId: { notIn: [...scope.closedSpaceIds] } }
          : { spaceId: { in: [...scope.openSpaceIds] } },
      ],
    },
  ],
});
