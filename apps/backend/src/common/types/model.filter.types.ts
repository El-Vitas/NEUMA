import type { not } from '@neuma/db';
import type { NeumaModels } from '../../prisma/types/prisma.types';

type CollectionOrderBy = (selection: never, ...rest: never[]) => unknown;

type FilterScopeOf<Collection extends { readonly orderBy: CollectionOrderBy }> =
  Extract<Parameters<Collection['orderBy']>[0], (model: never) => unknown> extends (model: infer Scope) => unknown
    ? Scope
    : never;

/** The argument of a `where` callback on that model, also the one `some` and `none` hand to a relation filter. */
export type ModelFilterScope<ModelName extends keyof NeumaModels> = FilterScopeOf<NeumaModels[ModelName]>;

export type FilterCondition = ReturnType<typeof not>;
