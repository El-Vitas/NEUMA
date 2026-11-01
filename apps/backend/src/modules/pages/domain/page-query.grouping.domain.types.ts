import type { PageDateBucket, PageGroupByMode } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';

/** How a property turns into the columns of a board: which groups exist before any row says so, and how a row picks. */
export interface GroupingPlan {
  readonly bucket: PageDateBucket;
  /** The groups the property declares, in the order they read; null when the rows decide (dates, numbers, people). */
  readonly declaredKeys: readonly string[] | null;
  /** A row may sit in several groups, one per entry of its cell. */
  readonly isMultiValue: boolean;
  /** Whether a row without a value gets a group of its own. A status always has a value. */
  readonly hasUnassignedGroup: boolean;
  readonly mode: PageGroupByMode;
  readonly property: SchemaPropertyDefinition;
  /** Status grouped by its three groups: the group each option belongs to, by option id. */
  readonly statusGroupByOption: Readonly<Record<string, string>> | null;
}
