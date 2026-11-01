import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { readPageDefaultTemplateId } from '@neuma/shared';
import type { AccessiblePage, PageViewer } from '../../types/page.block.types';
import { PageBlockReader } from './page.block.reader';

/** Reads the templates of a collection with the eyes of whoever asks: a template is as open as its collection. */
@Injectable()
export class PageTemplateRepository {
  constructor(private readonly blockReader: PageBlockReader) {}

  /** The collection if the viewer can open it and it is alive. */
  async findCollection(collectionId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const blocks = await this.blockReader.readPageBlocks([collectionId]);
    const [collection] = await this.blockReader.keepAccessible(blocks, viewer);
    return collection === undefined || collection.access.isInTrash ? null : collection;
  }

  /** The live templates of the collection that the viewer can open, in the order they were made. */
  async listTemplates(collectionId: string, viewer: PageViewer): Promise<readonly AccessiblePage[]> {
    const blocks = await this.blockReader.readTemplatesUnder(collectionId);
    const accessible = await this.blockReader.keepAccessible(blocks, viewer);
    return accessible.filter(({ access, block }) => !access.isInTrash && block.lifecycle === PageLifecycle.ACTIVE);
  }

  async findTemplate(collectionId: string, templateId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const templates = await this.listTemplates(collectionId, viewer);
    return templates.find(({ block }) => block.id === templateId) ?? null;
  }

  /** The default of a collection, only if that template is still there for this viewer. */
  async findDefaultTemplate(collection: AccessiblePage, viewer: PageViewer): Promise<AccessiblePage | null> {
    const templateId = readPageDefaultTemplateId(collection.block.properties);
    return templateId === null ? null : this.findTemplate(collection.block.id, templateId, viewer);
  }
}
