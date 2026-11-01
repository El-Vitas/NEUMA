export type FormMessageKey = 'invalidCredentials' | 'offline' | 'rateLimited' | 'unexpected' | 'validationError';

export type FormState = {
  readonly message: string;
  readonly messageKey?: FormMessageKey;
};

export type ActionResult = {
  readonly serverError?: string;
  readonly validationErrors?: unknown;
};
