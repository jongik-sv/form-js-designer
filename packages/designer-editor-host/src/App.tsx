/**
 * App — form-js Editor Host 앱 컴포넌트 (TSK-06-01 + TSK-06-02)
 *
 * FormEditor 인스턴스를 useLayoutEffect로 생성하고
 * DesignerComponentsModule + PaletteModule + OutlineModule +
 * PropsPanelModule + LivePreviewModule + ValidateModule + ExportModule을
 * additionalModules로 주입한다. Table 은 form-js native 컴포넌트를 그대로 사용한다.
 *
 * 레이아웃:
 *   [LeftRail(컴포넌트|아웃라인) + EditorHost] [side-panel: Sidebar(탭) + PropsPanelContainer | LivePreviewPanel]
 *   상단 툴바: Validate / Export JSON / Copy CLI 버튼
 *   상태바: ValidationBadge
 */

import { h } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
// @ts-ignore — form-js-editor has no bundled type declarations; skip lib check
import { FormEditor } from '@bpmn-io/form-js-editor';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import type { ValidationResult } from '@form-js-designer/designer-core';
import { DesignerComponentsModule, migrateLegacyTabsSchema } from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';
import { PaletteModule } from './modules/PaletteModule';
import { OutlineModule } from './modules/OutlineModule';
import { MarqueeModule } from './modules/MarqueeModule';
import { InlineLabelEditModule } from './modules/InlineLabelEditModule';
import { ShortcutModule } from './modules/ShortcutModule';
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
import { PanelSplitter } from './components/PanelSplitter';
import { SidePanelToggle } from './components/SidePanelToggle';
import { ComponentResizeOverlay } from './components/ComponentResizeOverlay';
import { LeftRailTabs, type LeftRailTab } from './components/LeftRailTabs';
import { usePanelResize } from './hooks/usePanelResize';
import { installPropsPanelFocusGuard } from './hooks/usePropsPanelFocusGuard';
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
// 캔버스 spacing override — app.css 다음 순서여야 cascade 우선
import '@form-js-designer/designer-components/canvas-spacing.css';

const DEFAULT_SCHEMA = {
  type: 'default',
  components: [],
};

export function App(): h.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const nativePropsPanelRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const paletteSlotRef = useRef<HTMLDivElement>(null);
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
  const [leftTab, setLeftTab] = useState<LeftRailTab>('components');

  // 패널 max 너비는 viewport 기반(최소 900, 최대 1600, 좌측 영역 400px 확보)
  const computeMaxPanelWidth = (): number => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
    return Math.min(1600, Math.max(900, vw - 400));
  };
  const [maxPanelWidth, setMaxPanelWidth] = useState<number>(computeMaxPanelWidth);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setMaxPanelWidth(computeMaxPanelWidth());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 패널 리사이즈 상태
  const {
    width: panelWidth,
    collapsed: panelCollapsed,
    toggleCollapse,
    startDrag,
    adjustWidth,
  } = usePanelResize({ initialWidth: 300, minWidth: 180, maxWidth: maxPanelWidth });

  useLayoutEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    // form-js가 canvas의 fjs-editor-selected 요소로 focus 를 자동 이동시키는 동작을
    // props-panel input 포커스 상태에서는 차단한다 (숫자/문자 입력 중 focus steal 방지).
    const uninstallFocusGuard = installPropsPanelFocusGuard();

    let editor: InstanceType<typeof FormEditor> | null = null;

    try {
      const additionalModules: unknown[] = [
        // DesignerContainerModule은 formLayouter 서비스를 override 하므로
        // 다른 모듈이 formLayouter를 주입받기 전에 로드되어야 함.
        DesignerContainerModule,
        DesignerComponentsModule,
        PaletteModule,
        OutlineModule,
        MarqueeModule,
        InlineLabelEditModule,
        ShortcutModule,
        PropsPanelModule,
        LivePreviewModule,
        ValidateModule,
        ExportModule,
        // TSK-12-02: layout.height DOM inline style 주입
        LayoutHeightModule,
      ];

      // propertiesPanel.parent 를 제공하면 form-js 내장 "fjs-editor-properties-container"
      // 자동 attach 로직이 비활성화된다 (form-js source: defaultPropertiesPanel()).
      // 이 때 호스트가 propertiesPanel.attachTo() 로 side-panel 에 직접 마운트한다.
      const offscreenPropsParent = document.createElement('div');
      editor = new FormEditor({
        container,
        additionalModules,
        propertiesPanel: { parent: offscreenPropsParent },
      } as ConstructorParameters<typeof FormEditor>[0]);

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

        // 팔레트 DOM을 left-rail components 슬롯으로 옮긴다.
        // form-js dragula는 element 자체에 listener를 박으므로 reparent 안전.
        const paletteEl = container.querySelector('.fjs-palette-container');
        const paletteSlot = paletteSlotRef.current;
        if (paletteEl && paletteSlot && paletteEl.parentElement !== paletteSlot) {
          paletteSlot.appendChild(paletteEl);
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
      uninstallFocusGuard();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // form-js 내장 propertiesPanel 을 side-panel(ref div) 에 attach.
  // tab 이 'props' 로 바뀔 때마다 ref 가 새로 마운트되므로 attach/detach 를 재실행한다.
  useEffect(() => {
    const editor = editorInstanceRef.current;
    const mountEl = nativePropsPanelRef.current;
    if (!editor || !mountEl || panelCollapsed || tab !== 'props') return;

    const nativePP = editor.get('propertiesPanel', false) as
      | { attachTo: (el: HTMLElement) => void; detach: () => void }
      | undefined;
    if (!nativePP) return;

    try { nativePP.attachTo(mountEl); } catch (err) {
      console.warn('[App] propertiesPanel.attachTo 실패:', err);
    }
    return () => {
      try { nativePP.detach(); } catch { /* ignore */ }
    };
  }, [tab, panelCollapsed, services.propsPanel]);

  return (
    <div class="app-layout">
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
          <div
            class="left-rail"
            data-active-panel={leftTab}
          >
            <LeftRailTabs activeTab={leftTab} onTabChange={setLeftTab} />
            <div class="left-rail__panels">
              <div
                id="left-rail-panel-components"
                class="left-rail__panel"
                data-panel="components"
                role="tabpanel"
                aria-labelledby="left-tab-components"
                ref={paletteSlotRef}
              />
              <div
                id="left-rail-panel-outline"
                class="left-rail__panel"
                data-panel="outline"
                data-outline-container
                role="tabpanel"
                aria-labelledby="left-tab-outline"
                ref={outlineRef}
              />
            </div>
          </div>
          <div class="editor-container" ref={editorRef} data-testid="editor-root" />
          {/* TSK-12-02: 컴포넌트 높이 리사이즈 핸들 — editor 기준 absolute 포지셔닝
              services.eventBus 를 조건으로 사용: setServices()가 트리거한 리렌더 시점에
              editorInstanceRef.current 도 반드시 채워져 있음이 보장된다. */}
          {services.eventBus && editorInstanceRef.current && (
            <ComponentResizeOverlay editor={editorInstanceRef.current} />
          )}
        </div>
      </div>

      {/* splitter — .editor-area 우측과 .side-panel 사이 */}
      {!panelCollapsed && (
        <PanelSplitter
          width={panelWidth}
          minWidth={180}
          maxWidth={maxPanelWidth}
          onDragStart={startDrag}
          onAdjust={adjustWidth}
        />
      )}

      {/* 토글 버튼 — splitter/side-panel 사이에 독립 배치 (overflow clip 방지) */}
      <SidePanelToggle
        collapsed={panelCollapsed}
        onToggle={toggleCollapse}
        panelLabel={tab === 'preview' ? '라이브 프리뷰' : '속성'}
        panelId="side-panel"
      />

      {/* 우측 패널 — Properties / Live Preview 탭 + 선택된 콘텐츠 */}
      <div
        class={`side-panel${panelCollapsed ? ' side-panel--collapsed' : ''}`}
        id="side-panel"
        data-testid="side-panel"
        style={panelCollapsed ? undefined : { '--side-panel-width': `${panelWidth}px` } as Record<string, string>}
      >
        {!panelCollapsed && (
          <Sidebar activeTab={tab} onTabChange={setTab} />
        )}
        {!panelCollapsed && tab === 'props' && (
          <div class="props-panel-stack" data-testid="props-stack">
            {/* 기본 form-js 속성 (General/Condition/Layout/Validation/Custom) */}
            <div ref={nativePropsPanelRef} class="props-panel-native" data-testid="props-native" />
            {/* designer-components 전용 속성 (padding, orientation, ...) */}
            <PropsPanelContainer
              propsPanelService={services.propsPanel}
              eventBus={services.eventBus}
            />
          </div>
        )}
        {!panelCollapsed && tab === 'preview' && (
          <LivePreviewPanel livePreviewService={services.livePreview} />
        )}
        {!panelCollapsed && tab === null && (
          <div class="side-panel--empty" data-testid="side-panel-empty">
            <p>상단 탭에서 패널을 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
