/**
 * PropsPanelModeToggle — TSK-05
 *
 * Simple/Full 모드 전환용 segmented control.
 * App.tsx (Task 7) 가 props panel stack 위에 마운트하며,
 * data-testid (props-mode-simple / props-mode-full) 는 Task 8 Playwright 시나리오에서 사용된다.
 */

import { h } from 'preact';

export type PanelMode = 'simple' | 'full';

interface Props {
  mode: PanelMode;
  onChange: (m: PanelMode) => void;
}

export function PropsPanelModeToggle({ mode, onChange }: Props): h.JSX.Element {
  return (
    <div class="props-panel-mode-toggle" role="tablist" aria-label="속성 패널 모드">
      {(['simple', 'full'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          class={`props-panel-mode-toggle__btn${mode === m ? ' is-active' : ''}`}
          data-testid={`props-mode-${m}`}
          onClick={() => onChange(m)}
        >
          {m === 'simple' ? 'Simple' : 'Full'}
        </button>
      ))}
    </div>
  );
}
