'use client';

import { listPageRollupCalculationsFor, PAGE_PROPERTY_TYPE, readPageRollupTargetType } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { toFormulaPropertyInfo } from '../lib/pages.formula.lib';
import { readPageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** A rollup follows a relation and summarises one property of the rows it links with one calculation. */
export const PagesSchemaSettingsConfigRollup = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const [target, setTarget] = useState<PageSchema | null>(null);
  const [, startAsking] = useTransition();
  const saved = property.computed?.rollup ?? null;
  const draft = property.computedDraft?.rollup ?? null;
  const relationKey = draft?.relationPropertyKey ?? saved?.relationPropertyKey ?? '';
  const targetKey = draft?.targetPropertyKey ?? saved?.targetPropertyKey ?? '';
  const calculation = draft?.calculation ?? saved?.calculation ?? '';
  const relations = editor.properties.filter(
    (candidate) => candidate.type === PAGE_PROPERTY_TYPE.RELATION && candidate.config.targetCollectionId !== null,
  );
  const targetProperty = target?.properties.find((candidate) => candidate.key === targetKey);
  const calculations =
    targetProperty === undefined
      ? []
      : listPageRollupCalculationsFor(readPageRollupTargetType(toFormulaPropertyInfo(targetProperty)));

  const change = (changes: { calculation?: string; relation?: string; target?: string }): void => {
    editor.changePropertyComputed(property.key, {
      formula: null,
      rollup: {
        calculation: changes.calculation ?? calculation,
        relationPropertyKey: changes.relation ?? relationKey,
        targetPropertyKey: changes.target ?? targetKey,
      },
    });
  };

  const chooseRelation = (key: string): void => {
    const collectionId = relations.find((candidate) => candidate.key === key)?.config.targetCollectionId;
    change({ calculation: '', relation: key, target: '' });
    setTarget(null);
    if (collectionId === null || collectionId === undefined) return;
    startAsking(async () => {
      const asked = await callAction(() => readPageCollectionAction({ pageId: collectionId, spaceId: editor.spaceId }));
      if (isActionSuccess<PageSchema | null>(asked)) setTarget(asked.data);
    });
  };

  const chooseTarget = (key: string): void => {
    const chosen = target?.properties.find((candidate) => candidate.key === key);
    const first =
      chosen === undefined
        ? ''
        : (listPageRollupCalculationsFor(readPageRollupTargetType(toFormulaPropertyInfo(chosen)))[0] ?? '');
    change({ calculation: first, target: key });
  };

  return (
    <div className="space-y-2 px-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-muted-foreground">{t('rollupRelation')}</span>
        <Select disabled={editor.isSaving} onValueChange={chooseRelation} value={relationKey}>
          <SelectTrigger aria-label={t('rollupRelation')} className="w-44">
            <SelectValue placeholder={t('rollupRelationPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {relations.map((relation) => (
              <SelectItem key={relation.key} value={relation.key}>
                {relation.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-muted-foreground">{t('rollupProperty')}</span>
        <Select disabled={editor.isSaving || target === null} onValueChange={chooseTarget} value={targetKey}>
          <SelectTrigger aria-label={t('rollupProperty')} className="w-44">
            <SelectValue placeholder={t('rollupPropertyPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {(target?.properties ?? []).map((candidate) => (
              <SelectItem key={candidate.key} value={candidate.key}>
                {candidate.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-muted-foreground">{t('rollupCalculation')}</span>
        <Select
          disabled={editor.isSaving || calculations.length === 0}
          onValueChange={(chosen) => change({ calculation: chosen })}
          value={calculation}
        >
          <SelectTrigger aria-label={t('rollupCalculation')} className="w-44">
            <SelectValue placeholder={t('rollupCalculationPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {calculations.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {t(`calculations.${candidate}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {saved !== null && draft === null ? (
        <p className="text-muted-foreground text-xs">
          {t('rollupSaved', { calculation: t(`calculations.${saved.calculation}`) })}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">{t('rollupHint')}</p>
    </div>
  );
};
