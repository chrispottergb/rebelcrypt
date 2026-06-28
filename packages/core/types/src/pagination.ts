/**
 * Pagination request and response shapes shared by every list endpoint.
 * Supports both offset-based and opaque cursor-based pagination.
 */

import { SortDirection } from './enums';

/** A single sort instruction over a named field. */
export interface SortSpec<TField extends string = string> {
  readonly field: TField;
  readonly direction: SortDirection;
}

/** Parameters describing how a page should be fetched. */
export interface PageRequest<TField extends string = string> {
  /** Max items to return. */
  readonly limit: number;
  /** Zero-based offset (mutually exclusive with `cursor`). */
  readonly offset?: number;
  /** Opaque forward cursor (mutually exclusive with `offset`). */
  readonly cursor?: string;
  /** Ordering to apply. */
  readonly sort?: ReadonlyArray<SortSpec<TField>>;
}

/** Metadata describing the returned page within the larger result set. */
export interface PageInfo {
  readonly limit: number;
  readonly returned: number;
  /** Total matching items, when the source can compute it cheaply. */
  readonly total?: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  /** Cursor to pass as `cursor` to fetch the following page. */
  readonly nextCursor?: string;
}

/** A page of items plus its descriptive metadata. */
export interface Pagination<T> {
  readonly items: ReadonlyArray<T>;
  readonly page: PageInfo;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

/** Normalize a (possibly partial/untrusted) page request to safe bounds. */
export const normalizePageRequest = <TField extends string = string>(
  request?: Partial<PageRequest<TField>>,
): PageRequest<TField> => {
  const rawLimit = request?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_LIMIT);
  const offset =
    request?.offset !== undefined
      ? Math.max(0, Math.trunc(request.offset))
      : undefined;
  return {
    limit,
    ...(offset !== undefined ? { offset } : {}),
    ...(request?.cursor !== undefined ? { cursor: request.cursor } : {}),
    ...(request?.sort !== undefined ? { sort: request.sort } : {}),
  };
};

/** Build a `Pagination<T>` envelope from a fetched slice of items. */
export const buildPage = <T>(
  items: ReadonlyArray<T>,
  request: PageRequest,
  options: { total?: number; nextCursor?: string } = {},
): Pagination<T> => {
  const offset = request.offset ?? 0;
  const hasNextPage =
    options.nextCursor !== undefined ||
    (options.total !== undefined
      ? offset + items.length < options.total
      : items.length === request.limit);
  return {
    items,
    page: {
      limit: request.limit,
      returned: items.length,
      ...(options.total !== undefined ? { total: options.total } : {}),
      hasNextPage,
      hasPreviousPage: offset > 0 || request.cursor !== undefined,
      ...(options.nextCursor !== undefined
        ? { nextCursor: options.nextCursor }
        : {}),
    },
  };
};
