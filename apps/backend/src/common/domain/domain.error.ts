export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public readonly details: unknown;
  public abstract readonly httpStatus: number;

  constructor(_message: string, _details?: unknown) {
    super(_message);
    this.name = 'DomainError';
    this.details = _details;
  }
}
