/**
 * TSK-05-02: TabPanelRenderer
 *
 * type:tabPanel 렌더러 — VSCode webview 전용 순수 Preact 컴포넌트.
 *
 * 설계 결정:
 * - isActive=false 시 HTML `hidden` 속성으로 DOM을 숨기되 컴포넌트는 항상 마운트 유지.
 *   form-js 기본 동작(inactive 패널 필드 값을 form data에 포함)을 보존하기 위해
 *   조건부 렌더(언마운트) 방식을 채택하지 않는다.
 * - ARIA: role=tabpanel, aria-labelledby(탭 버튼 id 연결).
 */
import { h, type ComponentType } from 'preact';

void h;

export interface TabPanelField {
  id: string;
  type: 'tabPanel';
  label: string;
  components: Array<{ id: string } & Record<string, unknown>>;
}

export interface TabPanelRendererProps {
  /** tabPanel 스키마 노드 */
  field: TabPanelField;
  /** 현재 활성화된 패널인지 여부 */
  isActive: boolean;
  /** 대응하는 탭 버튼의 DOM id (aria-labelledby 연결) */
  tabId: string;
  /** 이 패널 자신의 DOM id (tabs 버튼의 aria-controls 연결) */
  panelId: string;
  /**
   * 자식 components[]를 렌더하는 컴포넌트.
   * form-js Viewer가 주입하는 ChildrenRenderer와 동일 계약:
   * `({ field }) => JSX.Element`
   */
  ChildrenRenderer: ComponentType<{ field: TabPanelField }>;
}

/**
 * TabPanelRenderer — 개별 탭 패널.
 *
 * - isActive=true: visible (hidden 없음)
 * - isActive=false: hidden 속성으로 숨김 (컴포넌트는 마운트 유지)
 */
export function TabPanelRenderer({
  field,
  isActive,
  tabId,
  panelId,
  ChildrenRenderer,
}: TabPanelRendererProps) {
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!isActive}
      class="fj-tabs-panel"
    >
      <ChildrenRenderer field={field} />
    </div>
  );
}
