'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { usePagesRowSelection } from '../hooks/use.pages.row-selection';

interface IProps {
  readonly label: string;
  readonly rowId: string;
}

export const PagesCollectionTableRowCheckbox = ({ label, rowId }: IProps) => {
  const selection = usePagesRowSelection();
  if (selection === null) return null;

  return (
    <Checkbox
      aria-label={label}
      checked={selection.isSelected(rowId)}
      data-testid="row-checkbox"
      onCheckedChange={() => selection.toggleOne(rowId)}
    />
  );
};
