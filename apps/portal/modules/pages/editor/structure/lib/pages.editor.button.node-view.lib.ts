import { PAGE_BUTTON_DEEDS, PAGE_BUTTON_PLACES } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BUTTON_FIELD_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_HEAD_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_PANEL_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_PRESS_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_SETUP_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_BUTTON_TEMPLATE_STYLE_CLASS,
} from '../constants/pages.editor.button.constants';
import type { PageEditorButtonLabels } from '../types/pages.editor.button.types';

const createChoice = (
  name: string,
  chosen: string,
  options: readonly string[],
  label: string,
  say: (option: string) => string,
): HTMLSelectElement => {
  const choice = document.createElement('select');
  choice.className = PAGE_EDITOR_BUTTON_FIELD_STYLE_CLASS;
  choice.dataset.buttonChoice = name;
  choice.setAttribute('aria-label', label);
  for (const option of options) {
    const one = document.createElement('option');
    one.value = option;
    one.textContent = say(option);
    choice.append(one);
  }
  choice.value = chosen;
  return choice;
};

export const createPageButtonNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorButtonLabels,
  press: (at: number) => void,
): NodeView => {
  const container = document.createElement('div');
  const head = document.createElement('div');
  const pressed = document.createElement('button');
  const setup = document.createElement('button');
  const panel = document.createElement('div');
  const name = document.createElement('input');
  const deed = createChoice('deed', node.attrs.deed ?? PAGE_BUTTON_DEEDS[0], PAGE_BUTTON_DEEDS, labels.deed, (one) =>
    one === 'row' ? labels.deeds.row : labels.deeds.blocks,
  );
  const places: Readonly<Record<string, string>> = {
    below: labels.places.below,
    bottom: labels.places.bottom,
    top: labels.places.top,
  };
  const place = createChoice(
    'place',
    node.attrs.place ?? PAGE_BUTTON_PLACES[0],
    PAGE_BUTTON_PLACES,
    labels.place,
    (one) => places[one] ?? labels.places.below,
  );
  const template = document.createElement('div');

  container.className = PAGE_EDITOR_BUTTON_STYLE_CLASS;
  container.dataset.pageButton = 'true';
  head.className = PAGE_EDITOR_BUTTON_HEAD_STYLE_CLASS;
  head.contentEditable = 'false';
  pressed.type = 'button';
  pressed.className = PAGE_EDITOR_BUTTON_PRESS_STYLE_CLASS;
  pressed.dataset.buttonPress = 'true';
  pressed.textContent = node.attrs.label;
  setup.type = 'button';
  setup.className = PAGE_EDITOR_BUTTON_SETUP_STYLE_CLASS;
  setup.dataset.buttonSetup = 'true';
  setup.setAttribute('aria-expanded', 'false');
  setup.textContent = labels.setup;
  head.append(pressed, setup);

  panel.className = PAGE_EDITOR_BUTTON_PANEL_STYLE_CLASS;
  panel.hidden = true;
  name.type = 'text';
  name.className = PAGE_EDITOR_BUTTON_FIELD_STYLE_CLASS;
  name.dataset.buttonLabel = 'true';
  name.setAttribute('aria-label', labels.name);
  name.value = node.attrs.label;
  template.className = PAGE_EDITOR_BUTTON_TEMPLATE_STYLE_CLASS;
  template.dataset.buttonTemplate = 'true';

  const controls = document.createElement('div');
  controls.className = PAGE_EDITOR_BUTTON_HEAD_STYLE_CLASS;
  controls.contentEditable = 'false';
  controls.append(name, deed, place);
  panel.append(controls, template);
  container.append(head, panel);

  const writeAttribute = (attribute: string, value: string): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, attribute, value));
  };

  const showSetup = (open: boolean): void => {
    setup.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };

  const showWhatIsAsked = (chosen: string): void => {
    place.hidden = chosen === 'row';
  };

  showWhatIsAsked(node.attrs.deed ?? PAGE_BUTTON_DEEDS[0]);
  setup.addEventListener('mousedown', (event) => event.preventDefault());
  setup.addEventListener('click', () => showSetup(setup.getAttribute('aria-expanded') !== 'true'));
  pressed.addEventListener('mousedown', (event) => event.preventDefault());
  pressed.addEventListener('click', () => {
    const position = getPosition();
    if (position !== undefined) press(position);
  });
  name.addEventListener('input', () => {
    if (name.value.trim().length > 0) writeAttribute('label', name.value);
  });
  deed.addEventListener('change', () => {
    writeAttribute('deed', deed.value);
    showWhatIsAsked(deed.value);
  });
  place.addEventListener('change', () => writeAttribute('place', place.value));

  return {
    contentDOM: template,
    dom: container,
    ignoreMutation: (mutation) => !template.contains(mutation.target),
    stopEvent: (event) => event.target instanceof Node && !template.contains(event.target),
    update: (updated) => {
      if (updated.type !== node.type) return false;
      pressed.textContent = updated.attrs.label;
      if (document.activeElement !== name && name.value !== updated.attrs.label) name.value = updated.attrs.label;
      deed.value = updated.attrs.deed ?? PAGE_BUTTON_DEEDS[0];
      place.value = updated.attrs.place ?? PAGE_BUTTON_PLACES[0];
      showWhatIsAsked(deed.value);
      return true;
    },
  };
};
