import { describe, expect, it } from 'bun:test';
import { type PageContent, Result, USER_ROLE } from '@neuma/shared';
import { PageAccessDeniedError, PageBlockEditError, PageLockedError } from '@/modules/pages/domain/page.error';
import { PageContentService } from '@/modules/pages/page.content.service';
import type { PageContentWriter, PageWriteAuthorizer } from '@/modules/pages/types/page.types';

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

/** A page that keeps what it says, standing in for the blocks the real one writes to. */
const createPage = (holding: PageContent, refusal: PageAccessDeniedError | PageLockedError | null = null) => {
  let current = holding;
  const authorizer: PageWriteAuthorizer = {
    authorizeContentWrite: () => Promise.resolve(Result.ok(pageSaying())),
    authorizeWrite: () => Promise.resolve(refusal === null ? Result.ok(writer) : Result.fail(refusal)),
    writeContent: (_writer, rewrite) => {
      current = rewrite(current);
      return Promise.resolve(Result.ok(current));
    },
  };
  return { authorizer, read: () => current };
};

describe('PageContentService.edit', () => {
  it('edits what the page says at the moment of writing', async () => {
    const page = createPage(pageSaying('Lo que alguien acaba de escribir'));
    const service = new PageContentService(page.authorizer);

    const result = await service.edit(writer, (current) =>
      Result.ok({ ...current, content: [...current.content, paragraph('Lo del agente')] }),
    );

    expect(result.getValue()).toEqual(pageSaying('Lo que alguien acaba de escribir', 'Lo del agente'));
    expect(page.read()).toEqual(pageSaying('Lo que alguien acaba de escribir', 'Lo del agente'));
  });

  it('writes nothing when the edit cannot be done, and says why', async () => {
    const page = createPage(pageSaying('Intacta'));
    const service = new PageContentService(page.authorizer);

    const result = await service.edit(writer, () => Result.fail('The page has no block x.'));

    expect(result.getError()).toBeInstanceOf(PageBlockEditError);
    expect(result.getError().details).toBe('The page has no block x.');
    expect(page.read()).toEqual(pageSaying('Intacta'));
  });

  it('never tries an edit on a page it may not write', async () => {
    const page = createPage(pageSaying('Intacta'), new PageLockedError());
    const service = new PageContentService(page.authorizer);
    let wasTried = false;

    const result = await service.edit(writer, (current) => {
      wasTried = true;
      return Result.ok(current);
    });

    expect(result.getError()).toBeInstanceOf(PageLockedError);
    expect(wasTried).toBe(false);
  });
});

describe('PageContentService.append', () => {
  it('adds the blocks after what the page says at the moment of writing', async () => {
    const page = createPage(pageSaying('Primero'));
    const service = new PageContentService({
      ...page.authorizer,
      authorizeContentWrite: () => Promise.resolve(Result.ok(pageSaying('Agregado'))),
    });

    const result = await service.append(writer, [paragraph('Agregado')]);

    expect(result.getValue()).toEqual(pageSaying('Primero', 'Agregado'));
  });

  it('says the page is out of reach when nothing could be written to it', async () => {
    const page = createPage(pageSaying('Intacta'));
    const service = new PageContentService({
      ...page.authorizer,
      writeContent: () => Promise.resolve(Result.fail(new PageAccessDeniedError())),
    });

    const result = await service.replace(writer, pageSaying('Otra'));

    expect(result.getError()).toBeInstanceOf(PageAccessDeniedError);
  });
});
