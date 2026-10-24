'use client';

import type { PageViewConfiguration } from '@neuma/shared';
import { diffPageViewConfigurations, readPageViewConfiguration, toPageViewEnvelope } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { callAction, hasActionError } from '@/shared/lib/action-result';
import { PAGE_KEY_SEPARATOR } from '../constants/pages.aggregates.constants';
import { applyPageViewOperationsAction } from '../server/actions/pages.collections.actions';
import type { PagesGroupCollapsing } from '../types/pages.group-collapsing.types';
import type { PageSchema } from '../types/pages.schema.types';

/**
 * Local state wins while the view is open so folding is instant; the save runs in the background without
 * refetching rows. A different `schema` from outside (another person or tab) replaces local state.
 */
export const usePagesGroupCollapsing = (
  schema: PageSchema,
  activeViewName: string,
  spaceId: string,
): PagesGroupCollapsing => {
  const tErrors = useTranslations('errors');
  const stored = readCollapsedGroups(schema, activeViewName);
  const [folded, setFolded] = useState<readonly string[]>(stored);
  // Last value the server reported, never a local toggle: otherwise the next render would undo the toggle.
  const [lastSeen, setLastSeen] = useState<readonly string[]>(stored);
  // In-flight saves; while any is pending the server does not know the latest toggle yet.
  const [travelling, setTravelling] = useState(0);

  if (travelling === 0 && lastSeen.join(PAGE_KEY_SEPARATOR) !== stored.join(PAGE_KEY_SEPARATOR)) {
    setLastSeen(stored);
    setFolded(stored);
  }

  return {
    isCollapsed: (groupKey: string) => folded.includes(groupKey),
    toggle: (groupKey: string) => {
      // Based on the local state, not the last saved one: otherwise two quick toggles would lose the first.
      const before = folded;
      const next = before.includes(groupKey) ? before.filter((key) => key !== groupKey) : [...before, groupKey];
      const view = schema.views.find((candidate) => candidate.name === activeViewName);
      if (view === undefined) return;
      setFolded(next);
      setTravelling((count) => count + 1);
      const current = readViewConfiguration(schema, activeViewName);
      const operations = diffPageViewConfigurations(current, { ...current, collapsedGroups: next });
      void callAction(() =>
        applyPageViewOperationsAction({
          operations: operations.map((operation) => {
            const { args, command, path } = toPageViewEnvelope(view.id, operation);
            return { args, command, path: [...path] };
          }),
          pageId: schema.pageId,
          spaceId,
          viewId: view.id,
        }),
      )
        .then((saved) => {
          if (!hasActionError(saved)) return;
          setFolded(before);
          toast.error(tErrors('generic'));
        })
        .finally(() => setTravelling((count) => count - 1));
    },
  };
};

const readViewConfiguration = (schema: PageSchema, activeViewName: string): PageViewConfiguration => {
  const view = schema.views.find((candidate) => candidate.name === activeViewName);
  return readPageViewConfiguration(view?.configuration ?? {});
};

const readCollapsedGroups = (schema: PageSchema, activeViewName: string): readonly string[] =>
  readViewConfiguration(schema, activeViewName).collapsedGroups;
