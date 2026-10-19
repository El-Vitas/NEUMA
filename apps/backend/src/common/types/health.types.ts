export interface DatabaseHealthCheck {
  readonly isReachable: (timeoutMs: number) => Promise<boolean>;
}
