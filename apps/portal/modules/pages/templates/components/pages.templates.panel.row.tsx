'use client';

import { Pencil, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import type { PagesTemplatesEditing, PageTemplate } from '../types/pages.templates.types';
import { PagesTemplatesPanelVariables } from './pages.templates.panel.variables';

interface IProps {
  readonly editing: PagesTemplatesEditing;
  /** Whether it is the default, as the panel shows it now: a choice not yet confirmed counts. */
  readonly isDefault: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  readonly template: PageTemplate;
}

export const PagesTemplatesPanelRow = ({ editing, isDefault, properties, spaceId, template }: IProps) => {
  const t = useTranslations('pages.templates');
  const [title, setTitle] = useState(template.title);

  const renameIfChanged = (): void => {
    const wanted = title.trim();
    if (wanted === '') setTitle(template.title);
    else if (wanted !== template.title) editing.rename(template, wanted);
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-2" data-testid="template-row">
      <div className="flex items-center gap-1">
        <Input
          aria-label={t('renameLabel')}
          data-testid="template-name"
          disabled={editing.isPending}
          onBlur={renameIfChanged}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          value={title}
        />
        <Button
          aria-label={isDefault ? t('stopDefault') : t('makeDefault')}
          aria-pressed={isDefault}
          className={cn('size-9 shrink-0', FOCUS_RING_CLASS)}
          data-testid="template-default"
          disabled={editing.isPending}
          onClick={() => editing.setDefault(isDefault ? null : template)}
          size="icon"
          title={isDefault ? t('stopDefault') : t('makeDefault')}
          type="button"
          variant="ghost"
        >
          <Star aria-hidden="true" className={cn('size-4', isDefault && 'fill-current')} />
        </Button>
        <Button
          aria-label={t('delete')}
          className={cn('size-9 shrink-0', FOCUS_RING_CLASS)}
          data-testid="template-delete"
          disabled={editing.isPending}
          onClick={() => editing.remove(template)}
          size="icon"
          title={t('delete')}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Link
        className={cn(
          'inline-flex min-h-9 items-center gap-1 px-1 text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline',
          FOCUS_RING_CLASS,
        )}
        data-testid="template-edit"
        href={ROUTES.PORTAL_SPACE_PAGE(spaceId, template.id)}
      >
        <Pencil aria-hidden="true" className="size-3" />
        {t('edit')}
      </Link>
      <PagesTemplatesPanelVariables editing={editing} properties={properties} template={template} />
    </div>
  );
};
