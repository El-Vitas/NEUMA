'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { PagesSchemaSettingsKindOption } from '../types/pages.schema-settings.types';

interface IProps {
  readonly addLabel: string;
  readonly disabled: boolean;
  readonly initialKind: string;
  readonly kindLabel: string;
  readonly kinds: readonly PagesSchemaSettingsKindOption[];
  readonly nameLabel: string;
  readonly onAdd: (name: string, kind: string) => void;
  readonly takenNames: readonly string[];
  readonly takenWarning: string;
}

export const PagesSchemaSettingsAddRow = ({
  addLabel,
  disabled,
  initialKind,
  kindLabel,
  kinds,
  nameLabel,
  onAdd,
  takenNames,
  takenWarning,
}: IProps) => {
  const [name, setName] = useState('');
  const [kind, setKind] = useState(initialKind);
  const isTaken = takenNames.includes(name.trim());

  const addAndClearTheName = (): void => {
    onAdd(name, kind);
    setName('');
  };

  return (
    <div className="space-y-2 border-border border-t pt-3">
      <Input
        aria-label={nameLabel}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        placeholder={nameLabel}
        value={name}
      />
      <div className="flex items-center gap-2">
        <Select disabled={disabled} onValueChange={setKind} value={kind}>
          <SelectTrigger aria-label={kindLabel} className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-label={addLabel}
          className="size-11 shrink-0"
          disabled={disabled || isTaken || name.trim() === ''}
          onClick={addAndClearTheName}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {isTaken && <p className="px-1 text-muted-foreground text-xs">{takenWarning}</p>}
    </div>
  );
};
