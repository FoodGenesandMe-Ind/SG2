import { departments, pipelineSteps, sequences, shots, statusValues, tasks, versions } from '@sgp/mock-data';
import type { EChartsCoreOption } from 'echarts/core';
import { baseOption, Chart, type ChartTheme } from './Chart';
import { Icon } from './Icon';
import { AddButton } from './PageControls';
import { personName } from './people';
import { openTodos } from './TasksPage';

const PROJECT_ID = 'prj01';
const status = (code: string) => statusValues.find((s) => s.code === code)!;
const projectShots = shots.filter((s) => s.projectId === PROJECT_ID);
const topTasks = tasks.filter((t) => t.projectId === PROJECT_ID && !t.parentTaskId);
const shotSteps = pipelineSteps.filter((s) => s.appliesTo === 'Shot');
const projectVersions = versions.filter((v) => v.projectId === PROJECT_ID);

const countBy = <T,>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[key(item)] = (acc[key(item)] ?? 0) + 1;
    return acc;
  }, {});

function weekOf(iso: string) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const weekLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Pie: shots by status, in each status's own color. */
function shotsByStatus(t: ChartTheme): EChartsCoreOption {
  const counts = countBy(projectShots, (s) => s.status);
  return {
    ...baseOption(t),
    legend: { ...(baseOption(t).legend as object), orient: 'vertical', top: 'middle', right: 0 },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [
      {
        type: 'pie',
        radius: '72%',
        center: ['38%', '52%'],
        label: { show: false },
        data: Object.entries(counts).map(([code, value]) => ({ name: status(code).label, value, itemStyle: { color: status(code).color } })),
      },
    ],
  };
}

/** Donut: all tasks by status. */
function tasksByStatus(t: ChartTheme): EChartsCoreOption {
  const counts = countBy(topTasks, (task) => task.status);
  return {
    ...baseOption(t),
    legend: { ...(baseOption(t).legend as object), orient: 'vertical', top: 'middle', right: 0 },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['48%', '74%'],
        center: ['38%', '52%'],
        label: { show: true, position: 'center', formatter: `${topTasks.length}\ntasks`, color: t.text, fontSize: 14, lineHeight: 18 },
        itemStyle: { borderColor: t.surface, borderWidth: 2 },
        data: Object.entries(counts).map(([code, value]) => ({ name: status(code).label, value, itemStyle: { color: status(code).color } })),
      },
    ],
  };
}

/** Vertical bar: total frames per sequence. */
function framesPerSequence(t: ChartTheme): EChartsCoreOption {
  const seqs = sequences.filter((s) => s.projectId === PROJECT_ID);
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: seqs.map((s) => s.code) },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'value' },
    series: [
      {
        type: 'bar',
        barWidth: '45%',
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: seqs.map((s) => projectShots.filter((sh) => sh.sequenceId === s.id).reduce((a, sh) => a + sh.totalFrames, 0)),
      },
    ],
  };
}

/** Horizontal bar: open to-dos by artist. */
function todosByArtist(t: ChartTheme): EChartsCoreOption {
  const counts: Record<string, number> = {};
  for (const task of tasks.filter((x) => x.projectId === PROJECT_ID)) {
    const open = openTodos(task);
    if (open) counts[task.assigneeId] = (counts[task.assigneeId] ?? 0) + open;
  }
  const entries = Object.entries(counts).sort((a, b) => a[1] - b[1]);
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'value' },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'category', data: entries.map(([id]) => personName(id)) },
    series: [{ type: 'bar', barWidth: '55%', itemStyle: { color: t.palette[1], borderRadius: [0, 3, 3, 0] }, data: entries.map(([, n]) => n) }],
  };
}

/** Stacked bar: task status mix per department. */
function statusByDepartment(t: ChartTheme): EChartsCoreOption {
  const codes = ['wtg', 'rdy', 'ip', 'rev', 'rtk', 'apr'];
  const deps = departments.filter((d) => topTasks.some((task) => pipelineSteps.find((s) => s.id === task.stepId)?.departmentId === d.id));
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: deps.map((d) => d.name) },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'value' },
    series: codes.map((code) => ({
      type: 'bar',
      stack: 'status',
      name: status(code).label,
      barWidth: '50%',
      itemStyle: { color: status(code).color },
      data: deps.map(
        (d) => topTasks.filter((task) => task.status === code && pipelineSteps.find((s) => s.id === task.stepId)?.departmentId === d.id).length,
      ),
    })),
  };
}

const weeks = [...new Set(projectVersions.map((v) => weekOf(v.submittedAt)))].sort();

/** Line: versions submitted per week. */
function versionsPerWeek(t: ChartTheme): EChartsCoreOption {
  const counts = countBy(projectVersions, (v) => weekOf(v.submittedAt));
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: weeks.map(weekLabel), boundaryGap: false },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'value' },
    series: [{ type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2 }, data: weeks.map((w) => counts[w] ?? 0) }],
  };
}

/** Area: cumulative approved versions over time. */
function approvedOverTime(t: ChartTheme): EChartsCoreOption {
  let total = 0;
  const data = weeks.map((w) => (total += projectVersions.filter((v) => v.status === 'apr' && weekOf(v.submittedAt) === w).length));
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: weeks.map(weekLabel), boundaryGap: false },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'value' },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: t.palette[4] },
        areaStyle: { color: t.palette[4], opacity: 0.25 },
        data,
      },
    ],
  };
}

/** Heat map: share of tasks approved, by pipeline step and sequence. */
function approvalHeatmap(t: ChartTheme): EChartsCoreOption {
  const seqs = sequences.filter((s) => s.projectId === PROJECT_ID);
  const data = shotSteps.flatMap((step, y) =>
    seqs.map((seq, x) => {
      const list = topTasks.filter(
        (task) => task.stepId === step.id && projectShots.some((sh) => sh.id === task.entityId && sh.sequenceId === seq.id),
      );
      return [x, y, list.length ? Math.round((100 * list.filter((task) => task.status === 'apr').length) / list.length) : 0];
    }),
  );
  return {
    ...baseOption(t),
    grid: { left: 8, right: 12, top: 8, bottom: 36, containLabel: true },
    tooltip: { ...(baseOption(t).tooltip as object), formatter: (p: { value: number[] }) => `${p.value[2]}% approved` },
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: seqs.map((s) => s.code), splitArea: { show: false } },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'category', data: shotSteps.map((s) => s.name) },
    visualMap: {
      min: 0,
      max: 100,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemHeight: 80,
      itemWidth: 10,
      text: ['100%', '0%'],
      textStyle: { color: t.muted, fontSize: 11 },
      inRange: { color: [t.surface, t.accent] },
    },
    series: [{ type: 'heatmap', data, label: { show: true, color: t.text, fontSize: 11, formatter: (p: { value: number[] }) => `${p.value[2]}` }, itemStyle: { borderColor: t.line, borderWidth: 1 } }],
  };
}

/** Combo: logged days as columns, bid days as a line, per pipeline step. */
function bidVsLogged(t: ChartTheme): EChartsCoreOption {
  const sum = (stepId: string, key: 'bidDays' | 'loggedDays') =>
    Math.round(topTasks.filter((task) => task.stepId === stepId).reduce((a, task) => a + task[key], 0) * 10) / 10;
  return {
    ...baseOption(t),
    xAxis: { ...(baseOption(t).xAxis as object), type: 'category', data: shotSteps.map((s) => s.code) },
    yAxis: { ...(baseOption(t).yAxis as object), type: 'value', name: 'days', nameTextStyle: { color: t.subtle, fontSize: 11 } },
    series: [
      { type: 'bar', name: 'Logged', barWidth: '45%', itemStyle: { color: t.palette[0], borderRadius: [3, 3, 0, 0] }, data: shotSteps.map((s) => sum(s.id, 'loggedDays')) },
      { type: 'line', name: 'Bid', symbolSize: 6, lineStyle: { width: 2, color: t.palette[2] }, itemStyle: { color: t.palette[2] }, data: shotSteps.map((s) => sum(s.id, 'bidDays')) },
    ],
  };
}

const WIDGETS: Array<{ title: string; source: string; kind: string; icon: string; build: (t: ChartTheme) => EChartsCoreOption }> = [
  { title: 'Shots by status', source: 'Shots', kind: 'Pie', icon: 'chart-pie', build: shotsByStatus },
  { title: 'Tasks by status', source: 'Tasks', kind: 'Donut', icon: 'chart-pie', build: tasksByStatus },
  { title: 'Bid vs logged days by step', source: 'Tasks, grouped by step', kind: 'Line + column', icon: 'chart-column', build: bidVsLogged },
  { title: 'Total frames per sequence', source: 'Shots, sum of Total Frames', kind: 'Vertical bar', icon: 'chart-column', build: framesPerSequence },
  { title: 'Open to-dos by artist', source: 'Tasks and sub-tasks', kind: 'Horizontal bar', icon: 'chart-bar', build: todosByArtist },
  { title: 'Task status by department', source: 'Tasks, grouped by department', kind: 'Stacked bar', icon: 'chart-column', build: statusByDepartment },
  { title: 'Versions submitted per week', source: 'Versions', kind: 'Line', icon: 'chart-line', build: versionsPerWeek },
  { title: 'Approved versions, cumulative', source: 'Versions', kind: 'Area', icon: 'chart-area', build: approvedOverTime },
  { title: 'Approval by step and sequence', source: 'Tasks, % approved', kind: 'Heat map', icon: 'grid-3x3', build: approvalHeatmap },
];

export function DashboardPage() {
  const height = { height: 'var(--sgp-row-compact)' };
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-fg-subtle">
          <span>The Last Lamplighter</span>
          <Icon name="chevron-right" size={12} />
          <span>Budget</span>
          <Icon name="chevron-right" size={12} />
          <span className="text-fg-muted">Producer dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="mr-2 text-xl font-semibold">Producer dashboard</h1>
          <span className="text-sm text-fg-subtle">3 rows by 3 columns, 9 widgets</span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-fg-muted"
            style={height}
          >
            <Icon name="layout-dashboard" /> Edit layout
          </span>
          <AddButton label="Widget" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-canvas p-3">
        <div className="grid grid-cols-3 gap-3">
          {WIDGETS.map((w) => (
            <section key={w.title} className="flex flex-col gap-2 rounded-lg border border-line bg-surface-raised p-3">
              <header className="flex items-start gap-2">
                <Icon name={w.icon} size={14} className="mt-0.5 text-fg-subtle" />
                <div className="flex min-w-0 flex-col">
                  <h2 className="truncate text-sm font-semibold">{w.title}</h2>
                  <span className="truncate text-xs text-fg-subtle">{w.source}</span>
                </div>
                <span className="ml-auto shrink-0 rounded-sm bg-surface-sunken px-1.5 text-xs text-fg-muted">{w.kind}</span>
              </header>
              <div className="h-56">
                <Chart build={w.build} label={`${w.kind}: ${w.title}`} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
