export interface UseTableActionOptions {
  readonly debounceMs?: number;
}

export interface UseTableActionResult {
  readonly trigger: (action: () => void) => void;
  readonly cancel: () => void;
  readonly isLoading: boolean;
}
