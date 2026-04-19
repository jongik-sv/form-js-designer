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
 *
 * 내부적으로 useElementResize({ axis: 'x', ... })에 위임한다.
 * toggleCollapse / prevWidth 상태는 패널 전용 UX이므로 여기서 직접 관리한다.
 */

import { useState, useCallback, useRef } from 'preact/hooks';
import { useElementResize } from './useElementResize';

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

export function usePanelResize(options: UsePanelResizeOptions = {}): UsePanelResizeReturn {
  const {
    initialWidth = DEFAULT_WIDTH,
    minWidth = DEFAULT_MIN,
    maxWidth = DEFAULT_MAX,
  } = options;

  // initialWidth=0 시 collapsed 시나리오: prevWidth=0으로 시작
  const effectiveInitial = initialWidth > 0 ? initialWidth : DEFAULT_WIDTH;

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [prevWidth, setPrevWidth] = useState<number>(initialWidth);

  // useElementResize에 위임: axis='x'
  const { value: width, setValue: setWidth, adjust: adjustWidth, startDrag } = useElementResize({
    axis: 'x',
    initial: effectiveInitial,
    min: minWidth,
    max: maxWidth,
  });

  // 최신 width/prevWidth/collapsed를 ref로 추적 (toggleCollapse 클로저 캡처 문제 방지)
  const widthRef = useRef(width);
  widthRef.current = width;
  const prevWidthRef = useRef(prevWidth);
  prevWidthRef.current = prevWidth;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  const toggleCollapse = useCallback(() => {
    if (!collapsedRef.current) {
      // 접기: 현재 width를 prevWidth로 저장
      setPrevWidth(widthRef.current);
      setCollapsed(true);
    } else {
      // 펼치기: prevWidth 복원 (0이면 기본값 DEFAULT_WIDTH 사용)
      const restoreWidth = prevWidthRef.current > 0 ? prevWidthRef.current : DEFAULT_WIDTH;
      setWidth(restoreWidth);
      setCollapsed(false);
    }
  }, [setWidth]); // setWidth는 안정적 ref이므로 의존성에 포함

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
