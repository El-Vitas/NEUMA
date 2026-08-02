export const BASE_BUTTON_CLASSES =
  'inline-flex h-9 items-center gap-2 px-4 text-sm font-semibold shadow-sm shadow-primary/20 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  '[&_svg]:pointer-events-none ' +
  '[&_svg:not(' +
  '[class*="size-"])]' +
  ':size-4 shrink-0 ' +
  '[&_svg]:shrink-0';

export const VARIANT_CLASSES = {
  PRIMARY: 'text-white bg-primary hover:bg-primary/90 hover:transition-colors hover:duration-200',
  SECONDARY:
    'border border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/10 hover:transition-colors hover:duration-200',
};
