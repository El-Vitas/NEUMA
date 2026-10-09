export interface PagesGroupCollapsing {
  readonly isCollapsed: (groupKey: string) => boolean;
  readonly toggle: (groupKey: string) => void;
}
