/**
 * usePanelResize — 패널 너비 · 접힘 상태 관리 커스텀 훅
 * panel-resize-toggle feature
 *
 * 반환값:
 *   width        — 현재 패널 너비 (px)
 *   collapsed    — 패널 접힘 여부
 *   prevWidth    — 접기 직전 너비 (재오픈 복원용)
 *   setWidth     — 너비 직접 설정 (min/max 클램프 적용)
 *   toggleCollapse — 접기/펼치기 토글
 *   startDrag    — pointerdown 핸들러 (PanelSplitter에 전달)
 *   adjustWidth  — 키보드 접근성용: delta(number) | 'min' | 'max'
 */

import { useState, useCallback, useRef } from 'preact/hooks';

export interface UsePanelResizeOptions {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface UsePanelResizeReturn {
  width: number;
  collapsed: boolean;
  prevWidth: number;
  setWidth: (w: number) => void;
  toggleCollapse: () => void;
  startDrag: (e: PointerEvent) => void;
  adjustWidth: (delta: number | 'min' | 'max') => void;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_MIN = 180;
const DEFAULT_MAX = 1600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function usePanelResize(options: UsePanelResizeOptions = {}): UsePanelResizeReturn {
  const {
    initialWidth = DEFAULT_WIDTH,
    minWidth = DEFAULT_MIN,
    maxWidth = DEFAULT_MAX,
  } = options;

  // initialWidth=0 시 collapsed 시나리오: prevWidth=0으로 시작
  const effectiveInitial = initialWidth > 0
    ? clamp(initialWidth, minWidth, maxWidth)
    : DEFAULT_WIDTH;

  const initialPrevWidth = initialWidth;  // 0이면 0으로 유지 (방어 로직 테스트용)

  const [width, setWidthState] = useState<number>(effectiveInitial);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [prevWidth, setPrevWidth] = useState<number>(initialPrevWidth);

  // 최신 width/prevWidth를 ref로도 추적 (toggleCollapse 클로저 캡처 문제 방지)
  const widthRef = useRef(width);
  widthRef.current = width;
  const prevWidthRef = useRef(prevWidth);
  prevWidthRef.current = prevWidth;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  const setWidth = useCallback(
    (w: number) => {
      const clamped = clamp(w, minWidth, maxWidth);
      setWidthState(clamped);
    },
    [minWidth, maxWidth],
  );

  const toggleCollapse = useCallback(() => {
    const currentCollapsed = collapsedRef.current;
    if (!currentCollapsed) {
      // 접기: 현재 width를 prevWidth로 저장
      setPrevWidth(widthRef.current);
      setCollapsed(true);
    } else {
      // 펼치기: prevWidth 복원 (0이면 기본값 DEFAULT_WIDTH 사용)
      const restoreWidth = prevWidthRef.current > 0 ? prevWidthRef.current : DEFAULT_WIDTH;
      setWidthState(restoreWidth);
      setCollapsed(false);
    }
  }, []); // 의존성 없음 — ref 통해 최신 값 참조

  const adjustWidth = useCallback(
    (delta: number | 'min' | 'max') => {
      if (delta === 'min') {
        setWidthState(minWidth);
      } else if (delta === 'max') {
        setWidthState(maxWidth);
      } else {
        setWidthState((w) => clamp(w + delta, minWidth, maxWidth));
      }
    },
    [minWidth, maxWidth],
  );

  const startDrag = useCallback(
    (e: PointerEvent) => {
      const target = e.currentTarget as HTMLElement | null;
      if (!target) return;

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startWidth = widthRef.current;

      // pointer capture: 드래그 중 요소 외부로 마우스가 나가도 이벤트 수신
      try {
        target.setPointerCapture(pointerId);
      } catch { /* 일부 환경에서 capture 실패 시 window 리스너로 폴백 */ }

      // body cursor/user-select 오버라이드
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.removeEventListener('pointermove', onMove as EventListener);
        window.removeEventListener('pointerup', onEnd as EventListener);
        window.removeEventListener('pointercancel', onEnd as EventListener);
        target.removeEventListener('lostpointercapture', onEnd as EventListener);
        try { target.releasePointerCapture(pointerId); } catch { /* 이미 해제된 경우 무시 */ }
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
      };

      const onMove = (moveEvent: PointerEvent) => {
        // side-panel은 오른쪽: 왼쪽 드래그(clientX 감소) = 패널 너비 증가
        const delta = startX - moveEvent.clientX;
        setWidthState(clamp(startWidth + delta, minWidth, maxWidth));
      };

      const onEnd = () => cleanup();

      // 모든 종료 경로에서 cursor 복원 — pointerup / pointercancel / lostpointercapture
      window.addEventListener('pointermove', onMove as EventListener);
      window.addEventListener('pointerup', onEnd as EventListener);
      window.addEventListener('pointercancel', onEnd as EventListener);
      target.addEventListener('lostpointercapture', onEnd as EventListener);
    },
    [minWidth, maxWidth],
  );

  return {
    width,
    collapsed,
    prevWidth,
    setWidth,
    toggleCollapse,
    startDrag,
    adjustWidth,
  };
}
