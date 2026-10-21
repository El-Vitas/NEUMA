import type { PagePropertyType } from '@neuma/shared';

/** A setting of a view that names a column, and which kind of column it takes. */
export interface McpTypedViewReference {
  readonly configurationKey: string;
  readonly input: 'coverColumn' | 'dateColumn' | 'endDateColumn';
  readonly type: PagePropertyType;
}
