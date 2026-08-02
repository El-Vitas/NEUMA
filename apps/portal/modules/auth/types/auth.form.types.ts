export type FormState = {
  readonly message: string;
};

export type ActionResult = {
  readonly serverError?: string;
  readonly validationErrors?: unknown;
};
