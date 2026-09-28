import type { UserRole } from '@company-brain/shared';

/** Una sección de la configuración: adónde lleva, cómo se llama y quién la ve. Sin roles, la ve todo el mundo. */
export interface SettingsNavItem {
  readonly href: string;
  readonly labelKey: string;
  readonly roles?: readonly UserRole[];
}
