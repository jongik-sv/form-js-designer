/**
 * TSK-05-02: TabsRenderer
 *
 * type:tabs 렌더러 — VSCode webview 전용 순수 Preact 컴포넌트.
 *
 * 설계 결정:
 * - 탭 헤더: scrollable (overflow-x: auto) — tabs.css에서 확정.
 *   sticky는 webview 폭이 좁아 패널 콘텐츠 영역을 잠식하므로 채택하지 않음.
 * - 비활성 패널: CSS `hidden` 속성으로 숨기되 항상 마운트 유지 (form data 보존).
 * - 키보드: ArrowLeft/Right/Home/End ARIA Tabs Pattern (WAI-ARIA 1.2) 준수.
 * - ARIA: role=tablist / role=tab (aria-selected, aria-controls) / role=tabpanel (aria-labelledby).
 * - activeTab 스키마 속성: 해당 id가 존재하면 초기 활성 탭으로 사용, 없으면 0번 fallback.
 */
import { h, type ComponentType } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { TabPanelRenderer, type TabPanelField } from './TabPanelRenderer';
import './tabs.css';

void h;

export interface TabsField {
  id: string;
  type: 'tabs';
  /** 초기 활성 탭 id override. 없으면 첫 번째 tabPanel 활성화. */
  activeTab?: string;
  components: TabPanelField[];
}

export interface TabsRendererProps {
  /** tabs 스키마 노드 */
  field: TabsField;
  /**
   * 자식 components[]를 렌더하는 컴포넌트.
   * TabPanelRenderer에 그대로 전달된다.
   */
  ChildrenRenderer: ComponentType<{ field: TabPanelField }>;
}

// ── DOM id 생성 헬퍼 ──────────────────────────────────────────
// tabPanel id를 기반으로 탭 버튼/패널 DOM id를 일관된 방식으로 생성한다.
// 두 값을 함께 구조 분해하여 호출하면 aria-controls/aria-labelledby 연결 오류를 방지한다.

interface PanelDomIds {
  tabId: string;
  panelId: string;
}

function makePanelDomIds(panelId: string): PanelDomIds {
  return {
    tabId: `fj-tab-btn-${panelId}`,
    panelId: `fj-tab-panel-${panelId}`,
  };
}

// ── 초기 인덱스 결정 ──────────────────────────────────────────

/** tabPanel 목록에서 activeTab id 기반으로 초기 인덱스를 결정한다. */
function resolveInitialIndex(panels: TabPanelField[], activeTab?: string): number {
  if (!activeTab || panels.length === 0) return 0;
  const idx = panels.findIndex((p) => p.id === activeTab);
  return idx >= 0 ? idx : 0;
}

// ── 탭 포커스 + 스크롤 ────────────────────────────────────────

/**
 * 탭 버튼에 포커스를 이동하고, scrollable 헤더 영역에서 보이도록 스크롤한다.
 * jsdom 환경에서 scrollIntoView가 미구현이므로 실제 DOM API 존재 여부를 확인한다.
 */
function focusAndScrollTab(btn: HTMLButtonElement): void {
  btn.focus();
  btn.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

/**
 * TabsRenderer — 탭 컨테이너.
 *
 * - tablist 헤더 (scrollable, overflow-x: auto)
 * - 각 탭 버튼: role=tab, aria-selected, aria-controls
 * - 각 패널: TabPanelRenderer (role=tabpanel, aria-labelledby)
 * - 키보드: ArrowLeft/Right (순환), Home (첫 탭), End (마지막 탭)
 */
export function TabsRenderer({ field, ChildrenRenderer }: TabsRendererProps) {
  const panels = field.components.filter((c) => c.type === 'tabPanel');

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    resolveInitialIndex(panels, field.activeTab),
  );

  // 탭 버튼 DOM 참조 배열 — 키보드 포커스 관리용
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 탭 수 변경 시 refs 배열 크기를 동기화하여 stale ref 방지
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, panels.length);
  }, [panels.length]);

  // 외부 schema 변경(activeTab prop)에 반응하여 활성 인덱스를 재계산
  // panels는 render마다 새 배열이므로 field.activeTab만 의존
  useEffect(() => {
    setActiveIndex(resolveInitialIndex(panels, field.activeTab));
  }, [field.activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function activateTab(index: number): void {
    setActiveIndex(index);
    const btn = tabRefs.current[index];
    if (btn) {
      focusAndScrollTab(btn);
    }
  }

  function handleKeyDown(e: KeyboardEvent, currentIndex: number): void {
    const count = panels.length;
    if (count === 0) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        activateTab((currentIndex + 1) % count);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        activateTab((currentIndex - 1 + count) % count);
        break;
      case 'Home':
        e.preventDefault();
        activateTab(0);
        break;
      case 'End':
        e.preventDefault();
        activateTab(count - 1);
        break;
    }
  }

  return (
    <div class="fj-tabs">
      {/* tablist 헤더 — scrollable */}
      <div role="tablist" class="fj-tabs-header">
        {panels.map((panel, i) => {
          const isActive = i === activeIndex;
          const { tabId, panelId } = makePanelDomIds(panel.id);
          return (
            <button
              key={panel.id}
              id={tabId}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              class={`fj-tabs-tab${isActive ? ' fj-tabs-tab--active' : ''}`}
              onClick={() => activateTab(i)}
              onKeyDown={(e: KeyboardEvent) => handleKeyDown(e, i)}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
            >
              {panel.label || panel.id}
            </button>
          );
        })}
      </div>

      {/* 패널 영역 — 비활성 패널은 hidden이지만 항상 마운트 */}
      <div class="fj-tabs-body">
        {panels.map((panel, i) => {
          const { tabId, panelId } = makePanelDomIds(panel.id);
          return (
            <TabPanelRenderer
              key={panel.id}
              field={panel}
              isActive={i === activeIndex}
              tabId={tabId}
              panelId={panelId}
              ChildrenRenderer={ChildrenRenderer}
            />
          );
        })}
      </div>
    </div>
  );
}
