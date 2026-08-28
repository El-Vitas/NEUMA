/** Which way a card travels when it is moved from the keyboard. */
export type PageBoardMoveDirection = 'BACKWARD' | 'FORWARD';

/** A card while it is being carried: which one, and the column it left. */
export interface PageBoardDragState {
  readonly fromGroupKey: string;
  readonly rowId: string;
}

/** What a board can do while somebody moves a card across it. */
export interface PageBoardDragController {
  readonly announcement: string;
  readonly draggingRowId: null | string;
  readonly hoveredGroupKey: null | string;
  readonly isMoving: boolean;
  readonly moveByKeyboard: (rowId: string, fromGroupKey: string, direction: PageBoardMoveDirection) => void;
  readonly onDragEnd: () => void;
  readonly onDragLeave: (groupKey: string) => void;
  readonly onDragOver: (groupKey: string) => void;
  readonly onDragStart: (rowId: string, fromGroupKey: string) => void;
  readonly onDrop: (groupKey: string) => void;
}
