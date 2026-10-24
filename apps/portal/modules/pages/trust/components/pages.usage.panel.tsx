'use client';

import { Eye } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/shared/components/ui/popover';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { getPageUsageReportAction, updatePageUsageSettingsAction } from '../server/actions/pages.usage.actions';
import type { PageUsageReport, PageUsageSettings } from '../types/pages.usage.types';

interface IProps {
  readonly pageId: string;
}

export const PagesUsagePanel = ({ pageId }: IProps) => {
  const t = useTranslations('pages.usage');
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const trackingToggleId = useId();
  const [report, setReport] = useState<PageUsageReport | null>(null);
  const [enabled, setEnabled] = useState(true);

  const readTheReport = (isOpen: boolean): void => {
    if (!isOpen) return;
    startTransition(async () => {
      const result = await callAction(() => getPageUsageReportAction({ pageId }));
      if (!isActionSuccess<PageUsageReport>(result)) {
        toast.error(t('error'));
        return;
      }
      setReport(result.data);
      setEnabled(result.data.settings.enabled);
    });
  };

  const formatMoment = (moment: Date): string =>
    format.dateTime(moment, { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TIME_ZONE });

  const toggleTracking = (nextEnabled: boolean): void => {
    setEnabled(nextEnabled);
    startTransition(async () => {
      const result = await callAction(() => updatePageUsageSettingsAction({ enabled: nextEnabled }));
      if (!isActionSuccess<PageUsageSettings>(result)) {
        setEnabled(!nextEnabled);
        toast.error(t('error'));
        return;
      }
      setEnabled(result.data.enabled);
    });
  };

  return (
    <Popover onOpenChange={readTheReport}>
      <PopoverTrigger
        aria-label={t('title')}
        className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        <Eye aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <PopoverHeader>
          <PopoverTitle>{t('title')}</PopoverTitle>
        </PopoverHeader>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={enabled}
            disabled={isPending}
            id={trackingToggleId}
            onCheckedChange={(checked) => toggleTracking(checked === true)}
          />
          <Label className="font-normal" htmlFor={trackingToggleId}>
            {t('trackingToggle')}
          </Label>
        </div>
        {report === null ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : (
          <p className="text-muted-foreground text-sm">{t('viewCount', { count: report.summary.viewCount })}</p>
        )}
        {report !== null && report.summary.viewers.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('noViewers')}</p>
        )}
        {report !== null && report.summary.viewers.length > 0 && (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {report.summary.viewers.map((viewer) => (
              <li
                className="flex items-center justify-between gap-3 text-sm"
                key={`${viewer.id}:${viewer.viewedAt.toISOString()}`}
              >
                <span className="truncate">{viewer.name}</span>
                <span className="shrink-0 text-muted-foreground text-xs">{formatMoment(viewer.viewedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
