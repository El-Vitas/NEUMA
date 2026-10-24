'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { nameSharingSource } from '../lib/pages.sharing.lib';
import type { BlockAccess, SharingDraft, SharingScope } from '../types/pages.sharing.types';

interface IProps {
  readonly access: BlockAccess;
  readonly draft: SharingDraft;
  readonly isDisabled: boolean;
  readonly onResume: () => void;
  readonly onStop: () => void;
  readonly scope: SharingScope;
}

/** Says where the access comes from, and offers the one move that changes that: declare its own, or follow again. */
export const PagesSharingMode = ({ access, draft, isDisabled, onResume, onStop, scope }: IProps) => {
  const t = useTranslations('pages.sharing');
  const tPages = useTranslations('pages');
  const source = access.inherited.source;
  const sourceName = source === null ? '' : nameSharingSource(source, tPages('untitled'), t('sourceUnnamed'));

  if (draft.kind === 'inherit') {
    return (
      <div className="space-y-2">
        <p className="text-sm">{source === null ? t('stateSpace') : t('stateInherited', { name: sourceName })}</p>
        <Button disabled={isDisabled} onClick={onStop} size="sm" type="button" variant="outline">
          {t('stopInheriting')}
        </Button>
        <p className="text-muted-foreground text-xs">{t('stopInheritingHint', { scope })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">{t('stateDeclared')}</p>
      <Button disabled={isDisabled} onClick={onResume} size="sm" type="button" variant="outline">
        {source === null ? t('resumeFromSpace') : t('resumeFromSource', { name: sourceName })}
      </Button>
    </div>
  );
};
