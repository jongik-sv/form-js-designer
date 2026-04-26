/**
 * SchemaEditor — textarea 기반 스키마 JSON 직접 편집 UI
 *
 * Props:
 *  - initialValue: 초기 JSON 문자열
 *  - onSave: 유효한 JSON 저장 시 콜백
 *  - onCancel?: 취소 버튼 클릭 시 콜백 (선택)
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';

export interface SchemaEditorProps {
  initialValue: string;
  onSave: (json: string) => void;
  onCancel?: () => void;
}

export function SchemaEditor({ initialValue, onSave, onCancel }: SchemaEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  function handleInput(e: Event) {
    setValue((e.currentTarget as HTMLTextAreaElement).value);
    if (error) setError(null);
  }

  function handleSave() {
    try {
      JSON.parse(value);
      setError(null);
      onSave(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : '유효하지 않은 JSON입니다.');
    }
  }

  function handleCancel() {
    setError(null);
    onCancel?.();
  }

  return (
    <div class="schema-editor">
      <textarea
        class="schema-editor-textarea"
        value={value}
        onInput={handleInput}
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
      />
      {error && (
        <div class="schema-editor-error" role="alert">
          {error}
        </div>
      )}
      <div class="schema-editor-actions">
        <button data-action="save" onClick={handleSave}>
          저장
        </button>
        <button data-action="cancel" onClick={handleCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
