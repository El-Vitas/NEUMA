import type { ComponentProps } from 'react';

/** The wrapper scrolls, not the table: a scrolling table stops distributing width across its columns. */
export const DocsTable = ({ children }: ComponentProps<'table'>) => (
  <div className="overflow-x-auto">
    <table className="w-full">{children}</table>
  </div>
);
