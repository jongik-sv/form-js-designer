/**
 * LeftRailTabs — 좌측 컬럼 상단 탭 바 (컴포넌트 / 아웃라인)
 *
 * editor host의 좌측 레일에서 컴포넌트 팔레트와 아웃라인 패널 간 전환에 사용한다.
 * Sidebar.tsx와 동일한 role=tablist 패턴을 따르되 라우팅 의존 없이 props만으로 동작한다.
 */

import { h } from 'preact';

export type LeftRailTab = 'components' | 'outline';

interface LeftRailTabsProps {
  activeTab: LeftRailTab;
  onTabChange: (tab: LeftRailTab) => void;
}

const TABS: Array<{ id: LeftRailTab; label: string; testId: string }> = [
  { id: 'components', label: '컴포넌트', testId: 'left-tab-components' },
  { id: 'outline', label: '아웃라인', testId: 'left-tab-outline' },
];

export function LeftRailTabs({ activeTab, onTabChange }: LeftRailTabsProps): h.JSX.Element {
  return (
    <nav
      class="left-rail__tabs"
      role="tablist"
      aria-label="좌측 패널 탭"
      aria-orientation="horizontal"
    >
      {TABS.map((t) => {
        const selected = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            class={`left-rail__tab${selected ? ' left-rail__tab--active' : ''}`}
            data-testid={t.testId}
            aria-selected={selected}
            aria-controls={`left-rail-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onTabChange(t.id);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
