import { useCallback, useEffect, useId, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

// CSS selector for focusable descendants — WAI-ARIA focus-trap candidates.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'object',
  'embed',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
  );
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: (props: {
    onClick: () => void;
    ref: (el: HTMLButtonElement | null) => void;
    'aria-haspopup': 'dialog';
    'aria-expanded': boolean;
  }) => JSX.Element;
  title: string;
  description?: string;
  children: ComponentChildren | ((close: () => void) => ComponentChildren);
}

export function Dialog(props: DialogProps) {
  const { open: controlledOpen, defaultOpen = false, onOpenChange, trigger, title, description, children } = props;
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Focus trap + initial focus + ESC + scroll lock. One effect — WAI-ARIA requirements:
  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const initial = getFocusable(content);
    if (initial.length > 0) initial[0].focus();
    else content.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = getFocusable(content);
        if (focusables.length === 0) {
          e.preventDefault();
          content.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !content.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      const returnTo = triggerRef.current ?? previouslyFocused;
      if (returnTo && typeof returnTo.focus === 'function') returnTo.focus();
    };
  }, [open, close]);

  const overlayMouseDownRef = useRef(false);
  const onOverlayMouseDown = (e: MouseEvent) => {
    overlayMouseDownRef.current = e.target === e.currentTarget;
  };
  const onOverlayClick = (e: MouseEvent) => {
    if (overlayMouseDownRef.current && e.target === e.currentTarget) close();
    overlayMouseDownRef.current = false;
  };

  const childrenNode =
    typeof children === 'function'
      ? (children as (c: () => void) => ComponentChildren)(close)
      : children;

  return (
    <>
      {trigger({
        onClick: () => setOpen(!open),
        ref: (el) => {
          triggerRef.current = el;
        },
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
      })}
      {open ? (
        <div
          class="caria-overlay"
          data-testid="dialog-overlay"
          onMouseDown={onOverlayMouseDown as unknown as JSX.MouseEventHandler<HTMLDivElement>}
          onClick={onOverlayClick as unknown as JSX.MouseEventHandler<HTMLDivElement>}
        >
          <div
            ref={contentRef}
            class="caria-content"
            data-testid="dialog-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
          >
            <h2 id={titleId} class="caria-title">
              {title}
            </h2>
            {description ? (
              <p id={descId} class="caria-desc">
                {description}
              </p>
            ) : null}
            {childrenNode}
          </div>
        </div>
      ) : null}
    </>
  );
}
