import type { Prisma } from '@company-brain/db/generated';
import { makeSchemaViewDefault, Result, removeSchemaView } from '@company-brain/shared';
import type { McpNameLister, McpView } from '../types/mcp.collections.types';
import { foldMcpName, sayMcpRefusalWithNames } from './mcp.columns.lib';

/** La vista que ya se llama así, sin contar la que se está cambiando. */
const findViewNamed = (views: readonly McpView[], name: string, except: string | null): McpView | undefined =>
  views.find((view) => view.name !== except && foldMcpName(view.name) === foldMcpName(name));

/** Una vista por su nombre, como sea que venga escrito, o por qué no está y, si se puede saber, cuáles hay. */
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

/**
 * Las vistas con una más, al final. Si pide que sea con la que se abre la
 * colección, o si no había ninguna, la toma de la que la tenía.
 */
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

/** Una vista con lo que cambia: lo que muestra, su nombre, y si pasa a ser con la que se abre la colección. */
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

/**
 * Las vistas sin esa. La última no se quita, porque sin vistas las filas no se
 * pueden mirar; si la que se va era con la que se abre la colección, otra toma
 * su lugar.
 */
export const removeMcpView = (views: readonly McpView[], current: McpView): Result<McpView[], string> => {
  if (views.length <= 1)
    return Result.fail(`"${current.name}" is the only view of this collection, and a collection keeps at least one.`);
  return Result.ok([...removeSchemaView(views, current.name)]);
};
