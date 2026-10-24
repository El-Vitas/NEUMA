import type { PageQueryAggregateValue, PageQueryAggregationItem, PageQueryRequest } from '@neuma/shared';
import type { McpColumnDraft, McpQueryCollectionOutput, McpRowOutput } from './mcp.collections.types';
import type { McpAssignablePerson } from './mcp.types';

export type McpAggregateValues = Readonly<Record<string, PageQueryAggregateValue>>;

export type McpOutputGroup = NonNullable<McpQueryCollectionOutput['groups']>[number];

export interface McpPlannedAggregate {
  readonly id: string;
  readonly label: string;
}

export interface McpPlannedAggregates {
  readonly items: readonly PageQueryAggregationItem[];
  readonly planned: readonly McpPlannedAggregate[];
}

/** What was asked, kept next to the request so the answer can be read back in the agent's words. */
export interface McpQueryPlan {
  readonly aggregates: readonly McpPlannedAggregate[];
  /** Set when the agent asked for one group only. */
  readonly groupKey: string | null;
  readonly groupColumn: McpColumnDraft | null;
  readonly request: PageQueryRequest;
}

export interface McpQueryDescriber {
  readonly people: readonly McpAssignablePerson[];
  readonly plan: McpQueryPlan;
  readonly rowsOf: (ids: readonly string[]) => McpRowOutput[];
}
