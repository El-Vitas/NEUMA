import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent, Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import { PAGE_LIVE_DOCUMENT } from './constants/pages.constants';
import { PageContentValidationError } from './domain/page.error';
import { PagesService } from './pages.service';
import type {
  PageContentRewrite,
  PageContentWriteError,
  PageContentWriter,
  PageLiveDocument,
} from './types/page.types';

/**
 * Escribir el contenido de una página desde fuera del editor: el autoguardado
 * de quien no tiene la edición en vivo, los bloques que se mueven a otra página
 * y, más adelante, lo que escribe un agente. Todo pasa por el documento en
 * vivo, así quien tenga la página abierta lo ve al momento y el contenido
 * guardado sale siempre del mismo lugar.
 */
@Injectable()
export class PageContentService {
  constructor(
    private readonly pagesService: PagesService,
    @Inject(PAGE_LIVE_DOCUMENT) private readonly liveDocument: PageLiveDocument,
  ) {}

  async replace(writer: PageContentWriter, content: unknown): Promise<Result<PageContent, PageContentWriteError>> {
    const allowed = await this.pagesService.authorizeContentWrite(writer, content);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const replacement = allowed.getValue();
    return this.write(writer, () => replacement);
  }

  /**
   * Agrega bloques al final de lo que la página dice en el momento de escribir,
   * no de lo que decía cuando alguien la leyó: dos agregados a la vez quedan los dos.
   */
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

  /** El documento en vivo es infraestructura: lo que rechaza por no calzar vuelve como un error de contenido. */
  private async write(
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ): Promise<Result<PageContent, PageContentValidationError>> {
    try {
      return Result.ok(await this.liveDocument.writePageContent(writer, rewrite));
    } catch (error) {
      if (error instanceof ZodError) return Result.fail(new PageContentValidationError(error.issues));
      throw error;
    }
  }
}
