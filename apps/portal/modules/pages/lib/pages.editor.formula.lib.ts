import { pageFormulaAttrsSchema } from '@company-brain/shared';
import katex from 'katex';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_FORMULA_DONE_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_EDITOR_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_EMPTY_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_FIELD_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_HELP_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_KATEX_OPTIONS,
  PAGE_EDITOR_FORMULA_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_UNREADABLE_STYLE_CLASS,
} from '../constants/pages.editor.formula.constants';
import type { PageFormulaDrawing, PageFormulaInsert } from '../types/pages.editor.formula.types';
import type { PageEditorFormulaLabels } from '../types/pages.editor.node-views.types';
import { insertPageNode } from './pages.editor.insert.lib';

/**
 * Builds a ProseMirror command that writes a formula where the writing is.
 *
 * Returns a no-op command (reports `false`, never dispatches) when `latex`
 * fails the shared `pageFormulaAttrsSchema` — the same contract
 * `serializePageEditorDocument` validates against at save time.
 */
export const createPageFormulaInsertCommand = (schema: Schema, formula: PageFormulaInsert): Command => {
  const attrs = pageFormulaAttrsSchema.safeParse(formula);
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.formula.createChecked(attrs.data));
};

const escapeFormulaText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Tries katex once; a caller that only needs the markup and a caller that also needs to know whether it failed share this attempt instead of asking katex twice. */
const attemptToDrawTheFormula = (latex: string): PageFormulaDrawing => {
  try {
    return { html: katex.renderToString(latex, PAGE_EDITOR_FORMULA_KATEX_OPTIONS) };
  } catch {
    return { text: escapeFormulaText(latex) };
  }
};

/**
 * Draws a formula as the HTML katex produces.
 *
 * Katex is never let throw: a formula it refuses is shown as what was
 * written — escaped, so the page stays safe — rather than breaking the page.
 */
export const drawTheFormula = (latex: string): string => {
  const drawing = attemptToDrawTheFormula(latex);
  return 'html' in drawing ? drawing.html : drawing.text;
};

/** Shows a formula the way it reads right now: unwritten, drawn, or refused, each with its own words for what it is. */
const showTheFormula = (display: HTMLElement, latex: string, labels: PageEditorFormulaLabels): void => {
  display.removeAttribute('title');

  if (latex.length === 0) {
    display.className = PAGE_EDITOR_FORMULA_EMPTY_STYLE_CLASS;
    display.textContent = labels.empty;
    display.setAttribute('aria-label', labels.empty);
    return;
  }

  const drawing = attemptToDrawTheFormula(latex);
  if ('html' in drawing) {
    display.className = PAGE_EDITOR_FORMULA_STYLE_CLASS;
    display.innerHTML = drawing.html;
    display.setAttribute('aria-label', `${labels.inline}: ${latex}`);
    return;
  }

  display.className = PAGE_EDITOR_FORMULA_UNREADABLE_STYLE_CLASS;
  display.textContent = drawing.text;
  display.title = labels.unreadable;
  display.setAttribute('aria-label', `${labels.unreadable}: ${latex}`);
};

/**
 * A formula inside the line, drawn by katex at the size of the writing around
 * it so it never pushes the line's height around.
 *
 * Nothing written yet still stands as a quiet placeholder, and clicking
 * either — or ProseMirror selecting the formula, arriving by keyboard — opens
 * a field to write the LaTeX in. Leaving the field writes it back through a
 * single transaction, the same way the code block writes its own attributes.
 */
export const createPageFormulaNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorFormulaLabels,
): NodeView => {
  const host = document.createElement('span');
  const display = document.createElement('span');
  const editor = document.createElement('span');
  const field = document.createElement('input');
  const help = document.createElement('span');
  const done = document.createElement('button');
  let current = node;
  let isEditing = false;

  host.contentEditable = 'false';
  display.tabIndex = 0;
  display.setAttribute('role', 'button');
  editor.className = PAGE_EDITOR_FORMULA_EDITOR_STYLE_CLASS;
  editor.hidden = true;
  field.type = 'text';
  field.className = PAGE_EDITOR_FORMULA_FIELD_STYLE_CLASS;
  field.setAttribute('aria-label', labels.field);
  field.dataset.formulaField = 'true';
  help.className = PAGE_EDITOR_FORMULA_HELP_STYLE_CLASS;
  help.textContent = labels.help;
  done.type = 'button';
  done.className = PAGE_EDITOR_FORMULA_DONE_STYLE_CLASS;
  done.textContent = labels.done;
  done.dataset.formulaDone = 'true';
  editor.append(field, help, done);
  host.append(display, editor);

  const render = (): void => {
    host.dataset.pageFormula = current.attrs.latex;
    showTheFormula(display, current.attrs.latex, labels);
  };
  render();

  const openEditing = (): void => {
    if (isEditing) return;
    isEditing = true;
    field.value = current.attrs.latex;
    display.hidden = true;
    editor.hidden = false;
    field.focus();
    field.select();
  };

  const closeEditing = (): void => {
    if (!isEditing) return;
    isEditing = false;
    editor.hidden = true;
    display.hidden = false;
    render();
  };

  /** Writes the field back to the document in one transaction — nothing here ever mutates the display behind ProseMirror's back. */
  const commit = (): void => {
    const position = getPosition();
    if (position === undefined) return;
    const latex = field.value.trim();
    const attrs = pageFormulaAttrsSchema.safeParse({ latex });
    if (!attrs.success || attrs.data.latex === current.attrs.latex) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, 'latex', attrs.data.latex));
  };

  const finishEditing = (): void => {
    commit();
    closeEditing();
  };

  display.addEventListener('click', () => openEditing());
  display.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openEditing();
  });
  done.addEventListener('mousedown', (event) => event.preventDefault());
  done.addEventListener('click', () => {
    finishEditing();
    view.focus();
  });
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
      view.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      field.value = current.attrs.latex;
      closeEditing();
      view.focus();
    }
  });
  field.addEventListener('blur', () => finishEditing());

  return {
    dom: host,
    ignoreMutation: () => true,
    selectNode: () => openEditing(),
    stopEvent: (event) => event.target instanceof Node && host.contains(event.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      current = updatedNode;
      if (document.activeElement !== field) field.value = updatedNode.attrs.latex;
      if (!isEditing) render();
      return true;
    },
  };
};
