/**
 * App — form-js Editor Host 앱 컴포넌트
 * TSK-06-01
 *
 * FormEditor 인스턴스를 useLayoutEffect로 생성하고
 * PaletteModule + OutlineModule을 additionalModules로 주입한다.
 */

import { h } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
// @ts-expect-error — form-js-editor has no bundled type declarations; skip lib check
import { FormEditor } from '@bpmn-io/form-js-editor';
import { PaletteModule } from './modules/PaletteModule';
import { OutlineModule } from './modules/OutlineModule';
import './app.css';

const DEFAULT_SCHEMA = {
  type: 'default',
  components: [],
};

export function App(): h.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<InstanceType<typeof FormEditor> | null>(null);

  useLayoutEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    // FormEditor 생성 — additionalModules에 PaletteModule + OutlineModule 주입
    let editor: InstanceType<typeof FormEditor> | null = null;

    // Use synchronous initialization for now; designer-components/designer-table
    // will be added when available (TSK-04-01, TSK-05-01 completed)
    try {
      const additionalModules: unknown[] = [PaletteModule, OutlineModule];

      editor = new FormEditor({
        container,
        additionalModules,
      });

      editorInstanceRef.current = editor;

      // 기본 스키마 임포트
      editor.importSchema(DEFAULT_SCHEMA).then(() => {
        // OutlineModule의 outlinePanel 서비스에 컨테이너 마운트
        const outlineContainer = outlineRef.current;
        if (outlineContainer && editor) {
          try {
            const outlinePanel = editor.get('outlinePanel', false);
            if (outlinePanel && typeof outlinePanel.mount === 'function') {
              outlinePanel.mount(outlineContainer);
            }
          } catch {
            // outlinePanel 서비스가 없는 경우 무시 (테스트 환경 등)
          }
        }
      }).catch((err: Error) => {
        console.error('[designer-editor-host] importSchema 실패:', err);
      });
    } catch (err) {
      console.error('[designer-editor-host] FormEditor 생성 실패:', err);
    }

    return () => {
      if (editor) {
        try {
          editor.destroy();
        } catch {
          // cleanup 오류 무시
        }
        editorInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div class="app-layout">
      <div class="outline-container" data-outline-container>
        <h3>아웃라인</h3>
        <div ref={outlineRef} data-testid="outline-root" />
      </div>
      <div class="editor-container" ref={editorRef} data-testid="editor-root" />
    </div>
  );
}
