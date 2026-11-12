import { exampleConditionalFormats, exampleProjectFormats, notes, type StatusDisplay } from '@sgp/mock-data';
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
      intro="The Shots page with totals at the top, grouped by sequence. Group opens a dialog on every view, including a Tasks tab: up to ten fields. Drag a grip to reorder them; each field is ascending or descending. Grouping changes what you see right away. Saving the page so everyone else opens it that way stays with someone who can edit the page. Click a group arrow to collapse or expand it; Cmd+click collapses or expands every group at that level. Each row starts with the record's type icon (a shot). Click a row to select it and the icon becomes a tick; click it again to deselect it. Shift+click selects a range, Cmd+click adds or removes one. Press on a row and drag up or down to select every row you pass over. Click empty space or press Escape to clear the selection. Right-click a selection to copy, export a CSV, or delete (linked records are kept). After a copy, right-click empty space to paste; unique fields such as Shot are renamed, for example 020_0010 copy. Once anything is selected the header shows a tick box: faded for some, solid for all; click it to select all. Click a shot code to open its detail page."
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
      intro="The same Shots page and query, flipped to cards. Use Columns (left of Search shots) to show 1 to 10 cards per row; the page default is 4. Collapse arrows sit on the left; LMP_030's cards start collapsed. Cmd+click a card arrow to collapse or expand every card, or a sequence arrow to collapse or expand every sequence. Drag across empty space (or from a card) to lasso cards and select them. Right-click a card to show or hide fields in its body. On a wide card the fields sit side by side and wrap only when they must, and every card keeps the same column stops."
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
      intro="The same Shots page as a thumbnail wall. Drag the size slider (left of Search shots) to resize thumbnails. Drag a lasso around thumbnails to select them; hold Cmd or Shift to add to the selection. Right-click a thumbnail to show a field inside the image or below it. Shot and status start below; the frame count starts inside. Cmd+click a sequence arrow to collapse or expand every sequence."
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

export const KanbanView: StoryObj<Args> = {
  name: 'Kanban view',
  args: { pillStyle: 'icon', statusDisplay: 'long' },
  argTypes: controls,
  render: (args) => (
    <StoryFrame
      title="Studio neutral: kanban view"
      intro="The Last Lamplighter has Kanban turned on for Shots. Columns start as Status. The field menu next to Columns can switch them to any status, list, link, or person field. Columns sets how many columns are on screen, from 1 to 20, default 4. When Status has more than that, the chevrons step left and right. Right-click a card to choose its fields; that list is separate from card view. Empty columns stay in the list."
    >
      <DarkAndLight
        key={`${args.pillStyle}-${args.statusDisplay}`}
        direction={{ ...studioNeutral, pillStyle: args.pillStyle }}
        initialStatusDisplay={args.statusDisplay}
        initialView="kanban"
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
      intro="Shot 010_0030's Comp task is split into two sub-tasks, each assigned to a different artist with its own to-do list: Roto Pip's wings (Kwame, done) and Skyline matte integration (Hana, in progress). Animation tasks show Blocking, Spline, and Polish. Switch the Tasks tab between Table, Cards, Thumbnails, and Gantt. Group is on that tab too, the same dialog as on a page."
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
      intro="Tasks grouped by department, then pipeline step (Shot Finaling holds FX, Lighting, and Comp). Animation tasks show their Blocking, Spline, and Polish sub-tasks; the To do column summarizes each task's checklist. Drag the time scale slider from Days to Years; the headings change with it. Cmd+click a department arrow to collapse or expand every department, or a step arrow to collapse or expand every step. Switch to Table for the same tasks with totals at the top."
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
      intro="Every gantt in SGPipeline is a gantt of Tasks. On the Shots page, the Gantt view is really a page of the shots' Tasks, grouped by Shot, then Step, as the strip above the chart says. Bars carry no text by default; right-click the timeline to show a field to the left or right of the bars. Cmd+click a shot group arrow to collapse or expand every shot group."
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

export const ColumnsAndPageMenu: StoryObj = {
  name: 'Columns and the Page menu',
  tags: ['proposed'],
  render: () => (
    <StoryFrame
      title="Move and size columns; save, revert, or keep a copy"
      intro={
        <>
          Drag a column header left or right to move the column. Drag the edge of a header to resize, or double-click the
          edge to fit the column to its widest value, as in Excel. The thumbnail is a column too: widen it and the rows grow
          to keep each thumbnail 16:9. The record icon always stays first. In Gantt view, the columns beside the chart move
          and resize the same way, and the divider between them and the chart drags left or right (double-click it to fit
          the columns). The Page icon at the top right turns dirty (amber, with a
          dot) as soon as the page differs from how it was saved, including view, thumbnail size, card columns, status
          display, and the gantt columns, divider, and time scale. Click it to Revert, Save, Save as new page, or Save into My Pages. The options
          follow your permissions: Nephi (Admin, Producer) sees all four; Lena, an artist, sees only Revert and Save into My
          Pages. Copies appear in the navigation and open right away.
        </>
      }
    >
      <ThemeLabel>Nephi Sanchez: Admin, Producer</ThemeLabel>
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={560} viewerId="p01" />
      <ThemeLabel>Lena Fischer: Artist</ThemeLabel>
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={560} viewerId="p09" />
    </StoryFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pause(600);
    await userEvent.dblClick(canvas.getAllByRole('separator', { name: 'Resize Description' })[0]);
    await pause(400);
    await expect(canvas.getAllByRole('button', { name: 'View has unsaved changes' })).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'View has unsaved changes' }));
    await expect(canvas.getByRole('menuitem', { name: /Save as new page/ })).toBeVisible();
  },
};

export const ManageFields: StoryObj = {
  name: 'Manage fields and Wrap text',
  tags: ['proposed'],
  render: () => (
    <StoryFrame
      title="Manage fields: one section per view"
      intro="Experiment: Manage fields (the gear beside Search shots) holds only field configuration: uniqueness, formulas, statuses, permissions, and new fields. Every display option moved to the View menu (top right, was Page) under Configure: tabs per view, each view's fields and their order, and per field wrap text, conditional formatting, sort, group, and number, date, or status display."
    >
      <Specimen direction={studioNeutral} theme="dark" showComponents={false} height={760} initialFieldsOpen />
    </StoryFrame>
  ),
};

export const ConditionalFormatting: StoryObj = {
  name: 'Conditional formatting: rules',
  tags: ['proposed'],
  render: () => (
    <StoryFrame
      title="Conditional formatting"
      intro={
        <>
          Right-click any column header and choose Conditional formatting. Each rule applies to this page only or
          project-wide (every Shots page in the project, for everyone; admins only). Rules run from the top, this page's
          rules before project-wide ones, and when several match a row (or a cell) the one highest in the list sets its
          format; reorder with the arrows. With no rules, the form still shows prompts and + New rule (under Format) adds it;
          Apply stays inactive until a rule is added, edited, reordered, or deleted. Each rule is 1. When: pick a
          field, then an operator and a value narrowed to that field (dates offer Today plus or minus days, a date, or
          another date field; statuses offer only that field's values), 2. Format: text, background, and border colors from
          the data palette or a custom color, plus bold, for the whole row or one cell, and 3. Preview: how many shots match
          on this page, and which ones a higher rule already formats. Opened here from the Animation due column, so the
          rule that uses it is selected. Apply, then save page rules from the Page menu; project-wide changes take effect on
          Apply. Artists see the option disabled on shared
          pages; they can format their own copy in My Pages.
        </>
      }
    >
      <Specimen
        direction={studioNeutral}
        theme="dark"
        showComponents={false}
        height={720}
        initialFormats={exampleConditionalFormats}
        initialProjectFormats={exampleProjectFormats}
        initialFormatColumn="animationDue"
      />
    </StoryFrame>
  ),
};

export const ConditionalFormattingResult: StoryObj = {
  name: 'Conditional formatting: result',
  tags: ['proposed'],
  render: () => (
    <StoryFrame
      title="The Shots page with three formats"
      intro="Finaled shots get a green row (rule 1). Shots whose animation is due within 30 days get bold red text (rule 2), except the finaled ones, because rule 1 is higher in the list. Shots of 130 frames or more get an amber Total Frames cell (rule 3, project-wide, so it shows on every Shots page in the project). Status icons keep their own colors."
    >
      <DarkAndLight direction={studioNeutral} showComponents={false} height={460} initialFormats={exampleConditionalFormats}
        initialProjectFormats={exampleProjectFormats} />
    </StoryFrame>
  ),
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
