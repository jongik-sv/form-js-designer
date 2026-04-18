/**
 * App — form-js Editor Host 앱 컴포넌트 (TSK-06-01 + TSK-06-02)
 *
 * FormEditor 인스턴스를 useLayoutEffect로 생성하고
 * DesignerComponentsModule + DesignerTableModule + PaletteModule + OutlineModule +
 * PropsPanelModule + LivePreviewModule + ValidateModule + ExportModule을
 * additionalModules로 주입한다.
 *
 * 레이아웃:
 *   [Sidebar] [Outline + EditorHost] [PropsPanelContainer | LivePreviewPanel]
 *   상단 툴바: Validate / Export JSON / Copy CLI 버튼
 *   상태바: ValidationBadge
 */

import { h } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
// @ts-ignore — form-js-editor has no bundled type declarations; skip lib check
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import type { ValidationResult } from '@form-js-designer/designer-core';
import { DesignerComponentsModule, migrateLegacyTabsSchema } from '@form-js-designer/designer-components';
import { DesignerTableModule } from '@form-js-designer/designer-table';
import { PaletteModule } from './modules/PaletteModule';
import { OutlineModule } from './modules/OutlineModule';
import { PropsPanelModule } from './modules/PropsPanelModule';
import { PropsPanelService } from './modules/PropsPanelService';
import { LivePreviewModule } from './modules/LivePreviewModule';
import { LivePreviewService } from './modules/LivePreviewService';
import { ValidateModule } from './modules/ValidateModule';
import { ValidateService } from './modules/ValidateService';
import { ExportModule } from './modules/ExportModule';
import { ExportService } from './modules/ExportService';
import { Sidebar } from './components/Sidebar';
import { PropsPanelContainer } from './components/PropsPanelContainer';
import { LivePreviewPanel } from './components/LivePreviewPanel';
import { ToolbarButtons } from './components/ToolbarButtons';
import { ValidationBadge } from './components/ValidationBadge';
import { useSidePanelTab } from './router';
// form-js.css is the full viewer stylesheet (superset of form-js-base.css).
// Required for the Carbon grid column distribution rules (.cds--col-lg-*,
// @media min-width: 66rem). Without it .cds--col falls back to 100% width
// so multi-column rows stack vertically — horizontal layout is broken.
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@bpmn-io/form-js-editor/dist/assets/form-js-editor-base.css';
import '@bpmn-io/form-js-editor/dist/assets/form-js-editor.css';
import '@bpmn-io/form-js-editor/dist/assets/properties-panel.css';
import '@bpmn-io/form-js-editor/dist/assets/dragula.css';
import './app.css';

const DEFAULT_SCHEMA = {
  type: 'default',
  components: [],
};

export function App(): h.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<InstanceType<typeof FormEditor> | null>(null);

  // 서비스 상태 — 에디터 초기화 완료 후 setState로 리렌더 트리거
  const [services, setServices] = useState<{
    propsPanel: PropsPanelService | null;
    livePreview: LivePreviewService | null;
    validate: ValidateService | null;
    exportSvc: ExportService | null;
    eventBus: { on: (...a: unknown[]) => void; off: (...a: unknown[]) => void } | null;
  }>({
    propsPanel: null,
    livePreview: null,
    validate: null,
    exportSvc: null,
    eventBus: null,
  });

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [tab, setTab] = useSidePanelTab();

  useLayoutEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    let editor: InstanceType<typeof FormEditor> | null = null;

    try {
      const additionalModules: unknown[] = [
        // DesignerContainerModule은 formLayouter 서비스를 override 하므로
        // 다른 모듈이 formLayouter를 주입받기 전에 로드되어야 함.
        DesignerContainerModule,
        DesignerComponentsModule,
        DesignerTableModule,
        PaletteModule,
        OutlineModule,
        PropsPanelModule,
        LivePreviewModule,
        ValidateModule,
        ExportModule,
      ];

      editor = new FormEditor({
        container,
        additionalModules,
      });

      editorInstanceRef.current = editor;
      // expose editor for e2e debugging
      (window as unknown as { __editor?: unknown }).__editor = editor;

      // 기본 스키마 임포트 — legacy tabs[] 구조가 있으면 tabPanel 구조로 마이그레이션
      editor.importSchema(migrateLegacyTabsSchema(DEFAULT_SCHEMA)).then(() => {
        // OutlineModule의 outlinePanel 서비스에 컨테이너 마운트
        const outlineContainer = outlineRef.current;
        if (outlineContainer && editor) {
          try {
            const outlinePanel = editor.get('outlinePanel', false) as
              | { mount?: (el: HTMLElement) => void }
              | undefined;
            if (outlinePanel && typeof outlinePanel.mount === 'function') {
              outlinePanel.mount(outlineContainer);
            }
          } catch { /* outlinePanel 서비스가 없는 경우 무시 */ }
        }

        // DI 서비스 획득
        if (editor) {
          try {
            const propsPanel = editor.get('propsPanel', false) as PropsPanelService | undefined;
            const livePreview = editor.get('livePreview', false) as LivePreviewService | undefined;
            const validate = editor.get('validate', false) as ValidateService | undefined;
            const exportSvc = editor.get('exportService', false) as ExportService | undefined;
            const eventBus = editor.get('eventBus', false) as
              | { on: (...a: unknown[]) => void; off: (...a: unknown[]) => void }
              | undefined;

            setServices({
              propsPanel: propsPanel ?? null,
              livePreview: livePreview ?? null,
              validate: validate ?? null,
              exportSvc: exportSvc ?? null,
              eventBus: eventBus ?? null,
            });
          } catch (err) {
            console.warn('[App] DI 서비스 획득 실패:', err);
          }
        }
      }).catch((err: Error) => {
        console.error('[designer-editor-host] importSchema 실패:', err);
      });
    } catch (err) {
      console.error('[designer-editor-host] FormEditor 생성 실패:', err);
    }

    return () => {
      if (editor) {
        try { editor.destroy(); } catch { /* cleanup 오류 무시 */ }
        editorInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div class="app-layout">
      {/* 사이드바 */}
      <Sidebar activeTab={tab} onTabChange={setTab} />

      {/* 아웃라인 + 에디터 */}
      <div class="editor-area">
        {/* 툴바 */}
        <div class="editor-toolbar">
          <ToolbarButtons
            validateService={services.validate}
            exportService={services.exportSvc}
            onValidateResult={setValidationResult}
          />
          <ValidationBadge result={validationResult} />
        </div>

        <div class="editor-main">
          <div class="outline-container" data-outline-container>
            <h3>아웃라인</h3>
            <div ref={outlineRef} data-testid="outline-root" />
          </div>
          <div class="editor-container" ref={editorRef} data-testid="editor-root" />
        </div>
      </div>

      {/* 우측 패널 — Props / LivePreview 탭 */}
      <div class="side-panel">
        {tab === 'props' && (
          <PropsPanelContainer
            propsPanelService={services.propsPanel}
            eventBus={services.eventBus}
          />
        )}
        {tab === 'preview' && (
          <LivePreviewPanel livePreviewService={services.livePreview} />
        )}
        {tab === null && (
          <div class="side-panel--empty" data-testid="side-panel-empty">
            <p>사이드바에서 패널을 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
