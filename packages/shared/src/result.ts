export class Result<T, E = Error> {
  private constructor(
    private readonly success: boolean,
    private readonly value?: T,
    private readonly error?: E,
  ) {}

  public static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static fail<T = never, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
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
    return this.success;
  }

  public isFail(): boolean {
    return !this.success;
  }

  public getValue(): T {
    if (!this.success || this.value === undefined) {
      throw new Error('Cannot get value from a failed Result');
    }
    return this.value;
  }

  public getError(): E {
    if (this.success || this.error === undefined) {
      throw new Error('Cannot get error from a successful Result');
    }
    return this.error;
  }
}
