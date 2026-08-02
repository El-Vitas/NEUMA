import type * as React from 'react';
import type { DefaultTooltipContentProps, TooltipValueType } from 'recharts';

export type TooltipNameType = number | string;

export type TooltipPayloadItem = NonNullable<
  DefaultTooltipContentProps<TooltipValueType, TooltipNameType>['payload']
>[number];

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<'light' | 'dark', string> })
>;

export interface ChartContextProps {
  config: ChartConfig;
}
