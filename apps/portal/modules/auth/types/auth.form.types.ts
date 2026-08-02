export type FormState = {
  readonly message: string;
  readonly messageKey?: 'validationError';
};

export type ActionResult = {
  readonly serverError?: string;
  readonly validationErrors?: unknown;
};
