'use client';

import { Checkbox } from '@/shared/components/ui/checkbox';
import { usePagesRowSelection } from '../hooks/use.pages.row-selection';

interface IProps {
  /** Ya traducido por quien dibuja la tabla: una casilla no tiene por qué ir a buscar palabras. */
  readonly label: string;
  readonly rowId: string;
}

/** La casilla con la que una fila entra en la selección, o sale de ella. */
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
