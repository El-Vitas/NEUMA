import type { PageViewWireOperation, UserRole } from '@neuma/shared';
import type { SchemaViewDefinition } from '../../../common/domain/schema.domain.types';
import type { PageValueListChanges } from '../domain/page-value-list.domain.types';

export interface ViewOperationsReader {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface ApplyViewOperationsInput extends ViewOperationsReader {
  readonly mutationId?: string | undefined;
  readonly operations: readonly PageViewWireOperation[];
  readonly pageId: string;
  readonly viewId: string;
}

export interface MoveRowInput extends ViewOperationsReader {
  readonly after?: string | undefined;
  readonly before?: string | undefined;
  /** Lists the row leaves and enters by what changes, such as the tags of a card that changes column. */
  readonly listChanges?: PageValueListChanges | undefined;
  readonly mutationId?: string | undefined;
  readonly pageId: string;
  readonly rowId: string;
  /** The values the row takes, by property key; null clears one. */
  readonly values: Readonly<Record<string, unknown>>;
  readonly viewId: string;
}

export interface ChangedView {
  readonly configuration: SchemaViewDefinition['configuration'];
  readonly id: string;
  readonly version: number;
}
