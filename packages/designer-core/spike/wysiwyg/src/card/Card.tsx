import { defineComponent } from '../../../../src/index';

export default defineComponent({
  type: 'card',
  name: 'Card',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: true,
  propsSchema: {
    properties: {
      label:     { type: 'string',  default: '' },
      padding:   { type: 'enum', enum: ['none', 'sm', 'md', 'lg'], default: 'md' },
      elevation: { type: 'number', default: 1, min: 0, max: 2 },
      header:    { type: 'boolean', default: true },
    },
  },
  create: (options = {}) => ({
    type: 'card',
    label: 'Card',
    padding: 'md',
    elevation: 1,
    header: true,
    components: [],
    ...options,
  }),
  render: ({ field, domId }) => {
    const { id, label = '', padding = 'md', elevation = 1, header = true } = field as {
      id: string;
      type: string;
      label?: string;
      padding?: string;
      elevation?: number;
      header?: boolean;
    };
    const showHeader = header !== false && !!label;
    return (
      <div
        class={`designer-card designer-card--pad-${padding} designer-card--elev-${elevation}`}
        data-fjs-id={id}
        id={domId}
      >
        {showHeader && (
          <div class="designer-card__header">
            <span class="designer-card__title">{label}</span>
          </div>
        )}
        <div class="designer-card__body">
          <p class="designer-card__text">Hello, designer.</p>
        </div>
      </div>
    );
  },
});
