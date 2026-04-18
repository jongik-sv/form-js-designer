import type { PropsSchema } from '@form-js-designer/designer-core';

export interface ModalSchema {
  id: string;
  type: 'modal';
  title: string;
  description?: string;
  triggerLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  portalContainerRef?: string;
  components?: Array<{ id: string } & Record<string, unknown>>;
  [key: string]: unknown;
}

export const modalPropsSchema: PropsSchema = {
  properties: {
    title: {
      type: 'i18n',
      label: 'designer.components.modal.title',
      default: 'Modal Title',
    },
    description: {
      type: 'i18n',
      label: 'designer.components.modal.description',
      default: '',
    },
    triggerLabel: {
      type: 'i18n',
      label: 'designer.components.modal.triggerLabel',
      default: 'Open',
    },
    size: {
      type: 'enum',
      label: 'designer.components.modal.size',
      default: 'md',
      enum: ['sm', 'md', 'lg'] as const,
    },
    portalContainerRef: {
      type: 'string',
      label: 'designer.components.modal.portalContainerRef',
      default: '',
    },
  },
};
