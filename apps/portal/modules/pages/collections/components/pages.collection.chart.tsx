import type { PageChartKind, PageChartMeasure, PageGroupByMode } from '@neuma/shared';
import { PAGE_CHART_KIND, UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { readChartSeries } from '../lib/pages.chart.lib';
import type { PageSchemaProperty, PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionChartBars } from './pages.collection.chart.bars';
import { PagesCollectionChartLine } from './pages.collection.chart.line';
import { PagesCollectionChartPie } from './pages.collection.chart.pie';

interface IProps {
  /** The counts by group, which the database finishes after the rest of the page is drawn. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly groupBy: null | string;
  readonly kind: PageChartKind;
  readonly measure: PageChartMeasure;
  readonly mode: PageGroupByMode;
  readonly properties: readonly PageSchemaProperty[];
  /** Property summed or averaged; null when the measure counts rows. */
  readonly valueProperty: null | string;
}

export const PagesCollectionChart = async ({
  aggregates,
  groupBy,
  kind,
  measure,
  mode,
  properties,
  valueProperty,
}: IProps) => {
  const t = await getTranslations('pages.collection');
  const counted = await aggregates;
  const points =
    counted === null
      ? []
      : readChartSeries({
          aggregates: counted,
          groupBy: properties.find((property) => property.key === groupBy),
          measure,
          mode,
          statusGroupLabel: (group) => t(`statusGroups.${group}`),
          valueProperty,
        }).map((point) => (point.key === UNASSIGNED_GROUP_KEY ? { ...point, label: t('unassignedGroup') } : point));
  const measured = properties.find((property) => property.key === valueProperty);
  const label =
    measured === undefined ? t('chartMeasures.COUNT') : t(`chartMeasures.${measure}`, { property: measured.label });

  if (points.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('chartWithoutGroups')}</p>;
  }

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="text-muted-foreground text-xs">{label}</figcaption>
      {kind === PAGE_CHART_KIND.PIE && <PagesCollectionChartPie label={label} points={points} />}
      {kind === PAGE_CHART_KIND.LINE && <PagesCollectionChartLine label={label} points={points} />}
      {kind === PAGE_CHART_KIND.BAR && <PagesCollectionChartBars points={points} />}
    </figure>
  );
};
