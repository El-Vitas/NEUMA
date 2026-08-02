export interface EntitySelectOption {
  readonly value: string;
  readonly label: string;
  readonly sublabel?: string;
  readonly sublabelMono?: boolean;
  readonly searchValue?: string;
  readonly triggerLabel?: string;
}

export interface EntitySelectProps {
  readonly options: EntitySelectOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly searchPlaceholder: string;
  readonly emptyText: string;
  readonly addNewHref?: string;
  readonly addNewLabel?: string;
}
