import { h } from 'preact';
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField } from '@form-js-designer/designer-core';
import type { StackSchema, StackGap } from './propsSchema';
import { stackPropsSchema } from './propsSchema';
import { StackIcon } from '../icons';
import './Stack.css';

void h;

const stackVariants = cva('dc-stack', {
  variants: {
    direction: {
      horizontal: 'dc-stack--direction-horizontal',
      vertical: 'dc-stack--direction-vertical',
    },
    gap: {
      0: 'dc-stack--gap-0',
      1: 'dc-stack--gap-1',
      2: 'dc-stack--gap-2',
      3: 'dc-stack--gap-3',
      4: 'dc-stack--gap-4',
      5: 'dc-stack--gap-5',
      6: 'dc-stack--gap-6',
      7: 'dc-stack--gap-7',
      8: 'dc-stack--gap-8',
    },
    align: {
      start: 'dc-stack--align-start',
      center: 'dc-stack--align-center',
      end: 'dc-stack--align-end',
      stretch: 'dc-stack--align-stretch',
      baseline: 'dc-stack--align-baseline',
    },
    justify: {
      start: 'dc-stack--justify-start',
      center: 'dc-stack--justify-center',
      end: 'dc-stack--justify-end',
      'space-between': 'dc-stack--justify-space-between',
      'space-around': 'dc-stack--justify-space-around',
      'space-evenly': 'dc-stack--justify-space-evenly',
    },
  },
  defaultVariants: {
    direction: 'vertical',
    gap: 0,
    align: 'start',
    justify: 'start',
  },
});

function StackRender(props: PureRenderProps<StackSchema>) {
  const field = props.field as StackSchema;

  const direction = field.direction ?? 'vertical';
  const gap: StackGap = field.gap ?? 0;
  const align = field.align ?? 'start';
  const justify = field.justify ?? 'start';

  const className = twMerge(stackVariants({ direction, gap, align, justify }));

  return (
    <div
      class={`${className} dc-container-body`}
      data-component="stack"
      id={props.domId}
      data-direction={direction}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
    >
      <ChildrenSlot field={field as unknown as ContainerField} />
    </div>
  );
}

export const StackComponent = defineComponent<StackSchema>({
  type: 'stack',
  name: '스택',
  group: 'container',
  icon: StackIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: stackPropsSchema,
  create: (options = {}) => ({
    type: 'stack',
    direction: 'vertical',
    gap: 0,
    components: [],
    ...options,
  }),
  render: StackRender,
});
