import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { PAGES_LIST_IS_NOT_A_LIST } from '@/modules/pages/constants/pages.constants';

const warnings: { op: string; unreadable: number }[] = [];

mock.module('@/lib/logger', () => ({
  logger: {
    error: () => undefined,
    info: () => undefined,
    warn: (entry: { op: string; unreadable: number }) => warnings.push(entry),
  },
}));

mock.module('server-only', () => ({}));

const { readPagesThatCanBeRead } = await import('@/modules/pages/server/lib/pages.reading.server');

const aPage = (id: string, title: string) => ({
  content: {
    content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: { id: 'user-a', name: 'Alguien' },
  cover: null,
  icon: null,
  id,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  order: 0,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-a',
  title,
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: { id: 'user-a', name: 'Alguien' },
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
});

/** Un documento sin un solo bloque: lo que deja en la base una versión distinta o un arreglo a mano. */
const anUnreadablePage = () => ({
  ...aPage('page-rota', 'Rota'),
  content: { content: [], schemaVersion: 1, type: 'doc' },
});

describe('leer la lista de páginas de un espacio', () => {
  beforeEach(() => {
    warnings.length = 0;
  });

  /**
   * Si una página estropeada tumbara la lista, el espacio entero dejaría de
   * responder y ninguna de sus páginas se podría abrir, no solo la estropeada.
   */
  it('leaves out the page it cannot read and keeps the rest', () => {
    const read = readPagesThatCanBeRead(
      [aPage('page-a', 'Una'), anUnreadablePage(), aPage('page-b', 'Otra')],
      'getPages',
    );

    expect(read.map((page) => page.id)).toEqual(['page-a', 'page-b']);
  });

  /** Una página que desaparece del costado sin que nadie se entere es la otra manera de perderla. */
  it('says how many were left out, and from where', () => {
    readPagesThatCanBeRead([aPage('page-a', 'Una'), anUnreadablePage()], 'getPages');

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ op: 'getPages', unreadable: 1 });
  });

  it('says nothing when every page could be read', () => {
    const read = readPagesThatCanBeRead([aPage('page-a', 'Una')], 'getPages');

    expect(read).toHaveLength(1);
    expect(warnings).toHaveLength(0);
  });

  /** Una respuesta que ni siquiera es una lista no es una página estropeada: es otra cosa. */
  it('refuses a response that is not a list at all', () => {
    expect(() => readPagesThatCanBeRead({ items: [] }, 'getPages')).toThrow(PAGES_LIST_IS_NOT_A_LIST);
  });
});
