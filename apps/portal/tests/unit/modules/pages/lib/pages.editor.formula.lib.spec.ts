import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createPageFormulaInsertCommand,
  createPageFormulaNodeView,
  drawTheFormula,
} from '@/modules/pages/lib/pages.editor.formula.lib';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { PageEditorFormulaLabels } from '@/modules/pages/types/pages.editor.node-views.types';

const createEditorState = (): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(createEmptyPageContent())),
    schema: pageEditorSchema,
  });

const runCommand = (state: EditorState, run: Command): EditorState => {
  let nextState = state;
  const dispatched = run(state, (transaction) => {
    nextState = state.apply(transaction);
  });
  expect(dispatched).toBe(true);
  return nextState;
};

const rejectsWithoutDispatching = (state: EditorState, run: Command): boolean =>
  run(state, () => {
    throw new Error('command must not dispatch when rejecting');
  });

describe('createPageFormulaInsertCommand', () => {
  it('writes a formula built from latex and round-trips it', () => {
    const run = createPageFormulaInsertCommand(pageEditorSchema, { latex: 'x^2' });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ content: [{ attrs: { latex: 'x^2' }, type: 'formula' }] });
  });

  it('writes an empty formula, since an unwritten one is still a formula', () => {
    const run = createPageFormulaInsertCommand(pageEditorSchema, { latex: '' });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ content: [{ attrs: { latex: '' }, type: 'formula' }] });
  });

  it('rejects latex over the shared contract length limit without dispatching', () => {
    const run = createPageFormulaInsertCommand(pageEditorSchema, { latex: 'a'.repeat(4001) });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('drawTheFormula', () => {
  it('draws the html katex produces for valid latex', () => {
    expect(drawTheFormula('x^2')).toContain('katex');
  });

  it('comes back as the plain latex, escaped, when katex refuses it', () => {
    expect(drawTheFormula('\\notarealcommand')).toBe('\\notarealcommand');
  });

  it('escapes writing that could break the page', () => {
    expect(drawTheFormula('\\notarealcommand<b>')).toBe('\\notarealcommand&lt;b&gt;');
  });
});

describe('createPageFormulaNodeView', () => {
  const unreadableLabel = 'This formula cannot be drawn, so it is shown exactly as it was written.';
  const labels: PageEditorFormulaLabels = {
    done: 'Done',
    empty: 'Formula not written yet',
    field: 'The formula',
    help: 'Written in LaTeX.',
    inline: 'Formula',
    unreadable: unreadableLabel,
  };

  const mountFormulaDocument = (latex: string): { readonly container: HTMLElement; readonly view: EditorView } => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const content = pageContentSchema.parse({
      content: [{ content: [{ attrs: { latex }, type: 'formula' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    });
    const view = new EditorView(container, {
      nodeViews: {
        formula: (node, editorView, getPosition) => createPageFormulaNodeView(node, editorView, getPosition, labels),
      },
      state: EditorState.create({ doc: pageEditorSchema.nodeFromJSON(content) }),
    });
    return { container, view };
  };

  const findFormulaDisplay = (container: HTMLElement): HTMLElement => {
    const display = container.querySelector('[role="button"]');
    if (display === null) throw new Error('formula display missing');
    return display as HTMLElement;
  };

  const findFormulaField = (container: HTMLElement): HTMLInputElement => {
    const field = container.querySelector('input[data-formula-field]');
    if (field === null) throw new Error('formula field missing');
    return field as HTMLInputElement;
  };

  const findFormulaPos = (view: EditorView): number => {
    let found = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'formula') found = pos;
    });
    if (found === -1) throw new Error('formula node missing');
    return found;
  };

  it('stands as a quiet placeholder until it is written, and can be clicked open', () => {
    const { container, view } = mountFormulaDocument('');
    const display = findFormulaDisplay(container);

    expect(display.textContent).toBe(labels.empty);
    expect(display.getAttribute('aria-label')).toBe(labels.empty);

    display.click();
    const field = findFormulaField(container);
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe('');

    view.destroy();
    container.remove();
  });

  it('writes what was typed back through a single transaction on Enter, without leaving the paragraph', () => {
    const { container, view } = mountFormulaDocument('');
    findFormulaDisplay(container).click();
    const field = findFormulaField(container);

    field.value = 'x^2';
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));

    expect(view.state.doc.nodeAt(findFormulaPos(view))?.attrs.latex).toBe('x^2');
    expect(field.parentElement?.hidden).toBe(true);
    const display = findFormulaDisplay(container);
    expect(display.hidden).toBe(false);
    expect(display.innerHTML).toContain('katex');

    view.destroy();
    container.remove();
  });

  it('writes it back when the field is left, since leaving the field is what writes it', () => {
    const { container, view } = mountFormulaDocument('');
    findFormulaDisplay(container).click();
    const field = findFormulaField(container);

    field.value = 'y^2';
    field.dispatchEvent(new FocusEvent('blur'));

    expect(view.state.doc.nodeAt(findFormulaPos(view))?.attrs.latex).toBe('y^2');

    view.destroy();
    container.remove();
  });

  it('leaves what was written untouched when Escape cancels', () => {
    const { container, view } = mountFormulaDocument('a+b');
    findFormulaDisplay(container).click();
    const field = findFormulaField(container);

    field.value = 'ruined';
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }));

    expect(view.state.doc.nodeAt(findFormulaPos(view))?.attrs.latex).toBe('a+b');
    expect(field.parentElement?.hidden).toBe(true);

    view.destroy();
    container.remove();
  });

  it('stays a no-op transaction when the field is left unchanged', () => {
    const { container, view } = mountFormulaDocument('a+b');
    findFormulaDisplay(container).click();
    const field = findFormulaField(container);
    const versionBeforeClosing = view.state.doc.content.size;

    field.dispatchEvent(new FocusEvent('blur'));

    expect(view.state.doc.content.size).toBe(versionBeforeClosing);
    expect(view.state.doc.nodeAt(findFormulaPos(view))?.attrs.latex).toBe('a+b');

    view.destroy();
    container.remove();
  });

  it('opens the same way when ProseMirror selects it, arriving by keyboard rather than a click', () => {
    const { container, view } = mountFormulaDocument('a+b');

    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, findFormulaPos(view))));

    const field = findFormulaField(container);
    expect(field.parentElement?.hidden).toBe(false);

    view.destroy();
    container.remove();
  });

  it('shows a formula katex refuses as what was written, with the message explaining why', () => {
    const { container, view } = mountFormulaDocument('\\notarealcommand');
    const display = findFormulaDisplay(container);

    expect(display.textContent).toBe('\\notarealcommand');
    expect(display.getAttribute('aria-label')).toBe(`${unreadableLabel}: \\notarealcommand`);
    expect(display.title).toBe(unreadableLabel);

    view.destroy();
    container.remove();
  });
});
