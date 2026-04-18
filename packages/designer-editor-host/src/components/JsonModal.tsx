/**
 * JsonModal — 현재 스키마 JSON 을 보고/복사/붙여넣어 적용할 수 있는 모달.
 *
 * 동작:
 *   - 오픈 시 ExportService.getSchemaJson() 결과를 textarea 에 채움
 *   - Copy: textarea 내용을 클립보드에 복사
 *   - Apply: textarea 내용을 ExportService.importSchemaJson() 으로 에디터에 반영
 *   - 취소/Esc/배경 클릭으로 닫기
 */

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export interface JsonModalProps {
  open: boolean;
  initialText: string;
  onApply: (text: string) => Promise<void> | void;
  onClose: () => void;
}

export function JsonModal({ open, initialText, onApply, onClose }: JsonModalProps): h.JSX.Element | null {
  const [text, setText] = useState<string>(initialText);
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setStatus({ kind: 'idle', message: '' });
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setStatus({ kind: 'ok', message: '클립보드에 복사되었습니다' });
    } catch (err) {
      setStatus({ kind: 'error', message: `복사 실패: ${String(err)}` });
    }
  };

  const handleApply = async () => {
    try {
      await onApply(text);
      setStatus({ kind: 'ok', message: '에디터에 적용되었습니다' });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message || String(err) });
    }
  };

  return (
    <div
      class="json-modal__backdrop"
      data-testid="json-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        class="json-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="json-modal-title"
        data-testid="json-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header class="json-modal__header">
          <h2 id="json-modal-title" class="json-modal__title">JSON 보기</h2>
          <button
            type="button"
            class="json-modal__close"
            aria-label="닫기"
            data-testid="json-modal-close"
            onClick={onClose}
          >×</button>
        </header>
        <textarea
          ref={textareaRef}
          class="json-modal__textarea"
          data-testid="json-modal-textarea"
          spellcheck={false}
          value={text}
          onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)}
        />
        {status.kind !== 'idle' && (
          <div
            class={`json-modal__status json-modal__status--${status.kind}`}
            role="status"
            data-testid="json-modal-status"
          >
            {status.message}
          </div>
        )}
        <footer class="json-modal__footer">
          <button
            type="button"
            class="toolbar-btn"
            data-testid="json-modal-copy"
            onClick={handleCopy}
          >복사</button>
          <button
            type="button"
            class="toolbar-btn toolbar-btn--primary"
            data-testid="json-modal-apply"
            onClick={handleApply}
          >에디터에 적용</button>
          <span class="json-modal__spacer" />
          <button
            type="button"
            class="toolbar-btn"
            data-testid="json-modal-cancel"
            onClick={onClose}
          >닫기</button>
        </footer>
      </div>
    </div>
  );
}
