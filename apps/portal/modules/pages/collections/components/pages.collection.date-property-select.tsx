'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';

interface IProps {
  readonly disabled: boolean;
  /** Offered first, for "no property": a select cannot hold an empty value, so it has a key of its own. */
  readonly emptyLabel: string;
  readonly heading: string;
  readonly keys: readonly string[];
  readonly labelFor: string;
  readonly labelOf: (key: string) => string;
  readonly onChange: (key: null | string) => void;
  readonly value: null | string;
}

/** A choice among the date properties of the collection, or among none of them. */
export const PagesCollectionDatePropertySelect = ({
  disabled,
  emptyLabel,
  heading,
  keys,
  labelFor,
  labelOf,
  onChange,
  value,
}: IProps) => (
  <div className="space-y-1">
    <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">{heading}</p>
    <Select
      disabled={disabled}
      onValueChange={(chosen) => onChange(chosen === PAGE_VIEW_NO_GROUP ? null : chosen)}
      value={value ?? PAGE_VIEW_NO_GROUP}
    >
      <SelectTrigger aria-label={labelFor} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PAGE_VIEW_NO_GROUP}>{emptyLabel}</SelectItem>
        {keys.map((key) => (
          <SelectItem key={key} value={key}>
            {labelOf(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
