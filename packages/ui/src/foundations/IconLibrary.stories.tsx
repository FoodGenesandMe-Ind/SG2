import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconCurator, LUCIDE, TABLER } from './IconLibrary';

const meta: Meta = {
  title: 'Foundations/Icon library',
  tags: ['proposed'],
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Lucide: StoryObj = {
  name: 'Lucide (in use, ISC)',
  render: () => <IconCurator library={LUCIDE} />,
};

export const Tabler: StoryObj = {
  name: 'Tabler Icons (candidate, MIT)',
  render: () => <IconCurator library={TABLER} />,
};
