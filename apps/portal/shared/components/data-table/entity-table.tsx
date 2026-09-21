'use client';

import type { ColumnDef, RowData, Table as TanstackTable } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { DataTableCard } from '@/shared/components/data-table/data-table-card';
import { PageHeader } from '@/shared/components/ui/page-header';
import { useEntityTable, useNoOpExportHandlers } from '@/shared/hooks/use-entity-table.hook';
import type {
  BuildTableUrlParams,
  DataTableFeatures,
  EntityTableExportHandlers,
  UseEntityTableOptions,
} from '@/shared/types/table.types';

interface IProps<TData extends RowData> {
  readonly data: TData[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly title: string;
  readonly subtitle: string | ((total: number) => string);
  readonly buildUrl: (params: BuildTableUrlParams) => string;
  readonly columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  readonly initialState?: UseEntityTableOptions<TData>['initialState'];
  readonly newButton?: { label: string; href: string };
  readonly headerAction?: ReactNode;
  readonly extraContent?: ReactNode;
  readonly emptyMessage?: string;
  readonly emptyAction?: ReactNode;
  readonly useExportHandlers?: (table: TanstackTable<DataTableFeatures, TData>) => EntityTableExportHandlers;
}

export const EntityTable = <TData extends RowData>({
  data,
  total,
  page,
  pageSize,
  title,
  subtitle,
  buildUrl,
  columns,
  initialState,
  newButton,
  headerAction,
  extraContent,
  emptyMessage,
  emptyAction,
  useExportHandlers,
}: IProps<TData>) => {
  const stableColumns = useMemo(() => columns, [columns]);

  const { table, isLoading } = useEntityTable({
    data,
    total,
    page,
    pageSize,
    columns: stableColumns,
    buildUrl,
    initialState,
  });

  const { onExportCsv, onExportPdf, isExportingPdf } = (useExportHandlers ?? useNoOpExportHandlers)(table);

  const subtitleText = typeof subtitle === 'function' ? subtitle(total) : subtitle;

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        action={
          newButton ? (
            <a
              className="inline-flex items-center gap-2 rounded-none bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
              href={newButton.href}
            >
              <Plus className="size-4" />
              {newButton.label}
            </a>
          ) : (
            headerAction
          )
        }
        subtitle={subtitleText}
        title={title}
      />

      {extraContent}

      <DataTableCard
        emptyAction={emptyAction}
        emptyMessage={emptyMessage}
        isExportingPdf={isExportingPdf}
        isLoading={isLoading}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
        table={table}
        totalCount={total}
      />
    </div>
  );
};
