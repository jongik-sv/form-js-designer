/**
 * preview.ts
 *
 * Webview preview 스크립트 스텁
 *
 * dist/webview/preview.js로 번들되는 브라우저 컨텍스트 진입점.
 * VSCode Markdown preview 내에서 실행된다.
 *
 * activationEvents의 `onLanguage:markdown` + contributes.markdown.previewScripts에 의해
 * Markdown preview 패널이 열릴 때 주입된다.
 *
 * preact를 번들에 포함시켜 단일 인스턴스 게이트와 번들 크기 검증 대비.
 */

import { render, h } from 'preact';

// TODO(TSK-00-03): Render form-js viewer for ```formjs fenced blocks

/** Augmented global window for preview script lifecycle tracking. */
interface PreviewWindow extends Window {
  __formJsPreviewLoaded?: boolean;
}

/**
 * Stub: renders an empty placeholder until TSK-00-03 implements the viewer.
 * This ensures preact is bundled into dist/webview/preview.js.
 */
function initPreview(): void {
  const container = document.getElementById('form-js-preview-root');
  if (container) {
    // Placeholder render — will be replaced with form-js viewer in TSK-00-03
    render(h('div', { id: 'form-js-preview-placeholder' }), container);
  }
  (window as PreviewWindow).__formJsPreviewLoaded = true;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreview);
  } else {
    initPreview();
  }
}
