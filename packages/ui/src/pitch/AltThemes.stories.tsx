import type { Meta, StoryObj } from '@storybook/react-vite';
import { directions, type Direction } from './directions';
import { DarkAndLight, StoryFrame } from './StoryFrame';

const meta: Meta = {
  title: 'Foundations/Alt Themes',
  tags: ['approved'],
  parameters: { layout: 'fullscreen' },
};

export default meta;

function AltTheme({ direction }: { direction: Direction }) {
  return (
    <StoryFrame title={`Alt theme: ${direction.name}`} intro={direction.summary}>
      <DarkAndLight direction={direction} />
    </StoryFrame>
  );
}

export const Classic: StoryObj = { render: () => <AltTheme direction={directions[0]} /> };

export const Bold: StoryObj = { render: () => <AltTheme direction={directions[2]} /> };
