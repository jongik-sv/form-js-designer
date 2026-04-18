/**
 * ValidationBadge — TSK-06-02
 *
 * 상태바 뱃지. 검증 결과에 따라 ok/error 상태를 표시한다.
 */

import { h } from 'preact';
import type { ValidationResult } from '@form-js-designer/designer-core';

interface ValidationBadgeProps {
  result: ValidationResult | null;
}

export function ValidationBadge({ result }: ValidationBadgeProps): h.JSX.Element {
  if (!result) {
    return (
      <span class="validation-badge validation-badge--idle" data-testid="validation-badge">
        —
      </span>
    );
  }

  if (result.ok) {
    return (
      <span class="validation-badge validation-badge--ok" data-testid="validation-badge">
        ✓ 유효
      </span>
    );
  }

  return (
    <span
      class="validation-badge validation-badge--error"
      data-testid="validation-badge"
      title={result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')}
    >
      ✗ {result.errors.length}건 오류
    </span>
  );
}
