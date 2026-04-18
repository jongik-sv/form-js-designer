/**
 * LivePreviewPanel — TSK-06-02
 *
 * LivePreviewService의 mountRef를 부여하는 래퍼 컴포넌트.
 * #live-preview-root div에 LivePreviewService.mount()를 연결한다.
 */

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface LivePreviewPanelProps {
  livePreviewService: {
    mount(target: HTMLElement): void;
    destroy(): void;
  } | null;
}

export function LivePreviewPanel({ livePreviewService }: LivePreviewPanelProps): h.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !livePreviewService) return;

    livePreviewService.mount(container);

    return () => {
      livePreviewService.destroy();
    };
  }, [livePreviewService]);

  return (
    <div class="live-preview-panel" data-testid="live-preview">
      <div class="live-preview-panel__header">
        <h4>라이브 프리뷰</h4>
      </div>
      <div
        id="live-preview-root"
        ref={containerRef}
        class="live-preview-panel__content"
        data-testid="live-preview-root"
      />
    </div>
  );
}
