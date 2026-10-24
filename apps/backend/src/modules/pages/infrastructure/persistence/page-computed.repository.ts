import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import type { PagePropertyValue, PagePropertyValues } from '@neuma/shared';
import { isPageTemplate, withPageDerivedValues } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { isPropertyValue } from '../../../../common/domain/schema-property.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NULLABLE_TEXT, PLAIN_TEXT, ROW } from '../../constants/page-query.sql.constants';
import { PAGE_COMPUTED_READ_BATCH_SIZE } from '../../constants/pages.constants';
import { readPageValues } from '../../domain/page.block.domain';
import type { ComputedRowInput } from '../../domain/page-computed.domain.types';
import { cellOf } from './page-query.cell.sql';
import { frag, isNotTemplateSql, sqlParameter, sqlText, sqlTextList, toRawStatement } from './page-query.sql.lib';

const rowColumn = (column: string) => sqlText(`"${ROW}"."${column}"`);

/** Reads the rows a rollup summarises, in the light form formulas need: their values and what their block says. */
@Injectable()
export class PageComputedRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The live rows of the collection among `rowIds`, as formulas read them. Rows the reader cannot open are the
   * caller's to leave out through `excludedIds`: a row is never read to be thrown away afterwards.
   */
  async readRowsForComputation(
    collectionId: string,
    rowIds: readonly string[],
    excludedIds: ReadonlySet<string>,
    properties: readonly SchemaPropertyDefinition[],
  ): Promise<readonly ComputedRowInput[]> {
    const wanted = rowIds.filter((id) => !excludedIds.has(id));
    const rows: ComputedRowInput[] = [];
    for (let start = 0; start < wanted.length; start += PAGE_COMPUTED_READ_BATCH_SIZE) {
      const batch = wanted.slice(start, start + PAGE_COMPUTED_READ_BATCH_SIZE);
      const blocks = await this.prisma.models.Block.select(
        'createdAt',
        'createdById',
        'editedAt',
        'editedById',
        'id',
        'properties',
        'text',
      )
        .where({ lifecycle: PageLifecycle.ACTIVE, parentId: collectionId, type: 'page' })
        .where((block) => block.id.in(batch))
        .all();
      for (const block of blocks) {
        if (isPageTemplate(block.properties)) continue;
        rows.push({ id: block.id, values: this.toValues(block, properties) });
      }
    }
    return rows;
  }

  /**
   * What one property holds in each of the live rows among `rowIds`, read as the query compiler reads a cell (so a
   * title, a creation date or a stored value all come out as they would in a filter) and without the rest of the row.
   * A row that holds nothing there is in the map with no value; a row that is gone or closed is not in it. The ids in
   * `excludedIds` are never asked for.
   */
  async readCellValues(
    collectionId: string,
    rowIds: readonly string[],
    excludedIds: ReadonlySet<string>,
    property: SchemaPropertyDefinition,
  ): Promise<ReadonlyMap<string, PagePropertyValue | undefined>> {
    const wanted = rowIds.filter((id) => !excludedIds.has(id));
    if (wanted.length === 0) return new Map();
    const cell = cellOf(property, { computedValues: new Map(), timeZone: 'UTC', unreadableRelations: new Map() });
    const statement = frag`SELECT ${rowColumn('id')} AS "id", (${cell})::text AS "value"
      FROM "Block" AS "${sqlText(ROW)}"
      WHERE ${rowColumn('parentId')} = ${sqlParameter(collectionId, 'text')}
        AND ${rowColumn('type')} = 'page' AND ${rowColumn('lifecycle')} = 'ACTIVE'
        AND ${isNotTemplateSql(ROW)}
        AND ${rowColumn('id')} = ANY(${sqlTextList(wanted)})`;
    const rows = await this.prisma.runner.query(
      toRawStatement(this.prisma.sql, statement).returnsRow({ id: PLAIN_TEXT, value: NULLABLE_TEXT }).build(),
    );
    const values = new Map<string, PagePropertyValue | undefined>();
    for (const row of rows) {
      const value: unknown = typeof row.value === 'string' ? JSON.parse(row.value) : undefined;
      values.set(row.id, isPropertyValue(value) ? value : undefined);
    }
    return values;
  }

  private toValues(
    block: {
      readonly createdAt: Date;
      readonly createdById: string;
      readonly editedAt: Date;
      readonly editedById: string;
      readonly properties: unknown;
      readonly text: string;
    },
    properties: readonly SchemaPropertyDefinition[],
  ): PagePropertyValues {
    const stored = withPageDerivedValues(properties, readPageValues(block.properties) ?? {}, {
      createdAt: block.createdAt.toISOString(),
      createdById: block.createdById,
      editedAt: block.editedAt.toISOString(),
      editedById: block.editedById,
    });
    const title = properties.find((property) => property.type === 'TITLE');
    return title === undefined ? stored : { ...stored, [title.key]: block.text };
  }
}
