import { Inject, Injectable } from '@nestjs/common';
import { PAGE_OUTLINE_REPOSITORY } from './constants/pages.constants';
import type {
  PageAncestor,
  PageOutlineEntry,
  PageOutlinePlace,
  PageOutlineReader,
  PageOutlineRepositoryContract,
} from './types/page-outline.types';

/** Recorrer el árbol de páginas sin abrirlas: qué cuelga de cada una, de dónde cuelga, y cuáles se pueden ver. */
@Injectable()
export class PageOutlineService {
  constructor(@Inject(PAGE_OUTLINE_REPOSITORY) private readonly outlineRepository: PageOutlineRepositoryContract) {}

  listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
  ): Promise<readonly PageOutlineEntry[]> {
    return this.outlineRepository.listChildren(spaceId, parentId, reader);
  }

  listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageAncestor[]> {
    return this.outlineRepository.listAncestors(pageId, reader);
  }

  listReadable(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageOutlinePlace[]> {
    return this.outlineRepository.listReadable(pageIds, reader);
  }
}
