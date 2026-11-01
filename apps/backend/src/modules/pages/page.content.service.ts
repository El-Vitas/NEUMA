import { Inject, Injectable } from '@nestjs/common';
import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent, Result } from '@neuma/shared';
import { ZodError } from 'zod';
import { PageAccessDeniedError, PageBlockEditError, PageContentValidationError } from './domain/page.error';
import { PagesService } from './pages.service';
import type {
  PageContentEdit,
  PageContentRewrite,
  PageContentWriteError,
  PageContentWriter,
  PageWriteAuthorizer,
} from './types/page.types';

/**
 * Writes page content from outside the editor. The page keeps its blocks: the new document is compared with them by
 * id and only what differs is written, so open editors see the change like any other and a block nobody touched
 * keeps its history and its links.
 */
@Injectable()
export class PageContentService {
  constructor(@Inject(PagesService) private readonly pagesService: PageWriteAuthorizer) {}

  async replace(writer: PageContentWriter, content: unknown): Promise<Result<PageContent, PageContentWriteError>> {
    const allowed = await this.pagesService.authorizeContentWrite(writer, content);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const replacement = allowed.getValue();
    return this.write(writer, () => replacement);
  }

  /** Appends to the content current at write time, so concurrent appends both survive. */
  async append(
    writer: PageContentWriter,
    blocks: readonly unknown[],
  ): Promise<Result<PageContent, PageContentWriteError>> {
    const allowed = await this.pagesService.authorizeContentWrite(writer, {
      content: blocks,
      schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
      type: 'doc',
    });
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const appended = allowed.getValue().content;
    return this.write(writer, (current) => ({ ...current, content: [...current.content, ...appended] }));
  }

  /** Applies the edit to the content current at write time; if it no longer applies, nothing is written. */
  async edit(
    writer: PageContentWriter,
    edit: PageContentEdit,
  ): Promise<Result<PageContent, PageBlockEditError | PageContentWriteError>> {
    const allowed = await this.pagesService.authorizeWrite(writer);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    return this.writeEdit(writer, (current) => {
      const edited = edit(current);
      if (edited.isFail()) throw new PageBlockEditError(edited.getError());
      return edited.getValue();
    });
  }

  /** The rewrite only takes a document back, so a failed edit is thrown from it and turned back into a Result. */
  private async writeEdit(
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ): Promise<Result<PageContent, PageAccessDeniedError | PageBlockEditError | PageContentValidationError>> {
    try {
      return await this.write(writer, rewrite);
    } catch (error) {
      if (error instanceof PageBlockEditError) return Result.fail(error);
      throw error;
    }
  }

  /** Maps a document the schema refuses to a content-validation failure. */
  private async write(
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ): Promise<Result<PageContent, PageAccessDeniedError | PageContentValidationError>> {
    try {
      return await this.pagesService.writeContent(writer, rewrite);
    } catch (error) {
      if (error instanceof ZodError) return Result.fail(new PageContentValidationError(error.issues));
      throw error;
    }
  }
}
