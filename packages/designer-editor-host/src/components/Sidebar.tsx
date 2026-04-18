/**
 * Sidebar — 에디터 호스트 앱 사이드바 (TSK-06-02)
 *
 * 메뉴 항목: Properties (#/props), Live Preview (#/preview)
 * 클릭 시 hash 탭 전환.
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
    <nav class="sidebar" role="navigation" aria-label="에디터 사이드바" data-testid="sidebar">
      <ul class="sidebar__nav">
        {navItems.map((item) => (
          <li key={item.id} class="sidebar__item">
            <a
              href={item.hash}
              class={`sidebar__link${activeTab === item.tab ? ' sidebar__link--active' : ''}`}
              data-testid={`sidebar-${item.id}`}
              aria-current={activeTab === item.tab ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(item.tab);
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
