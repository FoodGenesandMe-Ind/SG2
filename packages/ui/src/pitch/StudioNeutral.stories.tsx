import type { StatusDisplay } from '@sgp/mock-data';
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
      intro="The Shots page with totals at the top, grouped by sequence. Try the Table, Cards, and Thumbnails switch, the dock button in the navigation, and right-clicking the Status column header."
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
