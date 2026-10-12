import type { EditorState } from 'prosemirror-state';

/** With an empty selection, the marks the next typed character would carry. */
export const readMarksInUse = (state: EditorState): readonly string[] => {
  const { $from, empty, from, to } = state.selection;
  const carried = empty
    ? (state.storedMarks ?? $from.marks()).map((mark) => mark.type)
    : Object.values(state.schema.marks).filter((mark) => state.doc.rangeHasMark(from, to, mark));
  return carried.map((mark) => mark.name);
};
