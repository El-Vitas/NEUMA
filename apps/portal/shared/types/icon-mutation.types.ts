export interface IconMutationResult {
  readonly isPending: boolean;
  readonly runIconMutation: (mutate: () => Promise<unknown>) => void;
}
