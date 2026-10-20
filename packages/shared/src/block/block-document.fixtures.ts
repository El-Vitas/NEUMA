import { givePageBlocksTheirIds } from '../page-block/page-block.identity.lib.js';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';
import type { Result } from '../result.js';
import type { DocumentToBlocksInput } from './block-document.types.js';

export const FIXTURE_PAGE_ID = '0192f3a0-0000-7000-8000-000000000001';
export const FIXTURE_SPACE_ID = '0192f3a0-0000-7000-8000-000000000002';
export const FIXTURE_USER_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';
export const FIXTURE_ASSET_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d90';

export interface FixtureNode {
  attrs?: Record<string, unknown>;
  content?: readonly unknown[];
  marks?: readonly unknown[];
  text?: string;
  type: string;
}

export const text = (value: string, marks?: readonly unknown[]): FixtureNode =>
  marks === undefined ? { text: value, type: 'text' } : { marks, text: value, type: 'text' };

export const paragraph = (...content: readonly unknown[]): FixtureNode => ({ content, type: 'paragraph' });

export const heading = (level: number, value: string, attrs: Record<string, unknown> = {}): FixtureNode => ({
  attrs: { level, ...attrs },
  content: [text(value)],
  type: 'heading',
});

export const listItem = (...content: readonly unknown[]): FixtureNode => ({ content, type: 'list_item' });

export const bulletList = (...items: readonly unknown[]): FixtureNode => ({ content: items, type: 'bullet_list' });

export const orderedList = (order: number | undefined, ...items: readonly unknown[]): FixtureNode =>
  order === undefined
    ? { content: items, type: 'ordered_list' }
    : { attrs: { order }, content: items, type: 'ordered_list' };

export const taskItem = (checked: boolean | undefined, ...content: readonly unknown[]): FixtureNode =>
  checked === undefined ? { content, type: 'task_item' } : { attrs: { checked }, content, type: 'task_item' };

export const taskList = (...items: readonly unknown[]): FixtureNode => ({ content: items, type: 'task_list' });

export const cell = (
  type: 'table_cell' | 'table_header',
  attrs: Record<string, unknown>,
  ...content: readonly unknown[]
) => ({ attrs, content, type }) satisfies FixtureNode;

export const row = (...cells: readonly unknown[]): FixtureNode => ({ content: cells, type: 'table_row' });

export const table = (...rows: readonly unknown[]): FixtureNode => ({ content: rows, type: 'table' });

export const nestedBlock = (
  block: unknown,
  children: readonly unknown[],
  attrs?: Record<string, unknown>,
  childrenAttrs?: Record<string, unknown>,
): FixtureNode => ({
  ...(attrs === undefined ? {} : { attrs }),
  content: [
    block,
    { ...(childrenAttrs === undefined ? {} : { attrs: childrenAttrs }), content: children, type: 'block_children' },
  ],
  type: 'nested_block',
});

export const ANNOTATIONS = {
  backgroundColor: 'yellow',
  textColor: 'red',
};

export const IMAGE_NODE: FixtureNode = {
  attrs: { align: 'center', alt: 'Diagrama', assetId: FIXTURE_ASSET_ID, caption: 'Figura 1', width: 0.5 },
  type: 'image',
};

export const document = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

/** Gives every node an id the way the editor does, so nothing in a fixture is left to be derived. */
export const documentWithIds = (...content: readonly unknown[]): PageContent => {
  let counter = 0;
  return givePageBlocksTheirIds(document(...content), () => {
    counter += 1;
    return `id-${String(counter)}`;
  });
};

export const toInput = (content: PageContent): DocumentToBlocksInput => ({
  content,
  cover: null,
  icon: null,
  pageId: FIXTURE_PAGE_ID,
  parentId: null,
  propertyValues: null,
  spaceId: FIXTURE_SPACE_ID,
  title: 'Roadmap',
});

export const blockAt = <Row>(rows: readonly Row[], index: number): Row => {
  const found = rows.at(index);
  if (found === undefined) throw new Error(`No row at ${String(index)}`);
  return found;
};

export const unwrap = <Value>(result: Result<Value>): Value => {
  if (result.isFail()) throw result.getError();
  return result.getValue();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stripNodeIds = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripNodeIds);
  if (!isRecord(value)) return value;
  const entries = Object.entries(value).map(([key, entry]) => [key, stripNodeIds(entry)] as const);
  const stripped = Object.fromEntries(entries.filter(([key]) => key !== 'attrs'));
  const attrs = value['attrs'];
  if (!isRecord(attrs)) return stripped;
  const { id: _id, ...rest } = attrs;
  return Object.keys(rest).length === 0 ? stripped : { ...stripped, attrs: stripNodeIds(rest) };
};

/** Compares documents by what they say, ignoring ids and an `attrs` left empty. */
export const withoutNodeIds = (content: PageContent): unknown => stripNodeIds(content);

export const REALISTIC_DOCUMENTS: Readonly<Record<string, PageContent>> = {
  'seed: a single paragraph with a fixed block id': document({
    attrs: { id: 'c1111111-1111-4111-8111-111111111111' },
    content: [text('A practical guide.')],
    type: 'paragraph',
  }),
  'seed: a paragraph with a mention between two texts': document({
    attrs: { id: 'c5555555-5555-4555-8555-555555555555' },
    content: [
      text('Ver '),
      { attrs: { label: 'Architecture', pageId: 'page-architecture', spaceId: FIXTURE_SPACE_ID }, type: 'mention' },
      text(' para el detalle.'),
    ],
    type: 'paragraph',
  }),
  'meeting notes: headings, list, tasks, table, callout and code': documentWithIds(
    heading(1, 'Notas de la reunión'),
    paragraph(text('Asistieron '), text('todos', [{ type: 'strong' }]), text(' los equipos.')),
    {
      attrs: { icon: 'idea' },
      content: [paragraph(text('Decisión: se migra en octubre.'))],
      type: 'callout',
    },
    bulletList(listItem(paragraph(text('Revisar presupuesto'))), listItem(paragraph(text('Cerrar contrato')))),
    taskList(taskItem(true, paragraph(text('Enviar acta'))), taskItem(false, paragraph(text('Agendar seguimiento')))),
    table(
      row(cell('table_header', {}, paragraph(text('Tema'))), cell('table_header', {}, paragraph(text('Dueño')))),
      row(cell('table_cell', {}, paragraph(text('Presupuesto'))), cell('table_cell', {}, paragraph(text('Ana')))),
    ),
    { attrs: { language: 'typescript' }, content: [text('const total = 1;')], type: 'code_block' },
  ),
  'handbook: nested blocks, toggle, columns and media': documentWithIds(
    heading(2, 'Manual', { collapsed: false }),
    nestedBlock(paragraph(text('Padre')), [paragraph(text('Hijo uno')), paragraph(text('Hijo dos'))]),
    {
      attrs: { open: true, summary: 'Más detalle' },
      content: [paragraph(text('Oculto')), IMAGE_NODE],
      type: 'toggle',
    },
    {
      content: [
        { attrs: { width: 0.4 }, content: [paragraph(text('Izquierda'))], type: 'column' },
        { attrs: { width: 0.6 }, content: [paragraph(text('Derecha'))], type: 'column' },
      ],
      type: 'column_list',
    },
    { type: 'divider' },
  ),
};
