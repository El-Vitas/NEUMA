import type { EditorState } from 'prosemirror-state';

/**
 * The marks the chosen writing already carries.
 *
 * A bar that offers bold without saying that what is chosen is already bold
 * makes somebody press it to find out, and pressing it takes the bold away.
 * With nothing chosen it is the marks the next word would be written with.
 */
export const readMarksInUse = (state: EditorState): readonly string[] => {
  const { $from, empty, from, to } = state.selection;
  const carried = empty
    ? (state.storedMarks ?? $from.marks()).map((mark) => mark.type)
    : Object.values(state.schema.marks).filter((mark) => state.doc.rangeHasMark(from, to, mark));
  return carried.map((mark) => mark.name);
};
