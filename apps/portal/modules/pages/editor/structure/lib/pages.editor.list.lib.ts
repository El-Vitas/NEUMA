import { chainCommands } from 'prosemirror-commands';
import type { Attrs, NodeType } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_LIST_POINT_TYPES,
  PAGE_EDITOR_TASK_ITEM_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';

/**
 * Whatever a page calls a point of a list, it answers the same keys.
 *
 * A point of a list and a task are the same shape wearing different names, so
 * the rules of a list are written once and asked of each of them in turn: the
 * one the writing is inside answers, the other declines.
 */
const askEveryPointType =
  (askThisOne: (pointType: NodeType) => Command): Command =>
  (state, dispatch) => {
    const asked = PAGE_EDITOR_LIST_POINT_TYPES.map((name) => state.schema.nodes[name])
      .filter((pointType): pointType is NodeType => pointType !== undefined)
      .map(askThisOne);
    return chainCommands(...asked)(state, dispatch);
  };

/** A task is born waiting to be done, however the task above it ended up. */
const startOfAnotherPoint = (pointType: NodeType): Attrs | undefined =>
  pointType.name === PAGE_EDITOR_TASK_ITEM_TYPE ? { checked: false } : undefined;

/**
 * Enter at the end of a point gives the list another one.
 *
 * The general rule reads the point as any other block and splits the writing
 * inside it, which a reader sees as the list quietly stopping to grow, so this
 * has to answer before it does.
 */
export const splitPageEditorListPoint: Command = askEveryPointType((pointType) =>
  splitListItem(pointType, startOfAnotherPoint(pointType)),
);

/**
 * Tab hangs a point from the point above it.
 *
 * The general nesting hangs a block from the one above it through a nested
 * block, and inside a list it reads the whole list as the block being moved: a
 * point could never gain a level, and the list would travel with it.
 */
export const nestPageEditorListItem: Command = askEveryPointType(sinkListItem);

export const unnestPageEditorListItem: Command = askEveryPointType(liftListItem);
