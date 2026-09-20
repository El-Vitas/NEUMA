'use client';

import type { ReactNode } from 'react';
import { TableRow } from '@/shared/components/ui/table';
import { usePagesRowSearch } from '../hooks/use.pages.row-search';

interface IProps {
  readonly children: ReactNode;
  /** Lo que esta fila dice de sí misma en palabras, ya armado por el servidor. */
  readonly searchText: string;
}

/**
 * La fila, que desaparece mientras no caiga dentro de lo que se está buscando.
 *
 * Se esconde en vez de no dibujarse porque las filas las dibuja el servidor y
 * lo buscado se teclea aquí: rehacerlas por letra sería pedir la colección
 * entera a cada rato para enseñar menos.
 */
export const PagesCollectionTableRowShell = ({ children, searchText }: IProps) => {
  const search = usePagesRowSearch();

  return <TableRow hidden={search !== null && !search.matches(searchText)}>{children}</TableRow>;
};
