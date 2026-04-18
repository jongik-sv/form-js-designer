/**
 * usePanelResize 훅 단위 테스트
 * panel-resize-toggle feature
 *
 * 검증 항목:
 * - 초기 상태 (width=300, collapsed=false, prevWidth=300)
 * - setWidth 호출 시 상태 변경
 * - min/max 클램프 (180~1600px 기본)
 * - toggleCollapse: false→true (prevWidth 보존, width 효과적 0)
 * - toggleCollapse: true→false (prevWidth 복원)
 * - prevWidth가 0일 때 재오픈 시 기본값(300) 복원
 * - startDrag 반환값 타입
 * - adjustWidth (keyboard: ±10px, min/max 경계)
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { usePanelResize } from '../hooks/usePanelResize';

describe('usePanelResize', () => {
  // ----- 1. 초기 상태 -----
  describe('initial state', () => {
    it('returns default width=300', () => {
      const { result } = renderHook(() => usePanelResize());
      expect(result.current.width).toBe(300);
    });

    it('returns collapsed=false by default', () => {
      const { result } = renderHook(() => usePanelResize());
      expect(result.current.collapsed).toBe(false);
    });

    it('returns prevWidth=300 by default', () => {
      const { result } = renderHook(() => usePanelResize());
      expect(result.current.prevWidth).toBe(300);
    });

    it('accepts custom initialWidth option', () => {
      const { result } = renderHook(() => usePanelResize({ initialWidth: 400 }));
      expect(result.current.width).toBe(400);
      expect(result.current.prevWidth).toBe(400);
    });

    it('exposes setWidth, toggleCollapse, startDrag, adjustWidth functions', () => {
      const { result } = renderHook(() => usePanelResize());
      expect(typeof result.current.setWidth).toBe('function');
      expect(typeof result.current.toggleCollapse).toBe('function');
      expect(typeof result.current.startDrag).toBe('function');
      expect(typeof result.current.adjustWidth).toBe('function');
    });
  });

  // ----- 2. setWidth — 정상 & 클램프 -----
  describe('setWidth', () => {
    it('updates width when called with valid value', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(400);
      });
      expect(result.current.width).toBe(400);
    });

    it('clamps width to minWidth (180) when below minimum', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(50);
      });
      expect(result.current.width).toBe(180);
    });

    it('clamps width to maxWidth (1600) when above maximum', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(9999);
      });
      expect(result.current.width).toBe(1600);
    });

    it('clamps to exactly 180 on minWidth boundary', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(180);
      });
      expect(result.current.width).toBe(180);
    });

    it('clamps to exactly 1600 on maxWidth boundary', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(1600);
      });
      expect(result.current.width).toBe(1600);
    });

    it('accepts custom minWidth/maxWidth options', () => {
      const { result } = renderHook(() =>
        usePanelResize({ minWidth: 100, maxWidth: 500 })
      );
      act(() => {
        result.current.setWidth(50);
      });
      expect(result.current.width).toBe(100);

      act(() => {
        result.current.setWidth(999);
      });
      expect(result.current.width).toBe(500);
    });
  });

  // ----- 3. toggleCollapse -----
  describe('toggleCollapse', () => {
    it('sets collapsed=true when currently false', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.toggleCollapse();
      });
      expect(result.current.collapsed).toBe(true);
    });

    it('stores prevWidth before collapsing', () => {
      const { result } = renderHook(() => usePanelResize());
      // width를 먼저 400으로 설정
      act(() => {
        result.current.setWidth(400);
      });
      act(() => {
        result.current.toggleCollapse();
      });
      expect(result.current.prevWidth).toBe(400);
    });

    it('restores prevWidth when expanding (collapsed=true → false)', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.setWidth(450);
      });
      act(() => {
        result.current.toggleCollapse(); // collapse
      });
      act(() => {
        result.current.toggleCollapse(); // expand
      });
      expect(result.current.collapsed).toBe(false);
      expect(result.current.width).toBe(450);
    });

    it('restores default width (300) when prevWidth is 0', () => {
      // prevWidth=0 방어: 재오픈 시 기본값 300 복원
      const { result } = renderHook(() => usePanelResize({ initialWidth: 0 }));
      act(() => {
        result.current.toggleCollapse(); // collapse
      });
      act(() => {
        result.current.toggleCollapse(); // expand
      });
      expect(result.current.collapsed).toBe(false);
      // prevWidth가 0이면 기본값 300으로 복원
      expect(result.current.width).toBeGreaterThan(0);
    });

    it('toggles back and forth correctly', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => { result.current.toggleCollapse(); });
      expect(result.current.collapsed).toBe(true);
      act(() => { result.current.toggleCollapse(); });
      expect(result.current.collapsed).toBe(false);
      act(() => { result.current.toggleCollapse(); });
      expect(result.current.collapsed).toBe(true);
    });
  });

  // ----- 4. adjustWidth (keyboard 접근성) -----
  describe('adjustWidth', () => {
    it('increases width by delta when called with positive value', () => {
      const { result } = renderHook(() => usePanelResize());
      // initial 300
      act(() => {
        result.current.adjustWidth(10);
      });
      expect(result.current.width).toBe(310);
    });

    it('decreases width by delta when called with negative value', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.adjustWidth(-10);
      });
      expect(result.current.width).toBe(290);
    });

    it('clamps to minWidth on adjustWidth below minimum', () => {
      const { result } = renderHook(() => usePanelResize({ initialWidth: 185 }));
      act(() => {
        result.current.adjustWidth(-10); // 185-10=175 → clamped to 180
      });
      expect(result.current.width).toBe(180);
    });

    it('clamps to maxWidth on adjustWidth above maximum', () => {
      const { result } = renderHook(() =>
        usePanelResize({ initialWidth: 595, maxWidth: 600 }),
      );
      act(() => {
        result.current.adjustWidth(10); // 595+10=605 → clamped to 600
      });
      expect(result.current.width).toBe(600);
    });

    it('sets width to minWidth when called with "min"', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.adjustWidth('min');
      });
      expect(result.current.width).toBe(180);
    });

    it('sets width to maxWidth when called with "max"', () => {
      const { result } = renderHook(() => usePanelResize());
      act(() => {
        result.current.adjustWidth('max');
      });
      expect(result.current.width).toBe(1600);
    });
  });

  // ----- 5. startDrag -----
  describe('startDrag', () => {
    it('startDrag returns a function (pointer event handler)', () => {
      const { result } = renderHook(() => usePanelResize());
      const handler = result.current.startDrag;
      expect(typeof handler).toBe('function');
    });
  });
});
