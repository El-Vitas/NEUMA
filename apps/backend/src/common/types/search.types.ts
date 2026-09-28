import type { UserRole } from '@company-brain/shared';
import { SEARCH_SOURCE_TYPE_VALUES } from '../constants/search.constants';

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPE_VALUES)[number];

export interface SearchQuery {
  readonly contentType?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly query: string;
  readonly sourceType?: SearchSourceType;
  readonly spaceId?: string;
  readonly tags?: readonly string[];
  /**
   * Lo que un token deja encontrar, además de lo que la persona ve. Sin él,
   * manda solo la visibilidad de la persona.
   */
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly workspaceId: string;
}

/**
 * La regla de un token ya resuelta para buscar: para cada página manda su
 * regla de página más cercana si tiene una; si no, la de su espacio; si no,
 * la de todos los espacios.
 */
export interface SearchTokenScope {
  /** Páginas cuya regla de página más cercana deja leerlas. */
  readonly allowedPageIds: readonly string[];
  /** Páginas cuya regla de página más cercana las cierra. */
  readonly closedPageIds: readonly string[];
  /** Espacios cuya regla cierra la lectura. */
  readonly closedSpaceIds: readonly string[];
  /** Espacios cuya regla deja leer. */
  readonly openSpaceIds: readonly string[];
  /** Si la regla de todos los espacios deja leer. */
  readonly readsEverywhere: boolean;
}

export interface SearchResult {
  readonly contentType: string;
  readonly rank: number;
  readonly spaceId: string;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly snippet: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface SearchPage {
  readonly items: readonly SearchResult[];
  readonly nextCursor?: string;
}

export interface SearchReader {
  readonly search: (query: SearchQuery) => Promise<SearchPage>;
}
