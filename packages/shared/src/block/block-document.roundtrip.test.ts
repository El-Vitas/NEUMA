import { describe, expect, test } from 'bun:test';
import { PAGE_CONTENT_NODE_TYPES, type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';
import { parseBlockContent } from './block-content.lib.js';
import {
  ANNOTATIONS,
  bulletList,
  cell,
  document,
  documentWithIds,
  FIXTURE_ASSET_ID,
  FIXTURE_SPACE_ID,
  FIXTURE_USER_ID,
  type FixtureNode,
  heading,
  IMAGE_NODE,
  listItem,
  nestedBlock,
  orderedList,
  paragraph,
  REALISTIC_DOCUMENTS,
  row,
  table,
  taskItem,
  taskList,
  text,
  toInput,
  unwrap,
  withoutNodeIds,
} from './block-document.fixtures.js';
import { documentToBlocks } from './block-document.to-blocks.lib.js';
import { blocksToDocument } from './block-document.to-document.lib.js';

const expectRoundTrip = (content: PageContent): void => {
  const { blocks, page } = unwrap(documentToBlocks(toInput(content)));
  expect(unwrap(blocksToDocument(page, blocks))).toEqual(content);
  expect(unwrap(blocksToDocument(page, [...blocks].reverse()))).toEqual(content);
  for (const draft of [page, ...blocks]) {
    expect(parseBlockContent(draft.type, draft.properties, draft.format).isOk()).toBe(true);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const INLINE_TYPES = ['text', 'mention', 'person', 'date', 'formula', 'hard_break'];
const TEXT_HOLDERS = ['paragraph', 'heading', 'code_block'];

const annotate = (node: unknown): unknown => {
  if (!isRecord(node) || typeof node['type'] !== 'string') return node;
  const nodeType = node['type'];
  if (INLINE_TYPES.includes(nodeType) || !PAGE_CONTENT_NODE_TYPES.includes(nodeType)) return node;
  const attrs = isRecord(node['attrs']) ? node['attrs'] : {};
  const content = node['content'];
  const annotated = { ...node, attrs: { ...attrs, ...ANNOTATIONS } };
  if (!Array.isArray(content) || TEXT_HOLDERS.includes(nodeType)) return annotated;
  return { ...annotated, content: content.map(annotate) };
};

const MARK_CASES: Readonly<Record<string, unknown>> = {
  background_color: { attrs: { color: 'blue' }, type: 'background_color' },
  code: { type: 'code' },
  comment: { attrs: { id: 'comment-9' }, type: 'comment' },
  em: { type: 'em' },
  link: { attrs: { href: 'https://example.com/a?b=1' }, type: 'link' },
  strike: { type: 'strike' },
  strong: { type: 'strong' },
  text_color: { attrs: { color: 'green' }, type: 'text_color' },
  underline: { type: 'underline' },
};

const INLINE_CASES: Readonly<Record<string, unknown>> = {
  date: { attrs: { at: '2026-10-19' }, type: 'date' },
  formula: { attrs: { latex: 'E = mc^2' }, type: 'formula' },
  hard_break: { type: 'hard_break' },
  mention: { attrs: { label: 'Roadmap', pageId: 'page-1', spaceId: FIXTURE_SPACE_ID }, type: 'mention' },
  person: { attrs: { label: 'Ana', userId: FIXTURE_USER_ID }, type: 'person' },
};

const COLLECTION_NODE = {
  attrs: { pageId: 'collection-1', spaceId: FIXTURE_SPACE_ID, viewName: 'Tablero' },
  type: 'collection',
};
const SUBPAGE_NODE = { attrs: { label: 'Hija', pageId: 'page-2', spaceId: FIXTURE_SPACE_ID }, type: 'subpage' };
const SYNCED_NODE = { attrs: { blockId: 'block-7', pageId: 'page-3', spaceId: FIXTURE_SPACE_ID }, type: 'synced' };

const NODE_CASES: Readonly<Record<string, readonly unknown[]>> = {
  audio: [{ attrs: { align: 'left', assetId: FIXTURE_ASSET_ID, caption: 'Pista' }, type: 'audio' }],
  blockquote: [{ content: [paragraph(text('Cita')), heading(2, 'Dentro')], type: 'blockquote' }],
  bookmark: [
    {
      attrs: {
        description: 'Sitio',
        icon: 'https://example.com/icon.png',
        title: 'Ejemplo',
        url: 'https://example.com/',
      },
      type: 'bookmark',
    },
  ],
  bullet_list: [bulletList(listItem(paragraph(text('uno'))), listItem(paragraph(text('dos'))))],
  button: [
    {
      attrs: { deed: 'blocks', label: 'Añadir', pageId: 'page-1', place: 'below', spaceId: FIXTURE_SPACE_ID },
      content: [paragraph(text('Nuevo bloque'))],
      type: 'button',
    },
    {
      attrs: {
        deed: 'row',
        label: 'Nueva fila',
        pageId: 'page-1',
        spaceId: FIXTURE_SPACE_ID,
        templateId: 'template-1',
      },
      content: [paragraph(text('Fila'))],
      type: 'button',
    },
  ],
  callout: [{ attrs: { icon: 'warning' }, content: [paragraph(text('Ojo')), paragraph()], type: 'callout' }],
  code_block: [
    {
      attrs: { frameHeight: 300, language: 'mermaid', shown: 'both', wrapped: true },
      content: [text('graph TD; A-->B'), text('<div>no es etiqueta de página</div>')],
      type: 'code_block',
    },
    { content: [], type: 'code_block' },
  ],
  collection: [COLLECTION_NODE],
  column_list: [
    {
      content: [
        { attrs: { width: 0.3 }, content: [paragraph(text('A'))], type: 'column' },
        { content: [paragraph(text('B')), IMAGE_NODE], type: 'column' },
      ],
      type: 'column_list',
    },
  ],
  divider: [{ type: 'divider' }],
  embed: [
    {
      attrs: { align: 'full', provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc', width: 1 },
      type: 'embed',
    },
  ],
  file: [
    {
      attrs: {
        assetId: FIXTURE_ASSET_ID,
        display: 'line',
        mimeType: 'application/pdf',
        size: 2048,
        width: 0.8,
      },
      type: 'file',
    },
  ],
  heading: [heading(1, 'Uno'), heading(2, 'Dos', { collapsed: true }), heading(3, 'Tres', { collapsed: false })],
  image: [IMAGE_NODE],
  ordered_list: [orderedList(2, listItem(paragraph(text('a')))), orderedList(1, listItem(paragraph(text('b'))))],
  paragraph: [paragraph(text('Hola mundo')), paragraph()],
  subpage: [SUBPAGE_NODE],
  synced: [SYNCED_NODE],
  table: [
    table(
      row(cell('table_header', {}, paragraph(text('H1'))), cell('table_header', {}, paragraph(text('H2')))),
      row(cell('table_cell', {}, paragraph(text('a'))), cell('table_cell', {}, paragraph(text('b')))),
    ),
  ],
  table_of_contents: [{ type: 'table_of_contents' }],
  task_list: [
    taskList(
      taskItem(true, paragraph(text('hecho'))),
      taskItem(false, paragraph(text('falta'))),
      taskItem(undefined, paragraph()),
    ),
  ],
  toggle: [
    { attrs: { open: false, summary: 'Resumen' }, content: [paragraph(text('Cuerpo'))], type: 'toggle' },
    { attrs: { summary: '' }, content: [paragraph()], type: 'toggle' },
  ],
  video: [{ attrs: { assetId: FIXTURE_ASSET_ID, width: 0.25 }, type: 'video' }],
};

describe('round trip: one document per node type', () => {
  for (const [name, nodes] of Object.entries(NODE_CASES)) {
    test(name, () => {
      expectRoundTrip(documentWithIds(...nodes));
    });
  }

  test('an unknown node written by a newer version is kept as it arrived', () => {
    const unknown = {
      attrs: { id: 'future-1', shape: { sides: [3, 4] } },
      content: ['raw', 1, null],
      type: 'sparkline',
    };

    expectRoundTrip(documentWithIds(paragraph(text('antes')), unknown, paragraph(text('después'))));
  });

  test('every known node type has a case', () => {
    const covered = new Set(Object.keys(NODE_CASES));
    const wrappersAndParts = [
      'list_item',
      'task_item',
      'table_row',
      'table_cell',
      'table_header',
      'column',
      'nested_block',
      'block_children',
    ];

    const missing = PAGE_CONTENT_NODE_TYPES.filter(
      (nodeType) => !covered.has(nodeType) && !INLINE_TYPES.includes(nodeType) && !wrappersAndParts.includes(nodeType),
    );

    expect(missing).toEqual([]);
  });
});

describe('round trip: marks and inline nodes', () => {
  for (const [name, mark] of Object.entries(MARK_CASES)) {
    test(`mark ${name}`, () => {
      expectRoundTrip(documentWithIds(paragraph(text('a '), text('marcado', [mark]), text(' z'))));
    });
  }

  for (const [name, node] of Object.entries(INLINE_CASES)) {
    test(`inline ${name}`, () => {
      expectRoundTrip(documentWithIds(paragraph(text('a '), node, text(' z'))));
    });
  }

  test('five marks on one text keep the editor order', () => {
    const marks = [
      MARK_CASES['code'],
      MARK_CASES['comment'],
      MARK_CASES['link'],
      MARK_CASES['strike'],
      MARK_CASES['text_color'],
    ];

    expectRoundTrip(documentWithIds(paragraph(text('mucho', marks))));
  });

  test('marks written in another order come back in the editor order', () => {
    const content = documentWithIds(
      paragraph(text('x', [MARK_CASES['underline'], MARK_CASES['strong'], MARK_CASES['code']])),
    );

    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));

    expect(JSON.stringify(unwrap(blocksToDocument(page, blocks)))).toContain(
      '[{"type":"code"},{"type":"strong"},{"type":"underline"}]',
    );
  });

  test('adjacent texts with the same marks stay as separate texts', () => {
    expectRoundTrip(
      documentWithIds(
        paragraph(text('uno'), text('dos'), text('tres', [MARK_CASES['em']]), text('cuatro', [MARK_CASES['em']])),
      ),
    );
  });

  test('marks inside a heading, a list item and a table cell', () => {
    const marked = text('fuerte', [MARK_CASES['strong']]);

    expectRoundTrip(
      documentWithIds(
        { attrs: { level: 2 }, content: [marked, INLINE_CASES['hard_break'], marked], type: 'heading' },
        bulletList(listItem(paragraph(marked, INLINE_CASES['mention']))),
        table(row(cell('table_cell', {}, paragraph(marked)))),
      ),
    );
  });
});

describe('round trip: lists', () => {
  test('adjacent lists of different kinds stay different lists', () => {
    expectRoundTrip(
      documentWithIds(
        bulletList(listItem(paragraph(text('a'))), listItem(paragraph(text('b')))),
        orderedList(1, listItem(paragraph(text('c')))),
        taskList(taskItem(false, paragraph(text('d')))),
        bulletList(listItem(paragraph(text('e')))),
      ),
    );
  });

  test('two adjacent lists of the same kind stay two lists', () => {
    expectRoundTrip(
      documentWithIds(
        bulletList(listItem(paragraph(text('a')))),
        bulletList(listItem(paragraph(text('b')))),
        taskList(taskItem(true, paragraph(text('c')))),
        taskList(taskItem(true, paragraph(text('d')))),
      ),
    );
  });

  test('two adjacent lists of the same kind keep their own colors', () => {
    expectRoundTrip(
      documentWithIds(
        { attrs: { textColor: 'red' }, content: [listItem(paragraph(text('a')))], type: 'bullet_list' },
        {
          attrs: { backgroundColor: 'blue', textColor: 'green' },
          content: [listItem(paragraph(text('b')))],
          type: 'bullet_list',
        },
      ),
    );
  });

  test('an ordered list keeps a custom start, and two in a row keep theirs', () => {
    expectRoundTrip(
      documentWithIds(
        orderedList(5, listItem(paragraph(text('a'))), listItem(paragraph(text('b')))),
        orderedList(1, listItem(paragraph(text('c')))),
        orderedList(40, listItem(paragraph(text('d')))),
        orderedList(40, listItem(paragraph(text('e')))),
      ),
    );
  });

  test('lists nested inside list items, three levels down', () => {
    const inner = orderedList(
      3,
      listItem(paragraph(text('profundo')), taskList(taskItem(true, paragraph(text('tarea'))))),
    );

    expectRoundTrip(
      documentWithIds(
        bulletList(
          listItem(paragraph(text('uno')), bulletList(listItem(paragraph(text('uno.uno')), inner))),
          listItem(paragraph(text('dos')), { content: [paragraph(text('cita'))], type: 'blockquote' }, IMAGE_NODE),
        ),
      ),
    );
  });

  test('a list item holding other blocks after its first paragraph', () => {
    expectRoundTrip(
      documentWithIds(
        bulletList(
          listItem(
            paragraph(text('con extras')),
            { attrs: { language: 'bash' }, content: [text('ls')], type: 'code_block' },
            table(row(cell('table_cell', {}, paragraph(text('celda'))))),
          ),
        ),
      ),
    );
  });

  test('a task item whose first child is not a paragraph', () => {
    expectRoundTrip(
      documentWithIds(
        taskList(taskItem(false, heading(2, 'Sin párrafo'), paragraph(text('detrás'))), taskItem(true, IMAGE_NODE)),
      ),
    );
  });

  test('a task item with no id on its first paragraph keeps it without one', () => {
    expectRoundTrip(
      document(
        taskList({ attrs: { checked: true, id: 'task-1' }, content: [paragraph(text('x'))], type: 'task_item' }),
      ),
    );
  });

  test('a first paragraph with its own id and colors', () => {
    expectRoundTrip(
      documentWithIds(
        bulletList(listItem({ attrs: { ...ANNOTATIONS }, content: [text('con atributos')], type: 'paragraph' })),
      ),
    );
  });

  test('checked and unchecked task items', () => {
    expectRoundTrip(
      documentWithIds(
        taskList(
          taskItem(true, paragraph(text('a'))),
          taskItem(false, paragraph(text('b'))),
          taskItem(true, paragraph(text('c')), taskList(taskItem(false, paragraph(text('anidada'))))),
        ),
      ),
    );
  });
});

describe('round trip: tables', () => {
  test('header row, header column, spans and column widths', () => {
    expectRoundTrip(
      documentWithIds(
        table(
          row(
            cell('table_header', {}, paragraph(text('Esquina'))),
            cell('table_header', { colspan: 2, colwidth: [120, 80] }, paragraph(text('Cabecera ancha'))),
          ),
          row(
            cell('table_header', { rowspan: 2 }, paragraph(text('Lateral'))),
            cell('table_cell', { colwidth: null }, paragraph(text('a'))),
            cell('table_cell', { colspan: 1, rowspan: 1 }, paragraph(text('b'))),
          ),
          row(cell('table_cell', { colwidth: [200] }, paragraph(text('c'))), cell('table_cell', {}, paragraph())),
        ),
      ),
    );
  });

  test('a cell holding a list and an image', () => {
    expectRoundTrip(
      documentWithIds(
        table(
          row(
            cell(
              'table_cell',
              {},
              paragraph(text('Lista')),
              bulletList(listItem(paragraph(text('uno'))), listItem(paragraph(text('dos')))),
              IMAGE_NODE,
            ),
            cell('table_cell', {}, paragraph(text('Normal'))),
          ),
        ),
      ),
    );
  });
});

describe('round trip: containers', () => {
  test('a toggle with a summary and children of several kinds', () => {
    expectRoundTrip(
      documentWithIds({
        attrs: { open: true, summary: 'Detalles' },
        content: [
          paragraph(text('uno')),
          bulletList(listItem(paragraph(text('a')))),
          { attrs: { open: false, summary: 'Anidado' }, content: [paragraph()], type: 'toggle' },
        ],
        type: 'toggle',
      }),
    );
  });

  test('columns holding lists', () => {
    expectRoundTrip(
      documentWithIds({
        content: [
          { attrs: { width: 0.5 }, content: [bulletList(listItem(paragraph(text('a'))))], type: 'column' },
          { attrs: { width: 0.5 }, content: [orderedList(2, listItem(paragraph(text('b'))))], type: 'column' },
        ],
        type: 'column_list',
      }),
    );
  });

  test('a synced block, a collection reference and a subpage among text', () => {
    expectRoundTrip(
      documentWithIds(paragraph(text('antes')), SYNCED_NODE, COLLECTION_NODE, SUBPAGE_NODE, paragraph(text('después'))),
    );
  });
});

describe('round trip: nested blocks', () => {
  test('a paragraph with children', () => {
    expectRoundTrip(
      documentWithIds(nestedBlock(paragraph(text('Padre')), [paragraph(text('Uno')), paragraph(text('Dos'))])),
    );
  });

  test('the wrapper and the children wrapper keep their own attributes', () => {
    expectRoundTrip(
      documentWithIds(
        nestedBlock(
          paragraph(text('Padre')),
          [paragraph(text('Hijo'))],
          { textColor: 'red' },
          { backgroundColor: 'green' },
        ),
      ),
    );
  });

  test('a toggle that holds its own children and receives more', () => {
    expectRoundTrip(
      documentWithIds(
        nestedBlock({ attrs: { summary: 'Toggle' }, content: [paragraph(text('propio'))], type: 'toggle' }, [
          paragraph(text('añadido uno')),
          bulletList(listItem(paragraph(text('añadido dos')))),
        ]),
      ),
    );
  });

  test('a list as the first block, with children after it', () => {
    expectRoundTrip(
      documentWithIds(
        nestedBlock(
          bulletList(
            listItem(paragraph(text('a'))),
            listItem(paragraph(text('b')), bulletList(listItem(paragraph(text('propio'))))),
          ),
          [paragraph(text('hijo')), bulletList(listItem(paragraph(text('hijo en lista'))))],
        ),
        bulletList(listItem(paragraph(text('lista aparte')))),
      ),
    );
  });

  test('a nested block inside another nested block, inside the children of a third', () => {
    const inner = nestedBlock(paragraph(text('medio')), [paragraph(text('hoja'))], { textColor: 'blue' });
    const outer = nestedBlock(
      inner,
      [paragraph(text('hermano de hoja'))],
      { textColor: 'red' },
      { backgroundColor: 'gray' },
    );

    expectRoundTrip(documentWithIds(nestedBlock(outer, [nestedBlock(paragraph(text('x')), [paragraph(text('y'))])])));
  });

  test('a nested block whose block is not text', () => {
    expectRoundTrip(
      documentWithIds(
        nestedBlock(IMAGE_NODE, [paragraph(text('pie'))]),
        nestedBlock({ type: 'divider' }, [paragraph()]),
      ),
    );
  });

  test('a nested block holding an unknown node', () => {
    expectRoundTrip(
      documentWithIds(nestedBlock({ attrs: { id: 'future-9' }, type: 'sparkline' }, [paragraph(text('hijo'))])),
    );
  });
});

describe('round trip: colors', () => {
  test('every kind of node carries colors, list wrappers included', () => {
    const everyKind = Object.values(NODE_CASES).flat();
    const nested = nestedBlock(paragraph(text('Padre')), [paragraph(text('Hijo'))]);

    const content = documentWithIds(...[...everyKind, nested].map(annotate));

    expectRoundTrip(content);
  });

  test('a page with a list, a table and nested lists, all annotated', () => {
    const content = documentWithIds(
      ...[
        bulletList(listItem(paragraph(text('a')), orderedList(2, listItem(paragraph(text('b')))))),
        table(row(cell('table_header', { colspan: 2 }, paragraph(text('t'))))),
        taskList(taskItem(true, paragraph(text('c')))),
      ].map(annotate),
    );

    expectRoundTrip(content);
  });
});

describe('round trip: documents without ids', () => {
  test('come back with the same content once ids are set aside', () => {
    const content = document(
      paragraph(text('sin id')),
      bulletList(listItem(paragraph(text('a'))), listItem(paragraph(text('b')))),
      nestedBlock(paragraph(text('padre')), [paragraph(text('hijo'))]),
      table(row(cell('table_header', {}, paragraph(text('h'))))),
    );

    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));
    const rebuilt = unwrap(blocksToDocument(page, blocks));

    expect(withoutNodeIds(rebuilt)).toEqual(withoutNodeIds(content));
  });

  test('the rebuilt document gives every block the id it was derived', () => {
    const content = document(paragraph(text('uno')), paragraph(text('dos')));

    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));
    const rebuilt = unwrap(blocksToDocument(page, blocks));

    expect(rebuilt.content.map((node) => ('attrs' in node ? node.attrs?.id : undefined))).toEqual(
      blocks.map((block) => block.id),
    );
  });

  test('ordered lists with no attributes at all stay apart and keep no order', () => {
    const content = document(
      orderedList(undefined, listItem(paragraph(text('a')))),
      orderedList(undefined, listItem(paragraph(text('b')))),
    );

    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));
    const rebuilt = unwrap(blocksToDocument(page, blocks));

    expect(withoutNodeIds(rebuilt)).toEqual(withoutNodeIds(content));
  });

  test('an empty attrs object is not kept', () => {
    const content = document({ attrs: {}, content: [], type: 'paragraph' });

    const { blocks, page } = unwrap(documentToBlocks(toInput(content)));

    expect(withoutNodeIds(unwrap(blocksToDocument(page, blocks)))).toEqual(withoutNodeIds(document(paragraph())));
  });
});

describe('round trip: size and real documents', () => {
  const section = (index: number): readonly unknown[] => [
    heading(2, `Sección ${String(index)}`),
    paragraph(text('Texto con '), text('énfasis', [{ type: 'em' }]), text(' y más.')),
    bulletList(listItem(paragraph(text('a'))), listItem(paragraph(text('b')))),
    { attrs: { open: false, summary: `Resumen ${String(index)}` }, content: [paragraph(text('x'))], type: 'toggle' },
  ];

  const buildSections = (count: number): readonly unknown[] =>
    Array.from({ length: count }, (_, index) => section(index)).flat();

  const isWithinSchema = (count: number): boolean =>
    pageContentSchema.safeParse({ content: buildSections(count), schemaVersion: 1, type: 'doc' }).success;

  const findLargestSectionCount = (): number => {
    let count = 1;
    while (isWithinSchema(count + 1)) count += 1;
    return count;
  };

  test('a document at the schema node cap', () => {
    const count = findLargestSectionCount();

    expect(count).toBeGreaterThan(10);
    expectRoundTrip(documentWithIds(...buildSections(count)));
    expect(isWithinSchema(count + 1)).toBe(false);
  });

  for (const [name, content] of Object.entries(REALISTIC_DOCUMENTS)) {
    test(name, () => {
      expectRoundTrip(content);
    });
  }
});

const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const LCG_MODULUS = 4_294_967_296;
const RANDOM_DOCUMENT_COUNT = 400;
const RANDOM_DOCUMENT_MINIMUM_VALID = 300;

const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
};

const createRandomDocument = (seed: number): readonly unknown[] => {
  const random = createRandom(seed);
  const pick = (limit: number): number => Math.floor(random() * limit);
  const maybeColored = (node: FixtureNode): FixtureNode =>
    random() < 0.3 ? { ...node, attrs: { ...node.attrs, textColor: 'red' } } : node;
  const items = (depth: number): readonly unknown[] =>
    Array.from({ length: 1 + pick(3) }, () =>
      maybeColored(
        listItem(
          paragraph(text(`item ${String(pick(99))}`)),
          ...Array.from({ length: pick(3) === 0 ? 1 : 0 }, () => flowBlock(depth - 1)),
        ),
      ),
    );
  const flowBlock = (depth: number): FixtureNode => {
    const kind = depth <= 0 ? pick(2) : pick(7);
    if (kind === 0) return maybeColored(paragraph(text(`p ${String(pick(99))}`)));
    if (kind === 1) return maybeColored(heading(1 + pick(3), 'h'));
    if (kind === 2) return maybeColored(bulletList(...items(depth)));
    if (kind === 3) return maybeColored(orderedList(1 + pick(5), ...items(depth)));
    if (kind === 4)
      return maybeColored(
        taskList(taskItem(random() < 0.5, paragraph(text('t')), ...(depth > 1 ? [flowBlock(depth - 1)] : []))),
      );
    if (kind === 5) return maybeColored({ content: [flowBlock(depth - 1)], type: 'blockquote' });
    return maybeColored({ content: [flowBlock(depth - 1)], type: 'callout' });
  };
  const anyBlock = (depth: number): FixtureNode => {
    const kind = pick(6);
    if (kind === 0)
      return maybeColored(
        nestedBlock(
          flowBlock(depth),
          Array.from({ length: 1 + pick(2) }, () => anyBlock(depth - 1)),
        ),
      );
    if (kind === 1)
      return maybeColored({
        attrs: { open: random() < 0.5, summary: 'toggle' },
        content: [flowBlock(depth)],
        type: 'toggle',
      });
    if (kind === 2)
      return maybeColored(table(row(cell('table_cell', {}, flowBlock(depth)), cell('table_header', {}, paragraph()))));
    if (kind === 3) return IMAGE_NODE;
    return flowBlock(depth);
  };
  return Array.from({ length: 1 + pick(5) }, () => anyBlock(2));
};

describe('round trip: seeded random documents', () => {
  const documents = Array.from({ length: RANDOM_DOCUMENT_COUNT }, (_, seed) => createRandomDocument(seed + 1))
    .map((nodes) => pageContentSchema.safeParse({ content: nodes, schemaVersion: 1, type: 'doc' }))
    .filter((parsed) => parsed.success);

  test('enough of the generated documents are valid pages to mean something', () => {
    expect(documents.length).toBeGreaterThan(RANDOM_DOCUMENT_MINIMUM_VALID);
  });

  test('every valid one comes back as it went, with and without ids', () => {
    for (const parsed of documents) {
      expectRoundTrip(documentWithIds(...parsed.data.content));
      const { blocks, page } = unwrap(documentToBlocks(toInput(parsed.data)));
      expect(withoutNodeIds(unwrap(blocksToDocument(page, blocks)))).toEqual(withoutNodeIds(parsed.data));
    }
  });
});
