'use client';

import * as React from 'react';
import { Suspense, use, useInsertionEffect } from 'react';
import type { DefaultLegendContentProps, DefaultTooltipContentProps, TooltipValueType } from 'recharts';

import { cn } from '@/lib/utils';

import { INITIAL_DIMENSION, THEMES } from './constants/chart.constants';

import type { ChartConfig, ChartContextProps, TooltipNameType, TooltipPayloadItem } from './types/chart.types';

const ResponsiveContainer = React.lazy(() => import('recharts').then((m) => ({ default: m.ResponsiveContainer })));
const ChartTooltip = React.lazy(() => import('recharts').then((m) => ({ default: m.Tooltip })));
const ChartLegend = React.lazy(() => import('recharts').then((m) => ({ default: m.Legend })));

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = () => {
  const context = use(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
};

const ChartContainer = ({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<'div'> & {
  readonly config: ChartConfig;
  readonly children: React.ReactNode;
  readonly initialDimension?: {
    width: number;
    height: number;
  };
}) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(':', '')}`;
  const contextValue = React.useMemo(() => ({ config }), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        data-chart={chartId}
        data-slot="chart"
        {...props}
      >
        <ChartStyle config={config} id={chartId} />
        <Suspense fallback={<div className="aspect-video" />}>
          <ResponsiveContainer initialDimension={initialDimension}>{children}</ResponsiveContainer>
        </Suspense>
      </div>
    </ChartContext.Provider>
  );
};

const buildChartCSS = (id: string, config: ChartConfig): string => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme ?? config.color);

  if (!colorConfig.length) return '';

  return Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`,
    )
    .join('\n');
};

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  useInsertionEffect(() => {
    const css = buildChartCSS(id, config);
    if (!css) return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [id, config]);

  return null;
};

type ChartTooltipContentProps = React.ComponentProps<typeof ChartTooltip> &
  React.ComponentProps<'div'> & {
    readonly hideLabel?: boolean;
    readonly hideIndicator?: boolean;
    readonly indicator?: 'line' | 'dot' | 'dashed';
    readonly nameKey?: string;
    readonly labelKey?: string;
  } & Omit<DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, 'accessibilityLayer'>;

const computeTooltipLabel = (
  config: ChartConfig,
  payload: readonly TooltipPayloadItem[],
  hideLabel: boolean,
  labelKey: string | undefined,
  label: ChartTooltipContentProps['label'],
  labelFormatter: ChartTooltipContentProps['labelFormatter'],
  labelClassName: string | undefined,
): React.ReactNode => {
  if (hideLabel) {
    return null;
  }

  const [item] = payload;
  const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  const value = !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label;

  if (labelFormatter) {
    return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
  }

  if (!value) {
    return null;
  }

  return <div className={cn('font-medium', labelClassName)}>{value}</div>;
};

const buildTooltipItemIndicator = (
  itemConfig: ReturnType<typeof getPayloadConfigFromPayload>,
  hideIndicator: boolean,
  indicator: 'line' | 'dot' | 'dashed',
  nestLabel: boolean,
  indicatorColor: unknown,
): React.ReactNode => {
  if (itemConfig?.icon) {
    return <itemConfig.icon />;
  }

  if (hideIndicator) {
    return null;
  }

  return (
    <div
      className={cn('shrink-0 rounded-[2px] border-border bg-(--color-bg)', {
        'size-2.5': indicator === 'dot',
        'w-1': indicator === 'line',
        'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
        'my-0.5': nestLabel && indicator === 'dashed',
      })}
      style={
        {
          '--color-bg': indicatorColor,
          '--color-border': indicatorColor,
        } as React.CSSProperties
      }
    />
  );
};

const buildTooltipItems = (
  config: ChartConfig,
  payload: readonly TooltipPayloadItem[],
  options: {
    nameKey: string | undefined;
    color: ChartTooltipContentProps['color'];
    formatter: ChartTooltipContentProps['formatter'];
    hideIndicator: boolean;
    nestLabel: boolean;
    indicator: 'line' | 'dot' | 'dashed';
    tooltipLabel: React.ReactNode;
  },
): React.ReactNode[] => {
  const { nameKey, color, formatter, hideIndicator, nestLabel, indicator, tooltipLabel } = options;
  const tooltipItems: React.ReactNode[] = [];

  for (const [index, item] of payload.entries()) {
    if (item.type === 'none') continue;

    const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const indicatorColor = color ?? item.payload?.fill ?? item.color;

    tooltipItems.push(
      <div
        className={cn(
          'flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground',
          indicator === 'dot' && 'items-center',
        )}
        key={key}
      >
        {formatter && item?.value !== undefined && item.name ? (
          formatter(item.value, item.name, item, index, item.payload)
        ) : (
          <>
            {buildTooltipItemIndicator(itemConfig, hideIndicator, indicator, nestLabel, indicatorColor)}
            <div className={cn('flex flex-1 justify-between leading-none', nestLabel ? 'items-end' : 'items-center')}>
              <div className="grid gap-1.5">
                {nestLabel ? tooltipLabel : null}
                <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
              </div>
              {item.value != null && (
                <span className="font-medium font-mono text-foreground tabular-nums">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)}
                </span>
              )}
            </div>
          </>
        )}
      </div>,
    );
  }

  return tooltipItems;
};

const TooltipInner = ({ payload, ...rest }: Omit<ChartTooltipContentProps, 'active'>) => {
  const { config } = useChart();

  const {
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
  } = rest as Omit<ChartTooltipContentProps, 'active' | 'payload'>;

  if (!payload?.length) {
    return null;
  }

  const tooltipLabel = computeTooltipLabel(config, payload, hideLabel, labelKey, label, labelFormatter, labelClassName);
  const nestLabel = payload.length === 1 && indicator !== 'dot';
  const tooltipItems = buildTooltipItems(config, payload, {
    nameKey,
    color,
    formatter,
    hideIndicator,
    nestLabel,
    indicator,
    tooltipLabel,
  });

  return (
    <div
      className={cn(
        'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {nestLabel ? null : tooltipLabel}
      <div className="grid gap-1.5">{tooltipItems}</div>
    </div>
  );
};

const ChartTooltipContent = (props: ChartTooltipContentProps) => {
  if (!props.active || !props.payload?.length) {
    return null;
  }

  const { active, payload, ...rest } = props;

  return (
    <Suspense fallback={null}>
      <TooltipInner payload={payload} {...rest} />
    </Suspense>
  );
};

const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> & {
  readonly hideIcon?: boolean;
  readonly nameKey?: string;
} & DefaultLegendContentProps) => {
  const { config } = useChart();

  if (payload?.length === 0 || payload === undefined) {
    return null;
  }

  const legendItems: React.ReactNode[] = [];
  for (const item of payload) {
    if (item.type === 'none') continue;

    const key = `${nameKey ?? item.dataKey ?? 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);

    legendItems.push(
      <div className={cn('flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-muted-foreground')} key={key}>
        {itemConfig?.icon && !hideIcon ? (
          <itemConfig.icon />
        ) : (
          <div
            className="size-2 shrink-0 rounded-[2px]"
            style={{
              backgroundColor: item.color,
            }}
          />
        )}
        {itemConfig?.label}
      </div>,
    );
  }

  return (
    <div className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}>
      {legendItems}
    </div>
  );
};

const getPayloadConfigFromPayload = (config: ChartConfig, payload: unknown, key: string) => {
  if (typeof payload !== 'object' || payload === null) {
    return;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
};

export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent };
