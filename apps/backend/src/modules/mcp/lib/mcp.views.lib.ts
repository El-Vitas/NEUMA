import type { Prisma } from '@company-brain/db/generated';
import { makeSchemaViewDefault, Result, removeSchemaView } from '@company-brain/shared';
import type { McpNameLister, McpView } from '../types/mcp.collections.types';
import { foldMcpName, sayMcpRefusalWithNames } from './mcp.columns.lib';

const findViewNamed = (views: readonly McpView[], name: string, except: string | null): McpView | undefined =>
  views.find((view) => view.name !== except && foldMcpName(view.name) === foldMcpName(name));

export const pickMcpView = (
  views: readonly McpView[],
  name: string,
  listNames: McpNameLister,
): Result<McpView, string> => {
  const view = findViewNamed(views, name, null);
  if (view !== undefined) return Result.ok(view);
  const names = views.map((candidate) => candidate.name);
  return Result.fail(sayMcpRefusalWithNames(`The collection has no view "${name}".`, 'views', names, listNames));
};

const refuseTakenName = (taken: McpView): Result<McpView[], string> =>
  Result.fail(`The collection already has a view called "${taken.name}". Choose another name.`);

/** Becomes the default when requested or when none existed, taking it from the previous default. */
export const addMcpView = (
  views: readonly McpView[],
  view: McpView,
  makeDefault: boolean,
): Result<McpView[], string> => {
  const taken = findViewNamed(views, view.name, null);
  if (taken !== undefined) return refuseTakenName(taken);
  const added = [...views, { ...view, isDefault: false }];
  return Result.ok([...(makeDefault || views.length === 0 ? makeSchemaViewDefault(added, view.name) : added)]);
};

export const changeMcpView = (
  views: readonly McpView[],
  current: McpView,
  changes: {
    readonly configuration: Prisma.InputJsonObject;
    readonly makeDefault?: boolean | undefined;
    readonly name?: string | undefined;
  },
): Result<McpView[], string> => {
  const name = changes.name ?? current.name;
  const taken = findViewNamed(views, name, current.name);
  if (taken !== undefined) return refuseTakenName(taken);
  const changed = views.map((view) =>
    view.name === current.name ? { ...view, configuration: changes.configuration, name } : view,
  );
  return Result.ok([...(changes.makeDefault === true ? makeSchemaViewDefault(changed, name) : changed)]);
};

/** The last view is never removed, since rows could not be viewed; if the default leaves, another takes over. */
export const removeMcpView = (views: readonly McpView[], current: McpView): Result<McpView[], string> => {
  if (views.length <= 1)
    return Result.fail(`"${current.name}" is the only view of this collection, and a collection keeps at least one.`);
  return Result.ok([...removeSchemaView(views, current.name)]);
};
