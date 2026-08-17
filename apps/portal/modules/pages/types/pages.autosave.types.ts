export type PagesAutosaveStatus = 'error' | 'idle' | 'saved' | 'saving';

export type PagesAutosaveDisplayState = 'backOnline' | 'failed' | 'idle' | 'offline' | 'pending' | 'saved' | 'saving';

export interface PagesAutosaveOptions {
  readonly enabled: boolean;
  readonly onSave: () => Promise<boolean>;
}

export interface PagesAutosaveResult {
  readonly cancel: () => void;
  readonly displayState: PagesAutosaveDisplayState;
  readonly hasError: boolean;
  readonly hasSaved: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  readonly savedAt: Date | null;
  readonly saveNow: () => Promise<boolean>;
  readonly schedule: (isReadyToSave?: boolean) => void;
}
