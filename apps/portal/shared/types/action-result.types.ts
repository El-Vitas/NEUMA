export type ActionFailure = {
  readonly serverError?: string;
  readonly validationErrors?: Readonly<Record<string, readonly string[]>>;
};
