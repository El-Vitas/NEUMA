import { Inject, Injectable } from '@nestjs/common';
import { isPageComputedPropertyType, Result, type UserRole } from '@neuma/shared';
import { PAGE_QUERY_CLOCK, PAGE_QUERY_DEFAULT_TIME_ZONE, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import type { PageQueryTooManyRestrictedRowsError } from './domain/page-query.error';
import { PageComputedService } from './page-computed.service';
import type { PageSummary } from './types/page.types';
import type { PageQueryClock } from './types/page-query.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';

/** A row opened on its own page shows the same formulas and rollups as in its collection, for the same reader. */
@Injectable()
export class PageRowComputedService {
  constructor(
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(PAGE_QUERY_CLOCK) private readonly clock: PageQueryClock,
    private readonly computedService: PageComputedService,
  ) {}

  async attach(
    page: PageSummary,
    reader: { readonly role: UserRole; readonly userId: string; readonly workspaceId: string },
  ): Promise<Result<PageSummary, PageQueryTooManyRestrictedRowsError>> {
    if (page.parentId === null) return Result.ok(page);
    const schema = await this.pageSchemaRepository.getSchema(page.parentId);
    if (!schema.properties.some((property) => isPageComputedPropertyType(property.type))) return Result.ok(page);
    const attached = await this.computedService.attach([page], {
      collectionId: page.parentId,
      context: { nowMilliseconds: this.clock.now().getTime(), timeZone: PAGE_QUERY_DEFAULT_TIME_ZONE },
      properties: schema.properties,
      viewer: reader,
    });
    if (attached.isFail()) return Result.fail(attached.getError());
    return Result.ok(attached.getValue()[0] ?? page);
  }
}
