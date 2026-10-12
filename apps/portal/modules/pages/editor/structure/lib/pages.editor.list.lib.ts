import { chainCommands } from 'prosemirror-commands';
import type { Attrs, NodeType } from 'prosemirror-model';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_LIST_POINT_TYPES,
  PAGE_EDITOR_TASK_ITEM_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';

/** List items and task items share one set of rules; the type the selection is inside answers. */
const askEveryPointType =
  (askThisOne: (pointType: NodeType) => Command): Command =>
  (state, dispatch) => {
    const asked = PAGE_EDITOR_LIST_POINT_TYPES.map((name) => state.schema.nodes[name])
      .filter((pointType): pointType is NodeType => pointType !== undefined)
      .map(askThisOne);
    return chainCommands(...asked)(state, dispatch);
  };

/** A new task starts unchecked even when the one it splits from is checked. */
const startOfAnotherPoint = (pointType: NodeType): Attrs | undefined =>
  pointType.name === PAGE_EDITOR_TASK_ITEM_TYPE ? { checked: false } : undefined;

/** Must run before the generic block split, which would split the text inside the item instead. */
export const splitPageEditorListPoint: Command = askEveryPointType((pointType) =>
  splitListItem(pointType, startOfAnotherPoint(pointType)),
);

/** Must run before the generic nesting, which would move the whole list instead of indenting the item. */
export const nestPageEditorListItem: Command = askEveryPointType(sinkListItem);

export const unnestPageEditorListItem: Command = askEveryPointType(liftListItem);
