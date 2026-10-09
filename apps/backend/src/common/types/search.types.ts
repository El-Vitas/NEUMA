import type { UserRole } from '@company-brain/shared';
import type { SEARCH_EDITED_RANGE_VALUES, SEARCH_SOURCE_TYPE_VALUES } from '../constants/search.constants';

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPE_VALUES)[number];

export type SearchEditedRange = (typeof SEARCH_EDITED_RANGE_VALUES)[number];

/** Lo que acota una búsqueda por la página, igual se busquen páginas o bloques. */
export interface SearchQueryFilters {
  /** Parte del nombre de quien creó la página. */
  readonly authorQuery?: string;
  readonly editedRange?: SearchEditedRange;
  /** Only pages currently verified and not past their expiration — expired ones do not count. */
  readonly verifiedOnly?: boolean;
}

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
  /** Si la página está verificada y la verificación no venció. */
  readonly isVerified: boolean;
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
  readonly search: (query: SearchQuery & SearchQueryFilters) => Promise<SearchPage>;
}

/** Buscar bloques: lo mismo que buscar páginas, y además dentro de una página y todo lo que cuelga de ella. */
export interface PageBlockSearchQuery extends SearchQueryFilters {
  /** Solo bloques de este tipo. */
  readonly blockType?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly query: string;
  /** Solo en esta página y sus descendientes. */
  readonly rootPageId?: string;
  readonly spaceId?: string;
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly workspaceId: string;
}

/** Un bloque encontrado, con lo que hace falta para saber dónde está y llegar a él. */
export interface PageBlockSearchResult {
  readonly blockId: string;
  readonly blockType: string;
  /** Los encabezados bajo los que está, del más externo al más cercano. */
  readonly headingPath: readonly string[];
  /** Si su página está verificada y la verificación no venció. */
  readonly isPageVerified: boolean;
  readonly pageId: string;
  readonly pageTitle: string;
  readonly parentPageTitle: string | null;
  readonly rank: number;
  readonly snippet: string;
  readonly spaceId: string;
  readonly spaceName: string;
}

export interface PageBlockSearchPage {
  readonly items: readonly PageBlockSearchResult[];
  readonly nextCursor?: string;
}

export interface PageBlockSearchReader {
  /** En qué páginas del espacio de trabajo hay un bloque con ese id, sin decir si se pueden ver. */
  readonly locateBlock: (blockId: string, workspaceId: string) => Promise<readonly string[]>;
  readonly searchBlocks: (query: PageBlockSearchQuery) => Promise<PageBlockSearchPage>;
}
