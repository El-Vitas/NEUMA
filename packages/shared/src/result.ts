type ResultState<T, E> =
  | { readonly isSuccess: true; readonly value: T }
  | { readonly isSuccess: false; readonly error: E };

export class Result<T, E = Error> {
  private constructor(private readonly state: ResultState<T, E>) {}

  public static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>({ isSuccess: true, value });
  }

  public static fail<T = never, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ error, isSuccess: false });
  }

  public static fromThrow<T, E extends new (...args: unknown[]) => Error>(
    fn: () => T,
    expectedError: E,
  ): Result<T, InstanceType<E>> {
    try {
      return Result.ok<T, InstanceType<E>>(fn());
    } catch (error) {
      if (error instanceof expectedError) {
        return Result.fail<T, InstanceType<E>>(error as InstanceType<E>);
      }
      throw error;
    }
  }

  public isOk(): boolean {
    return this.state.isSuccess;
  }

  public isFail(): boolean {
    return !this.state.isSuccess;
  }

  public getValue(): T {
    if (!this.state.isSuccess) {
      throw new Error('Cannot get value from a failed Result');
    }
    return this.state.value;
  }

  public getError(): E {
    if (this.state.isSuccess) {
      throw new Error('Cannot get error from a successful Result');
    }
    return this.state.error;
  }
}
