import type { UserRole } from '@company-brain/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import type { SearchTokenScope } from '../../../common/types/search.types';

/** Una página vista desde el árbol: lo justo para recorrerlo, sin cargar lo que dice. */
export interface PageOutlineEntry {
  /** Cuántas hijas tiene que quien mira puede ver. */
  readonly childCount: number;
  readonly id: string;
  /** Si sus hijas son filas con propiedades: una tabla o un tablero. */
  readonly isCollection: boolean;
  /** Lo que tiene en cada columna, si es una fila de una colección. */
  readonly propertyValues: SchemaPropertyValues | null;
  readonly title: string;
}

/**
 * Un ancestro de una página, para decir dónde está. Uno que quien mira no
 * puede ver sale sin id ni título: lo que no se ve no sale del repositorio, en
 * vez de confiar en que cada uno que lo use se acuerde de taparlo.
 */
export type PageAncestor =
  | { readonly id: string; readonly isReadable: true; readonly title: string }
  | { readonly id: null; readonly isReadable: false; readonly title: null };

/** Un ancestro tal como sale de subir por el árbol, antes de saber si quien mira lo puede ver. */
export interface PageAncestorRow {
  readonly id: string;
  readonly title: string;
}

/** Una página que quien mira puede ver, dónde está hoy y cómo se llama hoy. */
export interface PageOutlinePlace {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

/**
 * Quién mira el árbol, que decide qué ve. Con un token, ve además solo lo que
 * el token deja leer: nunca más que su dueño.
 */
export interface PageOutlineReader {
  readonly role: UserRole;
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Qué tramo de una lista se pide: desde cuál y cuántas. */
export interface PageOutlineWindow {
  readonly skip: number;
  readonly take: number;
}

/** Un tramo de las páginas de un nivel, y cuántas son en total. */
export interface PageOutlineChildren {
  readonly entries: readonly PageOutlineEntry[];
  readonly total: number;
}

export interface PageOutlineRepositoryContract {
  /**
   * Un tramo de las páginas activas colgando directo de un padre, o de la raíz
   * del espacio, en su orden, y cuántas son: una colección puede tener miles de
   * filas, y se leen solo las que se van a mostrar.
   */
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ) => Promise<PageOutlineChildren>;
  /** Los ancestros de una página, del más alto al más cercano. Nada si la página no se ve. */
  readonly listAncestors: (pageId: string, reader: PageOutlineReader) => Promise<readonly PageAncestor[]>;
  /** De unas páginas, las activas que quien mira puede ver. */
  readonly listReadable: (
    pageIds: readonly string[],
    reader: PageOutlineReader,
  ) => Promise<readonly PageOutlinePlace[]>;
}
