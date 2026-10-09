import { describe, expect, it } from 'bun:test';
import { type PageContent, Result, USER_ROLE } from '@neuma/shared';
import { PageAccessDeniedError, PageBlockEditError, PageLockedError } from '@/modules/pages/domain/page.error';
import { PageContentService } from '@/modules/pages/page.content.service';
import type { PageContentWriter, PageLiveDocument, PageWriteAuthorizer } from '@/modules/pages/types/page.types';

const writer: PageContentWriter = {
  pageId: 'page-a',
  role: USER_ROLE.WORKER,
  spaceId: 'space-a',
  userId: 'user-a',
  workspaceId: 'workspace-a',
};

const paragraph = (text: string) => ({ content: [{ text, type: 'text' as const }], type: 'paragraph' as const });

const pageSaying = (...texts: readonly string[]): PageContent => ({
  content: texts.map(paragraph),
  schemaVersion: 1,
  type: 'doc',
});

const createLiveDocument = (holding: PageContent) => {
  let current = holding;
  const liveDocument: PageLiveDocument = {
    readLoadedPageContent: () => current,
    writePageContent: (_writer, rewrite) => {
      current = rewrite(current);
      return Promise.resolve(current);
    },
  };
  return { liveDocument, read: () => current };
};

const allowing = (refusal: PageAccessDeniedError | PageLockedError | null = null): PageWriteAuthorizer => ({
  authorizeContentWrite: () => Promise.resolve(Result.ok(pageSaying())),
  authorizeWrite: () => Promise.resolve(refusal === null ? Result.ok(writer) : Result.fail(refusal)),
});

describe('PageContentService.edit', () => {
  it('edits what the page says at the moment of writing', async () => {
    const live = createLiveDocument(pageSaying('Lo que alguien acaba de escribir'));
    const service = new PageContentService(allowing(), live.liveDocument);

    const result = await service.edit(writer, (current) =>
      Result.ok({ ...current, content: [...current.content, paragraph('Lo del agente')] }),
    );

    expect(result.getValue()).toEqual(pageSaying('Lo que alguien acaba de escribir', 'Lo del agente'));
    expect(live.read()).toEqual(pageSaying('Lo que alguien acaba de escribir', 'Lo del agente'));
  });

  it('writes nothing when the edit cannot be done, and says why', async () => {
    const live = createLiveDocument(pageSaying('Intacta'));
    const service = new PageContentService(allowing(), live.liveDocument);

    const result = await service.edit(writer, () => Result.fail('The page has no block x.'));

    expect(result.getError()).toBeInstanceOf(PageBlockEditError);
    expect(result.getError().details).toBe('The page has no block x.');
    expect(live.read()).toEqual(pageSaying('Intacta'));
  });

  it('never tries an edit on a page it may not write', async () => {
    const live = createLiveDocument(pageSaying('Intacta'));
    const service = new PageContentService(allowing(new PageLockedError()), live.liveDocument);
    let wasTried = false;

    const result = await service.edit(writer, (current) => {
      wasTried = true;
      return Result.ok(current);
    });

    expect(result.getError()).toBeInstanceOf(PageLockedError);
    expect(wasTried).toBe(false);
  });
});
