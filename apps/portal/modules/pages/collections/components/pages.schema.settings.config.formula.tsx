'use client';

import { PAGE_FORMULA_SOURCE_MAX_LENGTH } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { checkFormulaText } from '../lib/pages.formula.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** The text of a formula, checked while it is typed with the same engine that runs it on the server. */
export const PagesSchemaSettingsConfigFormula = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const saved = property.computed?.formula?.source ?? '';
  const [text, setText] = useState(property.computedDraft?.formula ?? saved);
  const check = checkFormulaText(text, editor.properties);

  const changeText = (next: string): void => {
    setText(next);
    editor.changePropertyComputed(property.key, { formula: next, rollup: null });
  };
  const inputId = `formula-text-${property.key}`;

  return (
    <div className="space-y-1 px-2 text-sm">
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground" htmlFor={inputId}>
          {t('formulaText')}
        </label>
        <Input
          aria-invalid={!check.isValid}
          className="font-mono text-xs"
          disabled={editor.isSaving}
          id={inputId}
          maxLength={PAGE_FORMULA_SOURCE_MAX_LENGTH}
          onChange={(event) => changeText(event.target.value)}
          placeholder={t('formulaPlaceholder')}
          value={text}
        />
      </div>
      {check.isValid ? (
        <p className="text-muted-foreground text-xs" data-testid="formula-gives">
          {t('formulaGives', { type: t(`formulaTypes.${check.resultType}`) })}
        </p>
      ) : (
        <p className="text-destructive text-xs" data-testid="formula-problem" role="alert">
          {check.problem.message}
          {check.problem.suggestions.length === 0
            ? ''
            : ` ${t('formulaSuggestions', { names: check.problem.suggestions.join(', ') })}`}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{t('formulaHint')}</p>
    </div>
  );
};
