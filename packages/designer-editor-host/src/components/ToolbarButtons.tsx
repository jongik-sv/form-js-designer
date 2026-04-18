/**
 * ToolbarButtons — TSK-06-02
 *
 * 에디터 상단 툴바의 Validate / Export JSON / Copy CLI 버튼 3개.
 */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { ValidationResult } from '@form-js-designer/designer-core';

interface ToolbarButtonsProps {
  validateService: {
    validate(): ValidationResult;
  } | null;
  exportService: {
    downloadJson(): void;
    buildPublishCommand(target: 'static' | 'api', url?: string): string;
  } | null;
  onValidateResult?: (result: ValidationResult) => void;
}

export function ToolbarButtons({
  validateService,
  exportService,
  onValidateResult,
}: ToolbarButtonsProps): h.JSX.Element {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleValidate = () => {
    if (!validateService) return;
    const result = validateService.validate();
    onValidateResult?.(result);
    if (result.ok) {
      showToast('검증 통과: 오류 없음');
    } else {
      showToast(`검증 실패: ${result.errors.length}건 오류`);
    }
  };

  const handleExportJson = () => {
    if (!exportService) return;
    try {
      exportService.downloadJson();
      showToast('JSON 내보내기 완료');
    } catch (err) {
      showToast(`내보내기 실패: ${String(err)}`);
    }
  };

  const handleCopyCli = async () => {
    if (!exportService) return;
    const cmd = exportService.buildPublishCommand('static');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cmd);
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = cmd;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('CLI 명령이 클립보드에 복사되었습니다');
    } catch {
      showToast(`클립보드 복사 실패: ${cmd}`);
    }
  };

  return (
    <div class="toolbar-buttons" data-testid="toolbar-buttons">
      <button
        type="button"
        class="toolbar-btn toolbar-btn--validate"
        data-testid="btn-validate"
        onClick={handleValidate}
      >
        Validate
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn--export"
        data-testid="btn-export"
        onClick={handleExportJson}
      >
        Export JSON
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn--cli"
        data-testid="btn-copy-cli"
        onClick={handleCopyCli}
      >
        Copy CLI
      </button>
      {toast && (
        <div class="toolbar-toast" data-testid="toolbar-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
