import type { PageViewBand } from './pages.schema.types';

/** Which way a card travels when it is moved from the keyboard. */
export type PageBoardMoveDirection = 'BACKWARD' | 'FORWARD';

/** Cuál de los dos huecos de una tarjeta señala el cursor. */
export type PageBoardDropSide = 'AFTER' | 'BEFORE';

/** Dónde va a caer una tarjeta: en qué columna y delante de cuál. */
export interface PageBoardDropTarget {
  /** La tarjeta delante de la cual queda. Nada significa al final de la columna. */
  readonly beforeRowId: null | string;
  readonly groupKey: string;
}

/** Dónde va a caer una tarjeta en una rejilla: en qué banda, en qué columna y delante de cuál. */
export interface PageBoardGridDropTarget extends PageBoardDropTarget {
  /** La banda que la recibe. Vacío cuando el tablero no tiene bandas: entonces solo hay una. */
  readonly bandKey: string;
}

/** Lo que hay que escribir para que una tarjeta soltada quede donde se soltó. */
export interface PageBoardMove {
  readonly beforeRowId: null | string;
  readonly changesGroup: boolean;
  readonly changesOrder: boolean;
  /** El valor nuevo de la propiedad que agrupa, o nada si la tarjeta no cambió de columna. */
  readonly propertyValue: null | string;
}

/** Lo mismo, más lo que cambia al cruzar de banda: la segunda propiedad. */
export interface PageBoardGridMove extends PageBoardMove {
  /** El valor nuevo de la propiedad que hace las bandas, o nada si la tarjeta no cambió de banda. */
  readonly bandValue: null | string;
  readonly changesBand: boolean;
}

/** Qué cruce de la rejilla está esperando un nombre para su tarjeta nueva. */
export interface PageBoardNamingCell {
  readonly bandKey: string;
  readonly groupKey: string;
}

/** A card while it is being carried: which one, and the crossing it left. */
export interface PageBoardDragState {
  readonly fromBandKey: string;
  readonly fromGroupKey: string;
  readonly rowId: string;
}

/** What a board can do while somebody moves a card across it. */
export interface PageBoardDragController {
  readonly announcement: string;
  /** La rejilla como se ve ahora: con lo recién soltado ya en su sitio. */
  readonly bands: readonly PageViewBand[];
  readonly draggingRowId: null | string;
  readonly isMoving: boolean;
  readonly moveByKeyboard: (rowId: string, fromGroupKey: string, direction: PageBoardMoveDirection) => void;
  readonly onDragEnd: () => void;
  readonly onDragLeave: (groupKey: string) => void;
  readonly onDragOver: (target: PageBoardGridDropTarget) => void;
  readonly onDragStart: (rowId: string, fromGroupKey: string, fromBandKey: string) => void;
  readonly onDrop: () => void;
  /** El hueco al que apunta ahora mismo la mano, para marcarlo antes de soltar. */
  readonly target: null | PageBoardGridDropTarget;
}
