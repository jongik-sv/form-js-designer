import { h, render } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
// @ts-ignore — form-js-editor has no bundled type declarations
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import { DesignerComponentsModule, migrateLegacyTabsSchema } from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';
import { PaletteModule } from './modules/PaletteModule';
import { OutlineModule } from './modules/OutlineModule';
import { MarqueeModule } from './modules/MarqueeModule';
import { ShortcutModule } from './modules/ShortcutModule';
import { PropsPanelModule } from './modules/PropsPanelModule';
import { LivePreviewModule } from './modules/LivePreviewModule';
import { ValidateModule } from './modules/ValidateModule';
import { ExportModule } from './modules/ExportModule';
import { installPropsPanelFocusGuard } from './hooks/usePropsPanelFocusGuard';

// Layout CSS — replicates host App.tsx imports so form-js editor + outline +
// properties panel render correctly inside the modal. Without these the
// palette stretches horizontally, outline doesn't render, props panel is
// offscreen, and the 3-column layout collapses.
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@bpmn-io/form-js-editor/dist/assets/form-js-editor-base.css';
import '@bpmn-io/form-js-editor/dist/assets/form-js-editor.css';
import '@bpmn-io/form-js-editor/dist/assets/properties-panel.css';
import '@bpmn-io/form-js-editor/dist/assets/dragula.css';
import './app.css';

export type FormSchema = { type: string; components: unknown[]; [k: string]: unknown };

export interface MountEmbeddedEditorModalOptions {
  /** 모달 wrapper가 마운트될 부모. 기본 document.body */
  container?: HTMLElement;
  /** 디자이너 초기 스키마 */
  initialSchema: FormSchema;
  /** 자동저장 콜백. close 시 항상 호출. async OK. 실패(reject/throw) 시 모달 유지 */
  onSave: (schema: FormSchema) => void | Promise<void>;
  /** 모달 unmount 직후 호출. triggerClose / destroy 양쪽 경로 모두에서 fire (정확히 1회) */
  onClose?: () => void;
}

export interface EmbeddedEditorHandle {
  /** 외부 강제 종료 — onSave 호출 없이 즉시 cleanup. onClose는 fire */
  destroy(): void;
  /**
   * 현재 schema 조회 (sync).
   *
   * 주의 — 라이브 편집 중간값은 반영되지 않는다. 반환값은
   * `initialSchema` (모달 오픈 시점) 또는 `triggerClose`가
   * `editor.saveSchema()`로 갱신한 마지막 저장 스키마이다. 편집 중인
   * 라이브 스키마가 필요하면 `editor.saveSchema()`를 외부에서 직접 호출.
   */
  getSchema(): FormSchema;
}

interface FormEditorInstance {
  importSchema: (schema: FormSchema) => Promise<void>;
  saveSchema: () => Promise<{ schema: FormSchema }>;
  destroy: () => void;
  get?: (key: string, optional?: boolean) => unknown;
}

const ROOT_CLASS = 'fjd-embedded-designer-root';
const HEADER_CLASS = 'fjd-embedded-designer-header';
const CONTENT_CLASS = 'fjd-embedded-designer-content';
const CLOSE_BTN_CLASS = 'fjd-embedded-designer-close';
const CANVAS_CLASS = 'fjd-embedded-designer-canvas';
const LAYOUT_CLASS = 'fjd-embedded-designer-layout';
const AREA_CLASS = 'fjd-embedded-designer-area';
const MAIN_CLASS = 'fjd-embedded-designer-main';
const OUTLINE_CLASS = 'fjd-embedded-designer-outline';
const PROPS_CLASS = 'fjd-embedded-designer-props';
const PROPS_NATIVE_CLASS = 'fjd-embedded-designer-props-native';

/**
 * Imperative mount of the form-js editor inside a fullscreen modal shell.
 *
 * The modal shell is a vanilla DOM wrapper (header + content); the designer
 * canvas is a Preact <App /> mounted inside the content area. ESC and the
 * [닫기] button both funnel into triggerClose, which awaits onSave then
 * cleans up. handle.destroy() is for external force-close (e.g. tiptap
 * editor.destroy()) and skips onSave but still fires onClose.
 *
 * The inner layout replicates host App.tsx — Outline (left) + form-js canvas
 * (center) + form-js native properties panel (right) — but intentionally
 * omits Sidebar tabs / Live Preview / Validate / Export toolbar (the
 * embedded version is simpler than the standalone host).
 */
export async function mountEmbeddedEditorModal(
  opts: MountEmbeddedEditorModalOptions,
): Promise<EmbeddedEditorHandle> {
  const { container = document.body, initialSchema, onSave, onClose } = opts;

  // 1. Build modal shell
  const wrapper = document.createElement('div');
  wrapper.className = ROOT_CLASS;
  wrapper.tabIndex = -1;
  const header = document.createElement('div');
  header.className = HEADER_CLASS;
  const title = document.createElement('h2');
  title.textContent = 'Form Designer';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = CLOSE_BTN_CLASS;
  closeBtn.textContent = '닫기';
  header.append(title, closeBtn);
  const content = document.createElement('div');
  content.className = CONTENT_CLASS;
  wrapper.append(header, content);
  container.appendChild(wrapper);

  // 2. Lock body scroll
  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // 3. Mount Preact app + form-js editor
  let editorInstance: FormEditorInstance | null = null;
  let attachedPropsPanel: { detach?: () => void } | null = null;
  let currentSchema: FormSchema = initialSchema;
  let closing = false;

  const App = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<HTMLDivElement>(null);
    const propsRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const editorEl = editorRef.current;
      if (!editorEl) return;
      const additionalModules: unknown[] = [
        DesignerContainerModule,
        DesignerComponentsModule,
        PaletteModule,
        OutlineModule,
        MarqueeModule,
        ShortcutModule,
        PropsPanelModule,
        LivePreviewModule,
        ValidateModule,
        ExportModule,
        LayoutHeightModule,
      ];
      // form-js 의 propertiesPanel.parent 를 offscreen 으로 만들어두면
      // 내부의 fjs-editor-properties-container 가 detached 상태로 생성된다.
      // 이후 propertiesPanel.attachTo() 로 우측 .props-panel-native 슬롯에 마운트한다.
      const offscreenPropsParent = document.createElement('div');
      try {
        const editor = new FormEditor({
          container: editorEl,
          additionalModules,
          propertiesPanel: { parent: offscreenPropsParent },
        } as ConstructorParameters<typeof FormEditor>[0]) as unknown as FormEditorInstance;
        editorInstance = editor;
        editor
          .importSchema(migrateLegacyTabsSchema(initialSchema))
          .then(() => {
            // wire outline + props panel after schema imports — same as App.tsx
            const outlineEl = outlineRef.current;
            if (outlineEl && typeof editor.get === 'function') {
              try {
                const outlinePanel = editor.get('outlinePanel', false) as
                  | { mount?: (el: HTMLElement) => void }
                  | undefined;
                outlinePanel?.mount?.(outlineEl);
              } catch { /* ignore */ }
            }
            const propsEl = propsRef.current;
            if (propsEl && typeof editor.get === 'function') {
              try {
                const propsPanel = editor.get('propertiesPanel', false) as
                  | { attachTo?: (el: HTMLElement) => void; detach?: () => void }
                  | undefined;
                if (propsPanel?.attachTo) {
                  propsPanel.attachTo(propsEl);
                  attachedPropsPanel = propsPanel;
                }
              } catch { /* ignore */ }
            }
          })
          .catch((err: Error) => {
            console.error('[embedded-designer] importSchema failed:', err);
          });
      } catch (err) {
        console.error('[embedded-designer] FormEditor construction failed:', err);
      }
      return () => {
        // detach propertiesPanel before destroy to avoid stale-DOM warnings
        try { attachedPropsPanel?.detach?.(); } catch { /* ignore */ }
        attachedPropsPanel = null;
        try { editorInstance?.destroy(); } catch { /* ignore */ }
        editorInstance = null;
      };
    }, []);

    return h(
      'div',
      { class: `${LAYOUT_CLASS} app-layout` },
      h(
        'div',
        { class: `${AREA_CLASS} editor-area` },
        h(
          'div',
          { class: `${MAIN_CLASS} editor-main` },
          h(
            'div',
            { class: `${OUTLINE_CLASS} outline-container`, 'data-outline-container': '' },
            h(
              'div',
              { class: 'outline-header' },
              h('h3', null, '아웃라인'),
            ),
            h('div', { class: 'outline-root', ref: outlineRef }),
          ),
          h('div', { class: `${CANVAS_CLASS} editor-container`, ref: editorRef }),
        ),
      ),
      h(
        'div',
        { class: `${PROPS_CLASS} side-panel` },
        h(
          'div',
          { class: 'props-panel-stack' },
          h('div', { class: `${PROPS_NATIVE_CLASS} props-panel-native`, ref: propsRef }),
        ),
      ),
    );
  };

  render(h(App, {}), content);

  // 4. Install focus guard scoped to this modal.
  //    NOTE: installPropsPanelFocusGuard mutates HTMLElement.prototype.focus.
  //    Stacking two concurrent modals would corrupt the patch chain because
  //    each call captures the current prototype as `orig` and restores to it.
  //    Concurrent instances are intentionally prevented at the consumer side
  //    (designer-tiptap modalPortal enforces single-instance) — do not lift
  //    that constraint without first making the focus-guard install a
  //    refcount-aware operation.
  const uninstallFocusGuard = installPropsPanelFocusGuard(wrapper);

  // 5. Schema accessor — returns last-known schema (sync)
  //    triggerClose path awaits saveSchema before onSave for accurate snapshot
  const getSchema = (): FormSchema => currentSchema;

  // 6. finishClose — common cleanup, called by both triggerClose and destroy
  const finishClose = () => {
    if (closing) return;
    closing = true;
    render(null, content); // unmount Preact (also runs editor cleanup)
    wrapper.removeEventListener('keydown', keyHandler, true);
    closeBtn.removeEventListener('click', closeBtnHandler);
    uninstallFocusGuard();
    wrapper.remove();
    document.body.style.overflow = prevBodyOverflow;
    onClose?.();
  };

  // 7. triggerClose — auto-save then cleanup
  const triggerClose = async () => {
    if (closing) return;
    try {
      let schemaToSave: FormSchema = currentSchema;
      if (editorInstance && typeof editorInstance.saveSchema === 'function') {
        const saved = await editorInstance.saveSchema();
        schemaToSave = saved?.schema ?? currentSchema;
        currentSchema = schemaToSave;
      }
      await onSave(schemaToSave);
    } catch (err) {
      console.error('[embedded-designer] onSave failed:', err);
      return; // keep modal open
    }
    finishClose();
  };

  // 8. Listeners
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      void triggerClose();
    }
  };
  const closeBtnHandler = () => {
    void triggerClose();
  };
  wrapper.addEventListener('keydown', keyHandler, true);
  closeBtn.addEventListener('click', closeBtnHandler);

  // 9. Focus the wrapper so ESC works immediately
  wrapper.focus();

  return {
    destroy() {
      finishClose();
    },
    getSchema,
  };
}
