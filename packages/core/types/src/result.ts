/**
 * A `Result<T, E>` represents either a successful value (`Ok`) or a failure
 * (`Err`). It is a lightweight, dependency-free alternative to throwing for
 * recoverable errors, enabling exhaustive handling of both branches.
 */

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = Error> = Ok<T> | Err<E>;

/** Construct a successful result. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** Construct a failed result. */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Type guard: narrows a `Result` to its `Ok` branch. */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result.ok;

/** Type guard: narrows a `Result` to its `Err` branch. */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  !result.ok;

/**
 * Return the contained value or throw the contained error. Useful at the
 * boundary between Result-based code and exception-based callers.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) {
    return result.value;
  }
  throw result.error instanceof Error
    ? result.error
    : new Error(String(result.error));
};

/** Return the contained value or a provided fallback. */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.value : fallback;

/** Transform the success value while preserving any error. */
export const mapOk = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

/** Transform the error value while preserving any success. */
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => (result.ok ? result : err(fn(result.error)));

/**
 * Run a throwing function and capture the outcome as a `Result`. Any thrown
 * value is normalized to an `Error`.
 */
export const fromThrowable = <T>(fn: () => T): Result<T, Error> => {
  try {
    return ok(fn());
  } catch (caught) {
    return err(caught instanceof Error ? caught : new Error(String(caught)));
  }
};

/** Async variant of {@link fromThrowable}. */
export const fromPromise = async <T>(
  promise: Promise<T>,
): Promise<Result<T, Error>> => {
  try {
    return ok(await promise);
  } catch (caught) {
    return err(caught instanceof Error ? caught : new Error(String(caught)));
  }
};
