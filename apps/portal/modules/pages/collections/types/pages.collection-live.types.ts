export interface CollectionRefreshCoalescer {
  readonly cancel: () => void;
  readonly request: () => void;
}
