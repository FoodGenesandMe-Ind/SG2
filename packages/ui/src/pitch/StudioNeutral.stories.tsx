import { notes, type StatusDisplay } from '@sgp/mock-data';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { directions, type PillStyle } from './directions';
import { Specimen } from './Specimen';
import { DarkAndLight, StatusMatrix, StoryFrame, ThemeLabel } from './StoryFrame';

const studioNeutral = directions[1];

const meta: Meta = {
  title: 'Foundations/Studio neutral',
  tags: ['approved'],
  parameters: { layout: 'fullscreen' },
};

export default meta;

interface Args {
  pillStyle: PillStyle;
  statusDisplay: StatusDisplay;
}

const controls = {
  pillStyle: { control: 'inline-radio', options: ['icon', 'solid', 'tint'], name: 'Status style' },
  statusDisplay: { control: 'inline-radio', options: ['long', 'short', 'icon'], name: 'Status display' },
} as const;

export const TableView: StoryObj<Args> = {
  name: 'Table view',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: table view"
      intro="The Shots page with totals at the top, grouped by sequence. Each row starts with the record's type icon (a shot). Click a row to select it and the icon becomes a tick; Shift+click selects a range, Cmd+click adds or removes one. Once anything is selected the header shows a tick box: faded for some, solid for all; click it to select all. Click a shot code to open its detail page."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
      />
    </StoryFrame>
  ),
};

export const CardView: StoryObj<Args> = {
  name: 'Card view',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: card view"
      intro="The same Shots page and query, flipped to cards. Use Columns (left of Search shots) to show 1 to 10 cards per row; the page default is 4. Collapse arrows sit on the left; LMP_030's cards start collapsed. Expanded fields come from the page's card settings."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialView="card"
        showComponents={false}
        height={760}
      />
    </StoryFrame>
  ),
};

export const ThumbnailView: StoryObj<Args> = {
  name: 'Thumbnail view',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: thumbnail view"
      intro="The same Shots page as a thumbnail wall. Drag the size slider (left of Search shots) to resize thumbnails. Captions come from the page's thumbnail settings (shot and status); frame counts sit on each thumbnail."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialView="thumb"
        showComponents={false}
        height={760}
      />
    </StoryFrame>
  ),
};

export const ShotDetailPage: StoryObj<Args> = {
  name: 'Shot detail page',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: shot detail page"
      intro="What opens when you click a shot. Modeled on Flow's entity page: a large thumbnail beside the key fields and the pipeline at a glance, then tabs. Every tab except Shot info is a page in its own right, with the same view options as any page (Table, Cards, Thumbnails, and Gantt when it has dates). Activity is the Event table for this shot. Add notes from the Notes tab with + Note; open any note for its detail page."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialDetail={{ kind: 'shot', id: 'sh010_30' }}
        showComponents={false}
        height={820}
      />
    </StoryFrame>
  ),
};

const exampleNoteId =
  notes.find((n) => n.hasMarkup && n.versionId.startsWith('v-010_0030') && notes.some((r) => r.parentNoteId === n.id))?.id ??
  notes.find((n) => n.hasMarkup && notes.some((r) => r.parentNoteId === n.id))!.id;

export const NoteDetailPage: StoryObj<Args> = {
  name: 'Note detail page',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: note detail page"
      intro="Notes are a threaded table, so they open with the threaded standard (modeled on Gmail and Zendesk) instead of the record standard used for Shots. One thread, no tabs: messages collapse and expand (click a message, Cmd+click to toggle all, or use the icon), system events such as reads and status changes sit inline, and the clock icon flips between oldest first and newest first. All metadata lives in the side pane. Reply publicly or add an internal note."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialDetail={{ kind: 'note', id: exampleNoteId }}
        showComponents={false}
        height={760}
      />
    </StoryFrame>
  ),
};

export const SubTasks: StoryObj<Args> = {
  name: 'Tasks: sub-tasks',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Sub-tasks"
      intro="Shot 010_0030's Comp task is split into two sub-tasks, each assigned to a different artist with its own to-do list: Roto Pip's wings (Kwame, done) and Skyline matte integration (Hana, in progress). Animation tasks show Blocking, Spline, and Polish. Switch the Tasks tab between Table, Cards, Thumbnails, and Gantt."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialDetail={{ kind: 'shot', id: 'sh010_30', tab: 'tasks' }}
        showComponents={false}
        height={700}
      />
    </StoryFrame>
  ),
};

export const Dependencies: StoryObj<Args> = {
  name: 'Tasks: dependencies (FS, SS, FF, SF)',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Task dependencies in the gantt"
      intro={
        <>
          Shot 030_0010's tasks show each dependency type as a line: finish-to-start (Layout after Storyboard),
          start-to-start (FX with Animation), finish-to-finish (Comp with Lighting), and start-to-finish (Lighting
          can't finish until FX starts). Hover a line for its type. <b>Violation:</b> Animation starts a day before Layout
          finishes, so that line is red with a "!" on the task. SGPipeline never moves task dates on its own; it flags
          the conflict and leaves the decision to schedulers, because sometimes a violation is deliberate.
        </>
      }
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialDetail={{ kind: 'shot', id: 'sh030_10', tab: 'tasks' }}
        showComponents={false}
        height={640}
      />
    </StoryFrame>
  ),
};

export const ReportingCharts: StoryObj = {
  name: 'Dashboard: reporting charts',
  render: () => (
    <StoryFrame
      title="Studio neutral: reporting charts"
      intro="The Producer dashboard (Budget folder in the navigation) as a 3 by 3 dashboard page with each chart type in the widget library: pie, donut, line plus column combo, vertical bar, horizontal bar, stacked bar, line, area, and heat map. All built on ECharts and styled from the theme's tokens, so they follow dark and light."
    >
      <DarkAndLight direction={studioNeutral} initialPage="dashboard" showComponents={false} height={900} />
    </StoryFrame>
  ),
};

export const IssueDetailPage: StoryObj = {
  name: 'Issue detail page (threaded)',
  render: () => (
    <StoryFrame
      title="Studio neutral: issue detail, the threaded standard"
      intro="Issues are the other threaded table we ship. Same standard as Notes: one thread with comments (including a tinted internal comment), inline events for views, assignment, and status changes, the order toggle, expand and collapse, and the side pane for status, priority, assignee, requester, project, and tags."
    >
      <DarkAndLight direction={studioNeutral} initialDetail={{ kind: 'issue', id: 'iss02' }} showComponents={false} height={760} />
    </StoryFrame>
  ),
};

export const TasksGanttView: StoryObj<Args> = {
  name: 'Tasks page: gantt view',
  args: { pillStyle: 'icon', statusDisplay: 'icon' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: Tasks page in gantt view"
      intro="Tasks grouped by department, then pipeline step (Shot Finaling holds FX, Lighting, and Comp). Animation tasks show their Blocking, Spline, and Polish sub-tasks; the To do column summarizes each task's checklist. Drag the time scale slider from Days to Years; the headings change with it. Switch to Table for the same tasks with totals at the top."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialPage="tasks"
        initialView="gantt"
        showComponents={false}
        height={760}
      />
    </StoryFrame>
  ),
};

export const ShotsGanttView: StoryObj<Args> = {
  name: 'Shots page: gantt view',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: Shots page in gantt view"
      intro="Every gantt in SGPipeline is a gantt of Tasks. On the Shots page, the Gantt view is really a page of the shots' Tasks, grouped by Shot, then Step, as the strip above the chart says. Bars carry no text by default; right-click the timeline to show a field to the left or right of the bars."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialView="gantt"
        showComponents={false}
        height={600}
      />
    </StoryFrame>
  ),
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const StatusColumnMenu: StoryObj = {
  name: 'Interaction: status display from the column menu',
  render: () => (
    <StoryFrame
      title="Right-click the Status column header"
      intro="Choose Long name, Short name, or Icon only from the column menu. The setting is saved with the page, so everyone who opens this page sees the same display. Open the Interactions tab below to replay the walkthrough."
    >
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={620} />
    </StoryFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const statusHeader = () => canvas.getByRole('columnheader', { name: 'Status' });
    const choose = async (option: string) => {
      await userEvent.pointer({ keys: '[MouseRight]', target: statusHeader() });
      await pause(900);
      await userEvent.click(canvas.getByRole('menuitemradio', { name: option }));
      await pause(1200);
    };

    await pause(600);
    await choose('Short name');
    await expect(canvas.getAllByTitle('In Comp/Light')[0]).toHaveTextContent('C/L');
    await choose('Icon only');
    await expect(canvas.getAllByLabelText('In Comp/Light')[0]).toHaveTextContent('');
    await choose('Long name');
    await expect(canvas.getAllByTitle('In Comp/Light')[0]).toHaveTextContent('In Comp/Light');
  },
};

export const NavigationDocking: StoryObj = {
  name: 'Navigation: docked and undocked',
  render: () => (
    <StoryFrame
      title="Docking the left navigation"
      intro={
        <>
          Docked, the navigation is part of the layout. Undocked, it collapses to a slim rail and the page gets the full
          width; the rail button floats the navigation over the page until you click away or dock it again with the pin.
          Each specimen below is live.
        </>
      }
    >
      <ThemeLabel>Docked</ThemeLabel>
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={520} />
      <ThemeLabel>Undocked</ThemeLabel>
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={520} initialNavMode="undocked" />
      <ThemeLabel>Undocked, navigation open over the page</ThemeLabel>
      <Specimen
        direction={studioNeutral}
        theme="light"
        showComponents={false}
        height={520}
        initialNavMode="undocked"
        initialNavOpen
      />
    </StoryFrame>
  ),
};

export const StatusDisplayOptions: StoryObj = {
  name: 'Status display options',
  render: () => (
    <StoryFrame
      title="Status styles and displays"
      intro="Every combination of style and display. Long and short names always carry the status's own icon. Hover any status for its full name."
    >
      <StatusMatrix direction={studioNeutral} theme="dark" />
      <StatusMatrix direction={studioNeutral} theme="light" />
    </StoryFrame>
  ),
};
