'use client';

import { Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { PageSchema } from '../types/pages.schema.types';
import { PagesSchemaSettingsDialog } from './pages.schema.settings-dialog';

interface IProps {
  readonly schema: PageSchema;
  readonly spaceId: string;
}

export const PagesSchemaSettingsButton = ({ schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className={cn('min-h-11 min-w-11', FOCUS_RING_CLASS)}
        data-testid="collection-settings"
        onClick={() => setIsOpen(true)}
        size="icon"
        title={t('configure')}
        type="button"
        variant="ghost"
      >
        <Settings2 aria-hidden="true" className="size-4" />
        <span className="sr-only">{t('configure')}</span>
      </Button>
      {isOpen && <PagesSchemaSettingsDialog onClose={() => setIsOpen(false)} schema={schema} spaceId={spaceId} />}
    </>
  );
};
