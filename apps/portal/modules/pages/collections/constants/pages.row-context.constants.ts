import { createContext } from 'react';
import type { PagesRowSearch } from '../types/pages.row-search.types';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/**
 * Cuánto se queda el aviso que ofrece deshacer, en milisegundos.
 *
 * Más que un aviso cualquiera: este no cuenta algo, ofrece volver atrás, y
 * quien acaba de mandar veinte filas a la papelera necesita un momento para
 * darse cuenta de que no era eso.
 */
export const PAGE_BULK_UNDO_DURATION = 12_000;

/**
 * Dónde se deja la selección para que la encuentre quien la necesite.
 *
 * Va por contexto y no por propiedades porque quienes la usan no están uno
 * dentro de otro: la casilla de cada fila la dibuja el servidor dentro de la
 * tabla, y la barra que dice cuántas hay marcadas vive encima. Sin un sitio
 * común, la fila tendría que avisar hacia arriba atravesando piezas que no
 * pintan nada en esto.
 *
 * Vive aquí y no junto al componente que lo ofrece porque es lo único que ese
 * componente y quien lee la selección tienen que compartir: una constante de
 * módulo, que es lo que guarda esta carpeta.
 */
export const PAGE_ROW_SELECTION_CONTEXT = createContext<null | PagesRowSelection>(null);

/**
 * Lo que se está buscando dentro de la colección, al alcance de cada fila.
 *
 * Por el mismo camino que la selección y por la misma razón: el buscador está
 * arriba y las filas las dibuja el servidor más abajo, sin nada en común por
 * donde pasarse el dato.
 */
export const PAGE_ROW_SEARCH_CONTEXT = createContext<null | PagesRowSearch>(null);
