/**
 * PropsPanelModeToggle — Simple/Full props-panel segmented control for the
 * VS Code extension webview.
 *
 * Mirrors the host's `designer-editor-host/src/components/PropsPanelModeToggle.tsx`
 * one-for-one (same DOM structure, same data-testid scheme) so Playwright
 * scenarios written against the host can be reused inside the webview.
 */

import { h } from 'preact';
import type { PanelMode } from '@form-js-designer/designer-core';

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
