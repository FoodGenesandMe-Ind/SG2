import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

echarts.use([BarChart, LineChart, PieChart, HeatmapChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

/** Colors read from the design tokens in effect where the chart is mounted, so charts follow the theme. */
export interface ChartTheme {
  text: string;
  muted: string;
  subtle: string;
  line: string;
  surface: string;
  accent: string;
  palette: string[];
  font: string;
}

const PALETTE = ['blue', 'teal', 'amber', 'purple', 'green', 'orange', 'pink', 'cyan', 'indigo', 'red', 'lime', 'gray'];

function readTheme(el: HTMLElement): ChartTheme {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    text: v('--sgp-color-text'),
    muted: v('--sgp-color-text-muted'),
    subtle: v('--sgp-color-text-subtle'),
    line: v('--sgp-color-border'),
    surface: v('--sgp-color-surface-raised'),
    accent: v('--sgp-color-accent'),
    palette: PALETTE.map((p) => v(`--sgp-palette-${p}`)),
    font: v('--sgp-font-sans'),
  };
}

/** Shared axis, tooltip, and legend styling so every widget looks native to the theme. */
export function baseOption(t: ChartTheme): echarts.EChartsCoreOption {
  const axis = {
    axisLine: { lineStyle: { color: t.line } },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.line, type: 'dashed' as const } },
  };
  return {
    color: t.palette,
    textStyle: { fontFamily: t.font, color: t.text },
    grid: { left: 8, right: 12, top: 28, bottom: 4, containLabel: true },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.line,
      textStyle: { color: t.text, fontSize: 12 },
    },
    legend: { top: 0, right: 0, textStyle: { color: t.muted, fontSize: 11 }, itemWidth: 10, itemHeight: 10, icon: 'roundRect' },
    xAxis: axis,
    yAxis: axis,
  };
}

export function Chart({ build, label }: { build: (t: ChartTheme) => echarts.EChartsCoreOption; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });
    chart.setOption(build(readTheme(el)));
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [build]);
  return <div ref={ref} role="img" aria-label={label} className="h-full w-full" />;
}
