import { describe, expect, it } from 'bun:test';
import { PAGE_LIFECYCLE } from '@company-brain/shared';
import { createEmptyPageContent } from '@/modules/pages/lib/pages.editor.lib';
import { answersToTheName, gatherThePagesNamed, keepThePagesNamed } from '@/modules/pages/lib/pages.mentions.lib';
import type { PageSummary } from '@/modules/pages/types/pages.types';

const aPage = (
  id: string,
  title: string,
  lifecycle: PageSummary['lifecycle'] = PAGE_LIFECYCLE.ACTIVE,
): PageSummary => ({
  content: createEmptyPageContent(),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id,
  lifecycle,
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: 'space',
  title,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

describe('answersToTheName', () => {
  it('accepts a page whose title carries what was written', () => {
    expect(answersToTheName('Tasks', 'Tas')).toBe(true);
    expect(answersToTheName('QA TB-05 tareas', 'tareas')).toBe(true);
  });

  it('reads past capitals and accents, because nobody types them to look for a page', () => {
    expect(answersToTheName('Bitácora del día', 'bitacora')).toBe(true);
    expect(answersToTheName('ACUERDOS', 'acuerdos')).toBe(true);
  });

  it('refuses a page that merely resembles what was written', () => {
    expect(answersToTheName('QA plegado persistente', 'Inexistente')).toBe(false);
  });

  it('accepts anything while nothing has been written', () => {
    expect(answersToTheName('Tasks', '   ')).toBe(true);
  });
});

describe('keepThePagesNamed', () => {
  const candidates = [
    { id: '1', label: 'Tasks', spaceId: 's' },
    { id: '2', label: 'QA plegado persistente', spaceId: 's' },
    { id: '3', label: 'Task force', spaceId: 's' },
  ];

  it('keeps only the pages that answer to the name, and no more than asked', () => {
    expect(keepThePagesNamed(candidates, 'task', 5).map((candidate) => candidate.id)).toEqual(['1', '3']);
    expect(keepThePagesNamed(candidates, 'task', 1).map((candidate) => candidate.id)).toEqual(['1']);
  });

  it('leaves nothing when no page is called that', () => {
    expect(keepThePagesNamed(candidates, 'Inexistente', 5)).toEqual([]);
  });
});

describe('gatherThePagesNamed', () => {
  it('answers with a page already in hand, without waiting for the search', () => {
    const gathered = gatherThePagesNamed([aPage('1', 'Tasks')], [], 'Tas', 5);

    expect(gathered.map((candidate) => candidate.label)).toEqual(['Tasks']);
  });

  it('names a page once, however many places it came from', () => {
    const gathered = gatherThePagesNamed(
      [aPage('1', 'Tasks')],
      [{ id: '1', label: 'Tasks', spaceId: 'space' }],
      'Tas',
      5,
    );

    expect(gathered).toHaveLength(1);
  });

  it('leaves out a page that was thrown away', () => {
    const gathered = gatherThePagesNamed([aPage('1', 'Tasks', PAGE_LIFECYCLE.TRASHED)], [], 'Tas', 5);

    expect(gathered).toEqual([]);
  });

  it('still refuses what merely resembles the name', () => {
    const gathered = gatherThePagesNamed([aPage('1', 'QA plegado persistente')], [], 'Inexistente', 5);

    expect(gathered).toEqual([]);
  });
});
