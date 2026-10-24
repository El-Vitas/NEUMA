import { readPageViewConfiguration } from '@neuma/shared';
import { PAGE_CLIENT_MODE_ROW_BYTES } from '../../local-cache/constants/local-cache.constants';
import { decideClientMode } from '../../local-cache/lib/local-cache.client-mode.lib';
import type { ClientModeDecision } from '../../local-cache/types/local-cache.types';
import type { ViewClientModeInput } from '../types/pages.client-view.types';
import { listFilterPropertyKeys } from './pages.filter-keys.lib';

/** Whether the browser can filter, sort and group this view alone, for the rows it would have to hold (ADR 029). */
export const decideViewClientMode = ({
  properties,
  quickFilter,
  search,
  view,
  visibleRowCount,
}: ViewClientModeInput): ClientModeDecision => {
  const configuration = readPageViewConfiguration(view.configuration);
  return decideClientMode({
    estimatedBytes: visibleRowCount * PAGE_CLIENT_MODE_ROW_BYTES,
    filterPropertyKeys: [...listFilterPropertyKeys(configuration.filter), ...listFilterPropertyKeys(quickFilter)],
    groupPropertyKey: configuration.groupBy,
    hasSearch: search.trim() !== '',
    properties: properties.map((property) => ({ key: property.key, type: property.type })),
    sortPropertyKeys: configuration.sorts.map((sort) => sort.propertyKey),
    visibleRowCount,
  });
};
