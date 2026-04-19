/**
 * EditorHost — TSK-03-03
 *
 * ViewerHost + OverlayLayer 합성.
 * DOM 구조: <div id="fjs-designer-shell">
 *              <div id="form-root" />   ← ViewerHost 마운트
 *              <div id="overlay-root" /> ← OverlayLayer 마운트
 *           </div>
 *
 * ADR-0001 §3 D1/D3/D5 준수:
 * - D1: ViewerHost가 form-js 단일 파이프라인 사용
 * - D3: assertSharedOrigin이 shell을 overlayContainer로 검증
 * - D5: useViewportWidth 훅으로 Viewport parity 제공
 */

import { h, render } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { ViewerHost } from './ViewerHost';
import { OverlayLayer } from '../overlay/OverlayLayer';
import type { EditorHostProps } from './hostTypes';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EditorHost({
  schema,
  data,
  locale,
  viewport,
  additionalModules,
  onChange,
  onImport,
  onError,
  containerRef,
  selectedIds,
  onSelect,
  renderContextSlots: _renderContextSlots,
}: EditorHostProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const formRootRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Mount: ViewerHost + OverlayLayer nested render (최초 1회)
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    const formRootEl = formRootRef.current;
    const overlayRootEl = overlayRootRef.current;
    const shellEl = shellRef.current;

    if (!formRootEl || !overlayRootEl || !shellEl) return;

    // ViewerHost를 #form-root에 마운트
    render(
      <ViewerHost
        schema={schema}
        data={data}
        locale={locale}
        viewport={viewport}
        additionalModules={additionalModules}
        onChange={onChange}
        onImport={onImport}
        onError={onError}
      />,
      formRootEl,
    );

    // OverlayLayer를 #overlay-root에 마운트
    // overlayContainer={shellRef.current}으로 dev 빌드 assertSharedOrigin 활성화
    render(
      <OverlayLayer
        formRoot={formRootEl}
        selectedIds={selectedIds}
        overlayContainer={shellEl}
      />,
      overlayRootEl,
    );

    return () => {
      // cleanup: 두 서브트리 언마운트
      render(null, formRootEl);
      render(null, overlayRootEl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Update: ViewerHost (schema/data/locale/viewport 변경)
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    const formRootEl = formRootRef.current;
    if (!formRootEl) return;

    render(
      <ViewerHost
        schema={schema}
        data={data}
        locale={locale}
        viewport={viewport}
        additionalModules={additionalModules}
        onChange={onChange}
        onImport={onImport}
        onError={onError}
      />,
      formRootEl,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, data, locale, viewport, onChange]);

  // -------------------------------------------------------------------------
  // Update: OverlayLayer (selectedIds 변경)
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    const overlayRootEl = overlayRootRef.current;
    const formRootEl = formRootRef.current;
    const shellEl = shellRef.current;

    if (!overlayRootEl || !formRootEl || !shellEl) return;

    render(
      <OverlayLayer
        formRoot={formRootEl}
        selectedIds={selectedIds}
        overlayContainer={shellEl}
      />,
      overlayRootEl,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // -------------------------------------------------------------------------
  // Click 이벤트 위임 (onSelect)
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    const shellEl = shellRef.current;
    if (!shellEl || !onSelect) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const field = target.closest('[data-fjs-id]');
      if (field) {
        const id = field.getAttribute('data-fjs-id');
        if (id) {
          const me = e as MouseEvent;
          const additive = !!(me.shiftKey || me.metaKey || me.ctrlKey);
          onSelect(id, additive ? { additive: true } : undefined);
        }
      }
    };

    shellEl.addEventListener('click', handleClick);

    return () => {
      shellEl.removeEventListener('click', handleClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect]);

  // -------------------------------------------------------------------------
  // Render — shell 구조만 JSX로 제공, 내용은 useLayoutEffect에서 render()
  // -------------------------------------------------------------------------
  return (
    <div id="fjs-designer-shell" ref={shellRef}>
      <div id="form-root" ref={formRootRef} />
      <div id="overlay-root" ref={overlayRootRef} />
    </div>
  );
}
