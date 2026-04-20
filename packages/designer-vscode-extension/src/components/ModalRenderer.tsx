/**
 * TSK-05-03: ModalRenderer
 *
 * form-js type: 'modal' 스키마 렌더러.
 * - trigger 버튼 (.fjs-modal-trigger) 클릭 → native <dialog>.showModal()
 * - Esc keydown / backdrop mousedown → dialog.close() + trigger 포커스 반환
 * - focus trap: Tab / Shift+Tab이 dialog 내부에서만 순환
 * - portal: getPortalRoot()로 .form-js-block 내부 .fjs-portal-root에 마운트
 * - document.body scroll lock 없음 (VSCode webview 정책)
 *
 * 제약: 외부 다이얼로그 라이브러리 금지 — Preact createPortal + native <dialog> 사용
 */
import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, ContainerField, FieldSchema } from '@form-js-designer/designer-core';
import { getPortalRoot } from './portalRoot';

void h;

// ── 스키마 타입 ──────────────────────────────────────────
export interface ModalTrigger {
  label: string;
  variant?: string;
}

export interface ModalRendererSchema extends FieldSchema {
  type: 'modal';
  trigger: ModalTrigger;
  components?: Array<{ id: string } & Record<string, unknown>>;
}

// ── props 스키마 ─────────────────────────────────────────
const modalRendererPropsSchema = {
  properties: {
    trigger: {
      type: 'object',
      label: 'Trigger',
      default: { label: 'Open', variant: 'primary' },
    },
  },
};

// ── focusTrap 유틸 ───────────────────────────────────────
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusTrap(dialogEl: HTMLDialogElement) {
  return function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}

// ── 렌더 함수 ────────────────────────────────────────────
function ModalRendererRender(props: PureRenderProps<ModalRendererSchema>) {
  const field = props.field as ModalRendererSchema;
  const { trigger } = field;

  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openModal = () => setIsOpen(true);

  const closeModal = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // isOpen 변화에 따라 showModal / close 호출
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // jsdom 등 showModal 미지원 환경 fallback
          dialog.setAttribute('open', '');
        }
      }
      const focusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      focusable?.focus();
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // focus trap 핸들러 등록
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trap = focusTrap(dialog);
    dialog.addEventListener('keydown', trap);
    return () => dialog.removeEventListener('keydown', trap);
  }, []);

  // backdrop mousedown → 닫기
  const handleDialogMouseDown = (e: MouseEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) closeModal();
  };

  // native dialog cancel 이벤트(Esc) → 닫기
  const handleCancel = (e: Event) => {
    e.preventDefault();
    closeModal();
  };

  // portal root — .form-js-block 내부 노드
  const hostEl =
    typeof document !== 'undefined'
      ? (triggerRef.current?.closest('.form-js-block') ?? null)
      : null;
  const portalContainer =
    typeof document !== 'undefined' ? getPortalRoot(hostEl) : null;

  const dialogContent = (
    <dialog
      ref={dialogRef}
      class="fjs-modal-dialog"
      onMouseDown={handleDialogMouseDown}
      onCancel={handleCancel}
      aria-modal="true"
      aria-label={trigger.label}
    >
      <div class="fjs-modal-dialog__body">
        <ChildrenSlot field={field as unknown as ContainerField} />
      </div>
      <button
        type="button"
        class="fjs-modal-dialog__close"
        onClick={closeModal}
        aria-label="닫기"
      >
        ×
      </button>
    </dialog>
  );

  return (
    <div class="fjs-modal" data-component="modal" id={props.domId}>
      <button
        ref={triggerRef}
        type="button"
        class={`fjs-modal-trigger fjs-modal-trigger--${trigger.variant ?? 'default'}`}
        onClick={openModal}
      >
        {trigger.label}
      </button>
      {portalContainer ? createPortal(dialogContent, portalContainer) : dialogContent}
    </div>
  );
}

// ── 컴포넌트 등록 ─────────────────────────────────────────
export const ModalRendererComponent = defineComponent<ModalRendererSchema>({
  type: 'modal',
  name: '모달',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: modalRendererPropsSchema,
  create: (options = {}) => ({
    type: 'modal',
    trigger: { label: 'Open', variant: 'primary' },
    components: [],
    ...options,
  }),
  render: ModalRendererRender,
});
