interface PageViewLead {
  readonly isDefault: boolean;
  readonly name: string;
}

/** The last view is never removed (the server rejects none); if the default goes, the first remaining takes over. */
export const removeSchemaView = <TView extends PageViewLead>(
  views: readonly TView[],
  name: string,
): readonly TView[] => {
  if (views.length <= 1 || !views.some((view) => view.name === name)) return views;
  const remaining = views.filter((view) => view.name !== name);
  if (remaining.some((view) => view.isDefault)) return remaining;
  return remaining.map((view, position) => (position === 0 ? { ...view, isDefault: true } : view));
};

/** Exactly one view is the default. */
export const makeSchemaViewDefault = <TView extends PageViewLead>(
  views: readonly TView[],
  name: string,
): readonly TView[] => {
  if (!views.some((view) => view.name === name)) return views;
  return views.map((view) => ({ ...view, isDefault: view.name === name }));
};
