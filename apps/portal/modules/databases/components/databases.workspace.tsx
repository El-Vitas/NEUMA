'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { getBoardGroupingProperty, getDatabaseViewType } from '../lib/databases.lib';
import type { DatabaseRecord, DatabaseSummary, DatabaseView } from '../types/databases.types';
import { DatabasesBoard } from './databases.board';
import { DatabasesTable } from './databases.table';

interface IProps {
  readonly database: DatabaseSummary;
  readonly records: readonly DatabaseRecord[];
}

export const DatabasesWorkspace = ({ database, records }: IProps) => {
  const t = useTranslations('databases');
  const availableViews: readonly DatabaseView[] =
    database.views.length > 0
      ? database.views
      : [{ configuration: {}, isDefault: true, name: t('views.TABLE'), type: 'TABLE' as const }];
  const initialView = availableViews.find((view) => view.isDefault) ?? availableViews[0];
  const [viewType, setViewType] = useState(initialView.type);
  const boardView = availableViews.find((view) => view.type === 'BOARD');
  const boardProperty = getBoardGroupingProperty(database.properties, boardView?.configuration ?? {});

  return (
    <Tabs onValueChange={(value) => setViewType(getDatabaseViewType(value))} value={viewType}>
      <TabsList aria-label={t('viewsLabel')} className="min-h-11 max-w-full overflow-x-auto" variant="line">
        {availableViews.map((view) => (
          <TabsTrigger key={view.type} value={view.type}>
            {view.name}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="TABLE">
        <DatabasesTable properties={database.properties} records={records} />
      </TabsContent>
      <TabsContent value="BOARD">
        <DatabasesBoard property={boardProperty} records={records} />
      </TabsContent>
    </Tabs>
  );
};
