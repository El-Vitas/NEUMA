import type { UserRole } from '@company-brain/shared';
import type { SearchTokenScope } from '../../../common/types/search.types';

/** Una página vista desde el árbol: lo justo para recorrerlo, sin cargar lo que dice. */
export interface PageOutlineEntry {
  /** Cuántas hijas tiene que quien mira puede ver. */
  readonly childCount: number;
  readonly id: string;
  /** Si sus hijas son filas con propiedades: una tabla o un tablero. */
  readonly isCollection: boolean;
  readonly title: string;
}

/** Un ancestro de una página, para decir dónde está. */
export interface PageAncestor {
  readonly id: string;
  /** Si quien mira puede ver este ancestro; si no, no se lo nombra. */
  readonly isReadable: boolean;
  readonly title: string;
}

/** Un ancestro tal como sale de subir por el árbol, antes de saber si quien mira lo puede ver. */
export type PageAncestorRow = Omit<PageAncestor, 'isReadable'>;

/** Una página que quien mira puede ver, y dónde está hoy. */
export interface PageOutlinePlace {
  readonly id: string;
  readonly spaceId: string;
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

export interface PageOutlineRepositoryContract {
  /** Las páginas activas colgando directo de un padre, o de la raíz del espacio. En su orden. */
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
  ) => Promise<readonly PageOutlineEntry[]>;
  /** Los ancestros de una página, del más alto al más cercano. Nada si la página no se ve. */
  readonly listAncestors: (pageId: string, reader: PageOutlineReader) => Promise<readonly PageAncestor[]>;
  /** De unas páginas, las activas que quien mira puede ver. */
  readonly listReadable: (
    pageIds: readonly string[],
    reader: PageOutlineReader,
  ) => Promise<readonly PageOutlinePlace[]>;
}
