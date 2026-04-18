/**
 * Sidebar — side-panel 상단 탭 바 (TSK-06-02)
 *
 * Properties / Live Preview 두 항목을 가로 탭으로 전환한다.
 * 해시(#/props, #/preview) 기반 라우팅은 그대로 유지하며,
 * 접근성을 위해 role="tablist" / role="tab" / aria-selected 를 사용한다.
 */

import { h } from 'preact';
import type { SidePanelTab } from '../router';

interface NavItem {
  id: string;
  labelKey: string;
  label: string;
  hash: string;
  tab: SidePanelTab;
}

export const navItems: NavItem[] = [
  { id: 'props', labelKey: 'designer.editor.sidebar.props', label: 'Properties', hash: '#/props', tab: 'props' },
  { id: 'preview', labelKey: 'designer.editor.sidebar.preview', label: 'Live Preview', hash: '#/preview', tab: 'preview' },
];

interface SidebarProps {
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps): h.JSX.Element {
  return (
    <nav
      class="sidebar"
      role="tablist"
      aria-label="사이드 패널 탭"
      aria-orientation="horizontal"
      data-testid="sidebar"
    >
      {navItems.map((item) => {
        const selected = activeTab === item.tab;
        return (
          <a
            key={item.id}
            href={item.hash}
            role="tab"
            class={`sidebar__link${selected ? ' sidebar__link--active' : ''}`}
            data-testid={`sidebar-${item.id}`}
            aria-selected={selected}
            aria-controls="side-panel"
            tabIndex={selected ? 0 : -1}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(item.tab);
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
