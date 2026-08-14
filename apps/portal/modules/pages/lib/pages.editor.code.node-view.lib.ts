import { PAGE_CODE_LANGUAGES } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { toast } from 'sonner';
import {
  PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_CODE_BAR_STYLE_CLASS,
  PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS,
  PAGE_EDITOR_CODE_WRAPPED_STYLE_CLASS,
  PAGE_EDITOR_MARKS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorCodeLabels } from '../types/pages.editor.code.types';
import { askTheBrowser } from './pages.editor.asking.lib';
import { attachPageDiagram } from './pages.editor.diagram.node-view.lib';
import { createPageMarkButton } from './pages.editor.marks.lib';

const createLanguageChoice = (labels: PageEditorCodeLabels): HTMLSelectElement => {
  const choice = document.createElement('select');
  choice.className = PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS;
  choice.dataset.codeLanguage = 'true';
  choice.setAttribute('aria-label', labels.language);
  for (const language of PAGE_CODE_LANGUAGES) {
    const option = document.createElement('option');
    option.value = language;
    option.textContent = labels.languages[language] ?? language;
    choice.append(option);
  }
  return choice;
};

/**
 * Renders code with what is needed to read it: what it is written in, a way to
 * take it away whole, and a way to stop long lines running off the side.
 *
 * The controls are form controls of their own rather than writable content:
 * inside the editor every keystroke belongs to the writing, and a control made
 * of text would never receive one.
 */
export const createPageCodeBlockNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorCodeLabels,
): NodeView => {
  const container = document.createElement('div');
  const bar = document.createElement('div');
  const language = createLanguageChoice(labels);
  const copy = createPageMarkButton(labels.copy, PAGE_EDITOR_MARKS.copy, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);
  const wrap = createPageMarkButton(labels.wrap, PAGE_EDITOR_MARKS.wrap, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  let codeBlock = node;

  const writeAttribute = (name: string, value: boolean | string | null): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, name, value));
  };

  container.dataset.codeBlock = 'true';
  bar.className = PAGE_EDITOR_CODE_BAR_STYLE_CLASS;
  bar.contentEditable = 'false';
  bar.append(language, wrap, copy);
  pre.append(code);
  container.append(bar, pre);

  const diagram = attachPageDiagram({ bar, container, labels: labels.diagram, pre, writeAttribute });

  const showState = (current: EditorNode): void => {
    language.value = typeof current.attrs.language === 'string' ? current.attrs.language : 'plain';
    const isWrapped = current.attrs.wrapped === true;
    wrap.setAttribute('aria-pressed', String(isWrapped));
    pre.classList.toggle(PAGE_EDITOR_CODE_WRAPPED_STYLE_CLASS, isWrapped);
    pre.toggleAttribute('data-wrapped', isWrapped);
    diagram.show(current);
  };

  showState(node);

  language.addEventListener('change', () => {
    writeAttribute('language', language.value === 'plain' ? null : language.value);
  });
  wrap.addEventListener('mousedown', (event) => event.preventDefault());
  wrap.addEventListener('click', () => writeAttribute('wrapped', codeBlock.attrs.wrapped !== true));
  copy.addEventListener('mousedown', (event) => event.preventDefault());
  /** Nothing visible happens when writing is copied, so the page says that it was. */
  copy.addEventListener('click', () => {
    askTheBrowser(navigator.clipboard.writeText(codeBlock.textContent), () => toast.success(labels.copied));
  });

  return {
    contentDOM: code,
    destroy: () => diagram.stop(),
    dom: container,
    ignoreMutation: (mutation) => !code.contains(mutation.target),
    stopEvent: (event) => event.target instanceof Node && bar.contains(event.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      codeBlock = updatedNode;
      showState(updatedNode);
      return true;
    },
  };
};
