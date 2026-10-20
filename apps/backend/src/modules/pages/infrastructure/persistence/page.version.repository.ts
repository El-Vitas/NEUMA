import { isDeepStrictEqual } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import { pageContentSchema } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { requireRow } from '../../../../common/utils/required-row.utils';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPageDocument } from '../../domain/page.document.domain';
import { isSameEditingStretch } from '../../domain/page.version.domain';
import { pageStoredJsonSchema } from '../../schemas/page.block.schemas';
import type { PageVersionSnapshot } from '../../types/page.types';
import { PageBlockReader } from './page.block.reader';

/** The history of a page: a photo of its blocks as a document, taken where the page's content changes. */
@Injectable()
export class PageVersionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {}

  /**
   * Cuts a version when the page now says something other than its latest version. The page block is held while
   * comparing, so concurrent saves cut no duplicate and unchanged content cuts none. Saves by the same person within
   * a few minutes fold into the version they started; its number still moves forward.
   */
  async record(pageId: string, authorId: string): Promise<void> {
    await this.prisma.transaction(async (transaction) => {
      const page = await this.blockReader.lockPageBlock(pageId, transaction);
      if (page === null) return;
      const contents = await this.blockReader.readContentBlocks([pageId], transaction);
      const document = buildPageDocument(page, contents.get(pageId) ?? []);
      if (document.isFail()) {
        this.logger.error(
          { pageId },
          'a page version was not cut because the blocks of the page do not make a document',
        );
        return;
      }
      const title = readBlockTitle(page.properties);
      const versions = transaction.orm.public.PageVersion;
      const latest = await versions
        .select('content', 'createdAt', 'createdById', 'id', 'title', 'version')
        .where({ pageId })
        .orderBy((entry) => entry.version.desc())
        .first();
      if (latest !== null && latest.title === title && isDeepStrictEqual(latest.content, document.getValue())) return;
      const version = {
        content: pageStoredJsonSchema.parse(document.getValue()),
        title,
        version: (latest?.version ?? 0) + 1,
      };
      if (latest !== null && isSameEditingStretch(latest, authorId, new Date())) {
        requireRow(await versions.where({ id: latest.id }).update(version), `PageVersion ${latest.id}`);
        return;
      }
      await versions.create({ ...version, createdById: authorId, pageId });
    });
  }

  async find(pageId: string, version: number): Promise<PageVersionSnapshot | null> {
    const stored = await this.prisma.models.PageVersion.select('content', 'title', 'version')
      .where({ pageId, version })
      .first();
    if (stored === null) return null;
    const content = pageContentSchema.safeParse(stored.content);
    if (!content.success) {
      this.logger.error({ pageId, version }, 'a page version cannot be read by this version of the schema');
      return null;
    }
    return { content: content.data, title: stored.title, version: stored.version };
  }
}
