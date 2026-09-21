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

/**
 * Qué se está respondiendo de una columna ahora mismo.
 *
 * La cabecera es un sitio pequeño, y el nombre y el tope se escriben en él: por
 * eso no pueden estar los dos a la vez, y por eso es un modo y no dos
 * interruptores que podrían contradecirse.
 */
export type PageBoardColumnMode = 'NAMED' | 'RENAMING' | 'LIMITING' | 'REMOVING';

/**
 * Una columna mientras se la lleva de un sitio a otro.
 *
 * Es otro gesto que el de las tarjetas y por eso va aparte: mientras se carga
 * una columna, el tablero no está ofreciendo huecos entre tarjetas, está
 * ofreciendo huecos entre columnas. `target` es la columna ante la cual caería,
 * y nada cuando caería al final.
 */
export interface PageBoardColumnDrag {
  readonly carried: null | string;
  readonly onDropOn: (beforeValue: null | string) => void;
  readonly onEnd: () => void;
  readonly onOver: (beforeValue: null | string) => void;
  readonly onStart: (value: string) => void;
  readonly target: null | string;
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
