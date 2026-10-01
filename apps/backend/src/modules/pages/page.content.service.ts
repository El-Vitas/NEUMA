import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent, Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import { PAGE_LIVE_DOCUMENT } from './constants/pages.constants';
import { PageBlockEditError, PageContentValidationError } from './domain/page.error';
import { PagesService } from './pages.service';
import type {
  PageContentEdit,
  PageContentRewrite,
  PageContentWriteError,
  PageContentWriter,
  PageLiveDocument,
  PageWriteAuthorizer,
} from './types/page.types';

/**
 * Escribir el contenido de una página desde fuera del editor: el autoguardado
 * de quien no tiene la edición en vivo, los bloques que se mueven a otra página
 * y lo que escribe un agente. Todo pasa por el documento en vivo, así quien
 * tenga la página abierta lo ve al momento y el contenido guardado sale siempre
 * del mismo lugar.
 */
@Injectable()
export class PageContentService {
  constructor(
    @Inject(PagesService) private readonly pagesService: PageWriteAuthorizer,
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

  /**
   * Cambia bloques de lo que la página dice en el momento de escribir: poner,
   * cambiar, quitar o mover, sobre la página de ese instante y no sobre la que
   * alguien leyó antes. Si el cambio ya no se puede hacer —el bloque se fue,
   * el lugar no lo admite—, no se escribe nada.
   */
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

  /**
   * El documento en vivo solo recibe una reescritura, sin forma de decir «no»:
   * un cambio que ya no se podía hacer sale de ella como error y vuelve aquí
   * como tal, antes de que el documento cambie.
   */
  private async writeEdit(
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ): Promise<Result<PageContent, PageBlockEditError | PageContentValidationError>> {
    try {
      return await this.write(writer, rewrite);
    } catch (error) {
      if (error instanceof PageBlockEditError) return Result.fail(error);
      throw error;
    }
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
