# Design registry

The source of truth for which UI is allowed. Agents build only from entries marked **Approved**. Anything new is pitched as **Proposed**, built from existing tokens, and shown to Nephi in Storybook. Only Nephi moves an entry to Approved.

## Statuses

- **Proposed** — pitched, visible in Storybook with the `proposed` tag, not yet allowed in product screens except as part of the same pitch.
- **Approved** — allowed everywhere. Exported from `@sgp/ui`.
- **Deprecated** — do not use in new work; listed with its replacement.

## How an entry moves

1. Agent builds the component or pattern in `packages/ui` with a Storybook story tagged `proposed` and adds a row below.
2. Nephi reviews in Storybook (or inside a prototype screen) and gives notes.
3. When Nephi approves, the story tag changes to `approved`, the component is exported from `packages/ui/src/index.ts`, and the row below is updated with the date.

## Foundations

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Design tokens (chrome color, default data palette, type, spacing, radius, density, motion) | Deprecated | Foundations/Tokens | Placeholder values, replaced by the approved Studio neutral theme. Status colors are client data, not tokens. | |
| Theme: Studio neutral (dark and light, compact density) | Approved | Foundations/Studio neutral | Next: becomes `design/tokens/tokens.css` (dark and light) | 2026-11-01 |
| Alt themes: Classic, Bold | Approved | Foundations/Alt Themes | Kept as alternative themes, per Nephi | 2026-11-01 |
| Status display: icon and name (long or short), icon only; solid and tinted chips as alternatives | Approved | Foundations/Studio neutral/Status display options | Long and short names always carry the status icon. Renders any client-chosen color legibly | 2026-11-01 |
| Column summaries with Total row at the top; calculated-column marker | Approved | Studio neutral/Table view | Totals always on the first page, directly under the column headers | 2026-11-01 |
| Table, Cards, Thumbnails views and view switcher icons | Approved | Studio neutral/Table, Card, Thumbnail view | Collapse controls on the left. Thumbnails: size slider. Cards: 1-10 columns (default 4); narrow cards stack fields and show status as icon only | 2026-11-01 |
| Search fields: Global search, Search shots (page), Search navigation | Approved | All Studio neutral stories | Search icon in each | 2026-11-01 |
| Column header right-click menu (status display) | Approved | Studio neutral/Interaction: status display from the column menu | Sort, group, and hide are placeholders | 2026-11-01 |
| Left navigation: no Company grouper; docked and undocked | Approved | Studio neutral/Navigation: docked and undocked | Tables filed into folders like pages | 2026-11-01 |
| Shot detail page (Flow-style header, pipeline strip, tabs: Activity, Shot info, Tasks, Versions, Notes, Publishes, Assets) | Proposed | Studio neutral/Shot detail page | Tabs are pages with full view options; no History tab; + Note on the Notes tab opens the note form | |
| Threaded detail standard (Notes, Issues): one collapsible thread, inline events, order toggle, side pane, public reply or internal note | Proposed | Studio neutral/Note detail page, Issue detail page | Replaces the tabbed note page | |
| Task dependencies (lines without labels; violations in red with "!") and sub-tasks with their own assignees and to-dos | Proposed | Studio neutral/Tasks: dependencies, Tasks: sub-tasks | Dates never move automatically | |
| Gantt bar labels via right-click (left and right of bars; none by default) | Proposed | Studio neutral/Shots page: gantt view | | |
| Record-type icons and selection in every view (Table, Gantt, Cards, Thumbnails) | Proposed | Studio neutral/Table view, Card view, Thumbnail view, Shots page: gantt view | Cards and thumbnails: icon left of the linked name; header box in the bar above | |
| Record info tab with every field (system fields, code and type, hidden-field toggle) | Proposed | Studio neutral/Shot detail page, Shot info tab | | |
| Reporting charts: pie, donut, vertical bar, horizontal bar, stacked bar, line, area, heat map, line + column combo | Proposed | Studio neutral/Dashboard: reporting charts | ECharts, themed from tokens | |
| Page inside a tab (shared RecordPage: count, search, views, controls, + button) | Proposed | Every detail-page tab | Also supplies Cards and Thumbnails for the Tasks page | |
| Gantt view with time scale slider (Days to Years) | Proposed | Studio neutral/Tasks page: gantt view, Shots page: gantt view | Always a gantt of tasks; offered on Tasks, Shots, Assets pages | |
| Tasks page (department, step, task, sub-task grouping; to-do summary; table with totals at top) | Proposed | Studio neutral/Tasks page: gantt view | All four views | |
| Columns: drag headers to move; drag the header edge to resize, double-click to fit (every table) | Proposed | Studio neutral/Columns and the Page menu | Same in Shots, Tasks, and detail-page tab tables. Order and widths are saved with the page | |
| Thumbnail column in table view (movable, resizable; rows grow to keep 16:9); record icon fixed first | Proposed | Studio neutral/Columns and the Page menu | Thumbnail is a `media` field in the page's columns | |
| Gantt column pane: movable and resizable columns, draggable divider (double-click to fit) | Proposed | Studio neutral/Columns and the Page menu (Tasks page) | Saved with the page's gantt settings | |
| Selection: click again to deselect; empty-space click or Escape clears all; drag across rows or lasso cards and thumbnails | Proposed | Studio neutral/Table, Card, Thumbnail views | Controls, menus, and dialogs keep the selection. Cmd, Ctrl, or Shift while dragging adds | |
| Conditional formatting dialog (ordered rules; When, Format, Preview) and formatted rows and cells | Proposed | Studio neutral/Conditional formatting: rules, Conditional formatting: result | From the column header menu; field-aware operators and values; palette colors or custom; this page only or project-wide. + New rule commits the form; Apply stays inactive until the list changes | |
| Record actions: right-click selection to copy, export CSV, or delete; paste on empty space | Proposed | Studio neutral/Table, Card, Thumbnail views | Delete keeps linked records. Paste gives new ids and reserved fields; fields set unique per project are renamed with " copy" | |
| Card and thumbnail field menu (right-click) | Proposed | Studio neutral/Card view, Thumbnail view | Card: show or hide fields in the body, flowing across the card with shared column stops. Thumbnail: each field inside the image or below it | |
| Group dialog (up to ten fields; drag a grip to reorder) | Proposed | Studio neutral/Table view, Shot detail page | On every data view, including detail-page tabs. Grouping shapes the records in front of you. Saving that grouping onto the page stays with someone who can edit the page | |
| Kanban view | Proposed | Studio neutral/Kanban view | Enabled on Shots for The Last Lamplighter. Columns default to Status. Card fields are separate from card view. Columns control is 1 to 20; chevrons step through the rest | |
| Manage columns | Proposed | Studio neutral/Table view | From any column header and the icon beside search. Show or hide fields. Schema managers can add a field, set uniqueness, edit a calculated formula as chips (comparisons and if / then / else words, with the cursor between chips), delete a non-system field (confirming when it holds data), and show the Locked column. Configure field opens that field alone | |
| Inline cell edit | Proposed | Studio neutral/Table view | Double-click a text, number, date, or status cell to edit it. Enter, Tab, and clicking away save. Escape cancels. A saved value flashes green and fades. A value the field cannot store flashes red and fades back to what was there. Double-clicking a locked record shows a toast instead of opening the editor | |
| Date picker (in a date cell) | Proposed | Studio neutral/Table view | Opens under a date cell in edit mode on the cell's month, with the cell's day filled and today ringed. Picking a day saves; typing still works. Today button. All dates read DD-Mon-YYYY, for example 12-Dec-2026 | |
| Toast | Proposed | Studio neutral/Table view | One short line at the bottom center with an optional icon; fades after about three seconds. A new toast replaces the last. First use: "Record is locked, contact your admin to unlock." | |
| Page icon (clean or dirty) and Page menu: Revert, Save, Save as new page, Save into My Pages | Proposed | Studio neutral/Columns and the Page menu | Lists the unsaved changes; options follow permissions (artists see Revert and Save into My Pages). Tabs inside detail pages do not have it yet | |
| Icon library: Lucide (ISC, in use) and Tabler Icons (MIT, candidate) curation pages | Proposed | Foundations/Icon library | Nephi marks Keep or Reject per icon; the kept list becomes the approved icon set agents may use | |
| App frame specimen: top bar, left nav tree, page header, grouped shot grid, card, controls | Approved | Same pitch | Approved as the design; still pitch specimens. Next: rebuilt as real `@sgp/ui` components | 2026-11-01 |

## Components

| Name | Status | Story | Notes | Approved on |
| --- | --- | --- | --- | --- |

## Patterns and screens

| Name | Status | Location | Notes | Approved on |
| --- | --- | --- | --- | --- |
| Prototype index | Scaffolding | `apps/prototype/src/App.tsx` | Developer index only, not a product design | |
