import { h } from 'preact';
import { useState } from 'preact/hooks';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField } from '@form-js-designer/designer-core';
import type { ModalSchema } from './propsSchema';
import { modalPropsSchema } from './propsSchema';
import { ModalIcon } from '../icons';
import './Modal.css';

void h;

const VALID_SIZES = new Set(['sm', 'md', 'lg']);

/**
 * Resolve a Portal container from a CSS selector reference.
 * Falls back to null (body) when:
 * - ref is not provided
 * - ref selector does not match any element
 */
function resolvePortalContainer(ref?: string): Element | null {
  if (!ref) return null;
  const el = document.querySelector(ref);
  if (!el) {
    console.warn(
      `[Modal] portalContainerRef selector "${ref}" did not match any element — falling back to <body>`,
    );
    return null;
  }
  return el;
}

/**
 * Validate Modal field props and warn/throw on violations (ADR-0002 D1 조건 2).
 */
function validateModalField(field: ModalSchema): void {
  if (!field.title) {
    // In dev mode: throw; in prod: warn (aria-label fallback)
    const msg = '[Modal] title is required (ADR-0002 D1 condition 2). Provide a non-empty title or aria-label.';
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'production') {
      console.warn(msg);
    } else {
      throw new Error(msg);
    }
  }
}

/**
 * Sanitize size: if invalid, fallback to "md"
 */
function sanitizeSize(size?: string): 'sm' | 'md' | 'lg' {
  if (size && VALID_SIZES.has(size)) return size as 'sm' | 'md' | 'lg';
  return 'md';
}

function ModalRender(props: PureRenderProps<ModalSchema>) {
  const field = props.field as ModalSchema;

  // Validate (throws in non-production if title is missing)
  validateModalField(field);

  const size = sanitizeSize(field.size);
  const triggerLabel = field.triggerLabel ?? 'Open';
  const title = field.title;
  const description = field.description;

  // Support controlled open state for testing (_open field)
  const controlledOpen = (field as Record<string, unknown>)['_open'] as boolean | undefined;

  const [isOpen, setIsOpen] = useState<boolean>(controlledOpen ?? false);

  // Resolve portal container
  const portalContainer = resolvePortalContainer(field.portalContainerRef);

  const effectiveOpen = controlledOpen !== undefined ? controlledOpen : isOpen;

  return (
    <div
      class="dc-modal"
      data-component="modal"
      id={props.domId}
    >
      <DialogPrimitive.Root
        open={effectiveOpen}
        onOpenChange={(open: boolean) => { if (controlledOpen === undefined) setIsOpen(open); }}
      >
        <DialogPrimitive.Trigger asChild>
          <button
            class="dc-modal__trigger"
            type="button"
            data-testid="open-modal"
          >
            {triggerLabel}
          </button>
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal container={portalContainer ?? undefined}>
          <DialogPrimitive.Overlay class="dc-modal__overlay" />
          <DialogPrimitive.Content
            class={`dc-modal__content dc-modal__content--${size}`}
            data-size={size}
            aria-modal="true"
            aria-describedby={description ? `${props.domId}-desc` : undefined}
          >
            <div class="dc-modal__header">
              <DialogPrimitive.Title class="dc-modal__title">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  class="dc-modal__close"
                  type="button"
                  aria-label="Close"
                  data-testid="close-modal"
                >
                  ×
                </button>
              </DialogPrimitive.Close>
            </div>

            {description && (
              <DialogPrimitive.Description
                id={`${props.domId}-desc`}
                class="dc-modal__description"
              >
                {description}
              </DialogPrimitive.Description>
            )}

            <div class="dc-modal__body dc-container-body">
              {/* Forward parent FormField props so children receive onChange. */}
              <ChildrenSlot {...props} field={field as unknown as ContainerField} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

export const ModalComponent = defineComponent<ModalSchema>({
  type: 'modal',
  name: '모달',
  group: 'container',
  icon: ModalIcon,
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: modalPropsSchema,
  create: (options = {}) => ({
    type: 'modal',
    title: 'Modal Title',
    description: '',
    triggerLabel: 'Open',
    size: 'md',
    components: [],
    ...options,
  }),
  render: ModalRender,
});
