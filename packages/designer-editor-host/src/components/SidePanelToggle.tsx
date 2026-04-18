/**
 * SidePanelToggle — 패널 열기/닫기 토글 버튼 컴포넌트
 * panel-resize-toggle feature
 *
 * Props:
 *   collapsed   — 현재 접힘 상태
 *   onToggle    — 클릭 시 호출
 *   panelLabel  — 패널 이름 (aria-label 동적 생성에 사용)
 *   panelId     — aria-controls 타겟 id
 *
 * 접근성:
 *   aria-expanded, aria-controls, aria-label (동적)
 */

import { h } from 'preact';

export interface SidePanelToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  panelLabel: string;
  panelId?: string;
}

export function SidePanelToggle({
  collapsed,
  onToggle,
  panelLabel,
  panelId,
}: SidePanelToggleProps): h.JSX.Element {
  const ariaLabel = collapsed
    ? `${panelLabel} 열기`
    : `${panelLabel} 닫기`;

  return (
    <button
      class="side-panel-toggle"
      data-testid="side-panel-toggle"
      type="button"
      aria-expanded={!collapsed}
      aria-controls={panelId}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      {/* 열린 상태: › (오른쪽 방향 = 패널 닫기), 접힌 상태: ‹ (왼쪽 방향 = 패널 열기) */}
      <span aria-hidden="true">{collapsed ? '‹' : '›'}</span>
    </button>
  );
}
