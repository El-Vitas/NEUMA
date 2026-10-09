'use client';

import {
  listPageChartMeasuresFor,
  PAGE_CHART_KIND_VALUES,
  PAGE_CHART_MEASURE,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { listNumberPropertyKeys } from '../lib/pages.chart-properties.lib';
import { readPropertyLabel } from '../lib/pages.properties.lib';
import { readPageChartKind, readPageChartMeasure } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly view: PageSchemaView;
}

/** Grouping is not chosen here: it is the chart's axis. Sum and average are offered only with a numeric property. */
export const PagesSchemaSettingsViewChart = ({ editor, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  const numbers = listNumberPropertyKeys(editor.properties);
  const measures = listPageChartMeasuresFor(numbers.length > 0);
  const labelOf = (key: string): string => readPropertyLabel(editor.properties, key);

  return (
    <>
      <div className="space-y-2">
        <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('chartKind')}</p>
        <Select
          disabled={editor.isSaving}
          onValueChange={(value) => editor.drawViewAs(view.name, readPageChartKind(value))}
          value={configuration.chartKind}
        >
          <SelectTrigger aria-label={t('chartKindFor', { view: view.name })} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_CHART_KIND_VALUES.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(`chartKinds.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('chartMeasure')}</p>
        <Select
          disabled={editor.isSaving}
          onValueChange={(value) =>
            editor.measureViewBy(
              view.name,
              readPageChartMeasure(value),
              configuration.chartValueProperty ?? numbers[0] ?? null,
            )
          }
          value={configuration.chartMeasure}
        >
          <SelectTrigger aria-label={t('chartMeasureFor', { view: view.name })} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {measures.map((measure) => (
              <SelectItem key={measure} value={measure}>
                {t(`chartMeasures.${measure}`, {
                  property: labelOf(configuration.chartValueProperty ?? numbers[0] ?? ''),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {configuration.chartMeasure !== PAGE_CHART_MEASURE.COUNT && numbers.length > 1 && (
        <div className="space-y-2">
          <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('chartValueProperty')}</p>
          <Select
            disabled={editor.isSaving}
            onValueChange={(value) => editor.measureViewBy(view.name, configuration.chartMeasure, value)}
            value={configuration.chartValueProperty ?? numbers[0] ?? ''}
          >
            <SelectTrigger aria-label={t('chartValuePropertyFor', { view: view.name })} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {numbers.map((key) => (
                <SelectItem key={key} value={key}>
                  {labelOf(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
};
