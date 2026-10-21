'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { findRelationWithoutTarget } from '../lib/pages.schema-editing.lib';
import { readWhatIsMissing } from '../lib/pages.schema-settings.lib';
import { findBoardWithoutGrouping } from '../lib/pages.view-editing.lib';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
}

/** Saving is held back, with the reason said, while the shape could not be drawn or pointed anywhere. */
export const PagesSchemaSettingsFooter = ({ editor }: IProps) => {
  const t = useTranslations('pages.collection');
  const boardWithoutGrouping = findBoardWithoutGrouping(editor.views, editor.properties);
  const relationWithoutTarget = findRelationWithoutTarget(editor.properties);
  const whatIsMissing = readWhatIsMissing(
    boardWithoutGrouping === undefined ? null : t('boardNeedsGrouping', { view: boardWithoutGrouping.name }),
    relationWithoutTarget === undefined ? null : t('relationNeedsTarget', { property: relationWithoutTarget.label }),
  );

  return (
    /* The bottom padding accounts for the system bar on mobile. */
    <div className="shrink-0 space-y-2 border-border border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {whatIsMissing !== null && <p className="px-1 text-muted-foreground text-xs">{whatIsMissing}</p>}
      {whatIsMissing === null && editor.hasUnsavedChanges && (
        <p className="flex items-center gap-1.5 px-1 text-muted-foreground text-xs">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
          {t('unsavedChanges')}
        </p>
      )}
      <Button
        className="min-h-11 w-full"
        disabled={editor.isSaving || whatIsMissing !== null}
        onClick={editor.save}
        type="button"
      >
        {t('save')}
      </Button>
    </div>
  );
};
