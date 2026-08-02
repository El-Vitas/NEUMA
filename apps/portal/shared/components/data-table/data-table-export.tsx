'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableExportProps {
  readonly variant?: 'button' | 'icon';
  readonly onExportCsv?: () => void;
  readonly onExportPdf?: () => void;
  readonly isExportingPdf?: boolean;
}

export const DataTableExport = ({
  variant = 'button',
  onExportCsv,
  onExportPdf,
  isExportingPdf,
}: DataTableExportProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button className="h-9 rounded-none px-2 text-foreground" size="sm" variant="outline">
            <Download className="size-4" />
          </Button>
        ) : (
          <Button className="h-9 rounded-none text-foreground" size="sm" variant="outline">
            <Download className="mr-1.5 size-4" />
            Exportar
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={isExportingPdf} onClick={onExportPdf}>
          <FileText className="mr-2 size-4" />
          {isExportingPdf ? 'Generando PDF...' : 'Exportar como PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCsv}>
          <FileSpreadsheet className="mr-2 size-4" />
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
