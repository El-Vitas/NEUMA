export type PagesAutosaveStatus = 'error' | 'idle' | 'saved' | 'saving';

export interface PagesAutosaveOptions {
  readonly enabled: boolean;
  readonly onSave: () => Promise<boolean>;
}

export interface PagesAutosaveResult {
  readonly cancel: () => void;
  readonly hasError: boolean;
  readonly hasSaved: boolean;
  readonly isSaving: boolean;
  readonly saveNow: () => Promise<boolean>;
  readonly schedule: (isReadyToSave?: boolean) => void;
}
