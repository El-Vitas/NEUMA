/**
 * The column a new collection starts with, named in English like every other
 * name in the code: what is read on screen is the label, which is written in
 * whatever language the page is being read in.
 */
export const PAGE_COLLECTION_FIRST_PROPERTY_KEY = 'notes';

/** What every row of a collection has: its name, which is the title of the page that row is. */
export const PAGE_COLLECTION_TITLE_PROPERTY_KEY = 'title';

/**
 * Which view of a collection is being looked at, written into the address so a
 * board can be sent by link and survives a reload.
 */
export const PAGE_COLLECTION_VIEW_SEARCH_PARAM = 'view';

/**
 * Lo que elige «por ninguna» en el desplegable de la segunda agrupación.
 *
 * Un desplegable no puede ofrecer la nada como valor —vacío es lo mismo que no
 * haber elegido—, así que la ausencia necesita un nombre propio que ninguna
 * propiedad pueda tener.
 */
export const PAGE_VIEW_NO_SUB_GROUP = '__none__';

/** Where the page keeps whoever knows how to make a collection, and how to be asked for one already written. */
export const PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR = '[data-page-collection-request]';

export const PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR = '[data-page-collection-view-request]';
