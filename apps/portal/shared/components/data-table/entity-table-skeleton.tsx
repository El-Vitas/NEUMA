import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/shared/components/ui/page-header';
import {
  DEFAULT_SKELETON_ROW_COUNT,
  DEFAULT_STAT_CARD_GRID_CLASS,
  SKELETON_FILTER_ACTION_COUNT,
  STAT_CARD_GRID_CLASS_BY_COUNT,
} from './constants/entity-table-skeleton.constants';

interface IProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly newButtonLabel: string;
  readonly newButtonHref: string;
  readonly columnHeaders: string[];
  readonly rowCount?: number;
  readonly statCardCount?: number;
  readonly filterCount?: number;
}

export const EntityTableSkeleton = ({
  title,
  subtitle = 'Cargando...',
  newButtonLabel,
  newButtonHref,
  columnHeaders,
  rowCount = DEFAULT_SKELETON_ROW_COUNT,
  statCardCount = 0,
  filterCount = 0,
}: IProps) => {
  const statCardItems = Array.from({ length: statCardCount }, (_, index) => ({ id: `stat-card-${index}` }));
  const filterItems = Array.from({ length: filterCount }, (_, index) => ({ id: `filter-${index}` }));
  const filterActionItems = Array.from({ length: SKELETON_FILTER_ACTION_COUNT }, (_, index) => ({
    id: `filter-action-${index}`,
  }));
  const rowItems = Array.from({ length: rowCount }, (_, index) => ({ id: `skeleton-row-${index}` }));
  const columnHeaderItems = columnHeaders.map((header, index) => ({ id: `column-header-${index}`, header }));
  const statCardGridClass = STAT_CARD_GRID_CLASS_BY_COUNT[statCardCount] ?? DEFAULT_STAT_CARD_GRID_CLASS;

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        action={
          <Link
            className="inline-flex h-9 items-center gap-2 bg-primary px-4 font-semibold text-primary-foreground text-sm hover:bg-primary/90"
            href={newButtonHref}
          >
            <Plus className="size-4" />
            {newButtonLabel}
          </Link>
        }
        subtitle={subtitle}
        title={title}
      />

      {statCardItems.length > 0 && (
        <div className={`grid gap-3 ${statCardGridClass}`}>
          {statCardItems.map((item) => (
            <div className="flex flex-col gap-3 border border-border bg-card p-6" key={item.id}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-4" />
              </div>
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden border border-border bg-card">
        {filterItems.length > 0 && (
          <div className="flex w-full items-center justify-between gap-2 overflow-auto p-3">
            <div className="flex flex-1 items-center gap-2">
              {filterItems.map((item) => (
                <Skeleton className="h-7 w-18 border-dashed" key={item.id} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {filterActionItems.map((item) => (
                <Skeleton className="h-7 w-18" key={item.id} />
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columnHeaderItems.map((item) => (
                  <TableHead key={item.id}>{item.header || <Skeleton className="h-5 w-8" />}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowItems.map((row) => (
                <TableRow className="hover:bg-transparent" key={row.id}>
                  {columnHeaderItems.map((item) => (
                    <TableCell key={`${row.id}-${item.id}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex w-full items-center justify-between gap-4 overflow-auto p-3 sm:gap-8">
          <Skeleton className="h-7 w-40 shrink-0" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-18" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="hidden size-7 lg:block" />
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
              <Skeleton className="hidden size-7 lg:block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
