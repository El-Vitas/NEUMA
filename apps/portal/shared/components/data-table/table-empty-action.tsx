import Link from 'next/link';

interface IProps {
  readonly isEmpty: boolean;
  readonly hasActiveFilter: boolean;
  readonly clearHref: string;
  readonly createHref: string;
  readonly createLabel: string;
}

export const TableEmptyAction = ({ isEmpty, hasActiveFilter, clearHref, createHref, createLabel }: IProps) => {
  if (!isEmpty) return null;

  if (hasActiveFilter) {
    return (
      <Link
        className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2 font-medium text-foreground text-sm hover:bg-accent"
        href={clearHref}
      >
        Limpiar filtros
      </Link>
    );
  }

  return (
    <Link
      className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
      href={createHref}
    >
      {createLabel}
    </Link>
  );
};
