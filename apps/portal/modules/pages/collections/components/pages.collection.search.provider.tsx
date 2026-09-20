'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { PAGE_ROW_SEARCH_CONTEXT } from '../constants/pages.row-context.constants';
import { rowMatchesQuery } from '../lib/pages.row-search.lib';
import type { PagesRowSearch } from '../types/pages.row-search.types';

interface IProps {
  readonly children: ReactNode;
  /** Lo que dice cada fila en palabras, ya armado por el servidor: buscar no puede rehacerlo en cada tecla. */
  readonly searchTexts: readonly string[];
}

/**
 * Lo que se está buscando dentro de la colección.
 *
 * Se busca sobre lo que ya está en pantalla, que son las filas que el filtro
 * dejó pasar: así buscar respeta el filtro sin tener que saber nada de él, y
 * responde al teclear en vez de ir y volver del servidor por cada letra.
 *
 * Lo buscado no se guarda en la vista. Buscar es de este rato —se busca algo,
 * se encuentra y se sigue—, y una vista que abriera mañana con una búsqueda
 * puesta parecería una colección a la que le faltan filas.
 */
export const PagesCollectionSearchProvider = ({ children, searchTexts }: IProps) => {
  const [query, setQuery] = useState('');

  const search = useMemo<PagesRowSearch>(
    () => ({
      matchCount: searchTexts.filter((searchText) => rowMatchesQuery(searchText, query)).length,
      matches: (searchText: string) => rowMatchesQuery(searchText, query),
      query,
      searching: query.trim() !== '',
      setQuery,
      total: searchTexts.length,
    }),
    [query, searchTexts],
  );

  return <PAGE_ROW_SEARCH_CONTEXT value={search}>{children}</PAGE_ROW_SEARCH_CONTEXT>;
};
