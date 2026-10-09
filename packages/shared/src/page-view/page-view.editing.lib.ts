/** Lo que hace falta de una vista para decidir con cuál se abre una colección. */
interface PageViewLead {
  readonly isDefault: boolean;
  readonly name: string;
}

/**
 * Quita una manera de mirar, salvo que sea la última.
 *
 * Sin ninguna vista las filas no se pueden mirar, y el servidor tampoco acepta
 * una colección así. Si la que se va era la que llevaba la delantera, otra la
 * toma: si no, abrir la colección no llevaría a ninguna parte.
 */
export const removeSchemaView = <TView extends PageViewLead>(
  views: readonly TView[],
  name: string,
): readonly TView[] => {
  if (views.length <= 1 || !views.some((view) => view.name === name)) return views;
  const remaining = views.filter((view) => view.name !== name);
  if (remaining.some((view) => view.isDefault)) return remaining;
  return remaining.map((view, position) => (position === 0 ? { ...view, isDefault: true } : view));
};

/** Con cuál se abre la colección. Exactamente una la lleva, porque abrirla lleva a un sitio y no a dos. */
export const makeSchemaViewDefault = <TView extends PageViewLead>(
  views: readonly TView[],
  name: string,
): readonly TView[] => {
  if (!views.some((view) => view.name === name)) return views;
  return views.map((view) => ({ ...view, isDefault: view.name === name }));
};
