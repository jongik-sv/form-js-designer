/**
 * ToolbarButtons — TSK-06-02
 *
 * 에디터 상단 툴바의 View JSON / Validate / Export JSON / Copy CLI 버튼.
 * View JSON 클릭 시 JsonModal 을 열어 현재 스키마를 표시/복사/붙여넣기로 반영한다.
 */

import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { ValidationResult } from '@form-js-designer/designer-core';
import { JsonModal } from './JsonModal';

interface ToolbarButtonsProps {
  validateService: {
    validate(): ValidationResult;
  } | null;
  exportService: {
    downloadJson(): void;
    buildPublishCommand(target: 'static' | 'api', url?: string): string;
    getSchemaJson(): string;
    importSchemaJson(text: string): Promise<void>;
  } | null;
  onValidateResult?: (result: ValidationResult) => void;
}

export function ToolbarButtons({
  validateService,
  exportService,
  onValidateResult,
}: ToolbarButtonsProps): h.JSX.Element {
  const [toast, setToast] = useState<string | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState<boolean>(false);
  const [jsonModalText, setJsonModalText] = useState<string>('');

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

  const handleOpenJsonModal = () => {
    if (!exportService) return;
    try {
      setJsonModalText(exportService.getSchemaJson());
      setJsonModalOpen(true);
    } catch (err) {
      showToast(`JSON 로드 실패: ${String(err)}`);
    }
  };

  const handleApplyJson = async (text: string) => {
    if (!exportService) throw new Error('exportService 가 아직 준비되지 않았습니다');
    await exportService.importSchemaJson(text);
    showToast('JSON 적용 완료');
  };

  return (
    <div class="toolbar-buttons" data-testid="toolbar-buttons">
      <button
        type="button"
        class="toolbar-btn toolbar-btn--view-json"
        data-testid="btn-view-json"
        onClick={handleOpenJsonModal}
      >
        View JSON
      </button>
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
      <JsonModal
        open={jsonModalOpen}
        initialText={jsonModalText}
        onApply={handleApplyJson}
        onClose={() => setJsonModalOpen(false)}
      />
    </div>
  );
}
