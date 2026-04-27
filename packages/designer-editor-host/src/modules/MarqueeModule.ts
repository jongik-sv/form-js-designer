/**
 * MarqueeModule.ts — TSK-11-03 마퀴(rubber-band) 선택
 *
 * form-js additionalModules 규약으로 등록하는 DI 모듈.
 * MarqueeService가 .fjs-editor-container에 오버레이를 마운트하고
 * mousedown → mousemove → mouseup 시퀀스로 마퀴 선택을 구현한다.
 *
 * DI 주입: eventBus, formFieldRegistry, outlinePanel
 */

import {
  normalizeDragRect,
  filterIntersecting,
  collectFieldEntries,
} from './marqueeUtils';

/** DISABLED_INSIDE_TYPES — tabs 타입은 내부 자식 선택 비활성화 */
const DISABLED_INSIDE_TYPES = new Set(['tabs']);

/** 드래그 시작 임계값 (px) — 이 거리 미만의 이동은 click으로 취급 */
const DRAG_THRESHOLD = 4;

/** outlinePanel 공개 인터페이스 (setSelectedIds 포함) */
interface OutlinePanelLike {
  setSelectedIds(ids: string[], opts?: { additive?: boolean }): void;
  getSelectedIds?(): string[];
}

/** formFieldRegistry 인터페이스 */
interface FormFieldRegistryLike {
  get(id: string): { type?: string } | undefined | null;
}

/** eventBus 인터페이스 */
interface EventBusLike {
  on(event: string, cb: () => void): void;
  off(event: string, cb: () => void): void;
}

class MarqueeService {
  static $inject = ['eventBus', 'formFieldRegistry', 'outlinePanel'];

  private _eventBus: EventBusLike;
  private _formFieldRegistry: FormFieldRegistryLike;
  private _outlinePanel: OutlinePanelLike;

  /** .fjs-editor-container DOM */
  private _canvas: HTMLElement | null = null;
  /** .marquee-layer DOM */
  private _layer: HTMLElement | null = null;
  /** .marquee-box DOM */
  private _box: HTMLElement | null = null;

  /** 드래그 시작 좌표 및 shift 상태 */
  private _dragStart: { x: number; y: number; shift: boolean } | null = null;
  /** threshold 초과 여부 */
  private _dragging = false;

  private _boundOnImportDone: () => void;
  private _boundOnMouseDown: (e: MouseEvent) => void;
  private _boundOnMouseMove: (e: MouseEvent) => void;
  private _boundOnMouseUp: (e: MouseEvent) => void;

  constructor(
    eventBus: EventBusLike,
    formFieldRegistry: FormFieldRegistryLike,
    outlinePanel: OutlinePanelLike,
  ) {
    this._eventBus = eventBus;
    this._formFieldRegistry = formFieldRegistry;
    this._outlinePanel = outlinePanel;

    this._boundOnImportDone = () => this._onImportDone();
    this._boundOnMouseDown = (e: MouseEvent) => this._onMouseDown(e);
    this._boundOnMouseMove = (e: MouseEvent) => this._onMouseMove(e);
    this._boundOnMouseUp = (e: MouseEvent) => this._onMouseUp(e);

    eventBus.on('import.done', this._boundOnImportDone);
  }

  private _onImportDone() {
    if (typeof document === 'undefined') return;

    // 기존 오버레이 제거 (reimport 시 중복 방지)
    if (this._layer && this._layer.parentElement) {
      this._layer.parentElement.removeChild(this._layer);
    }

    const canvas = document.querySelector('.fjs-editor-container') as HTMLElement | null;
    if (!canvas) return;

    this._canvas = canvas;

    // 오버레이 마운트
    const layer = document.createElement('div');
    layer.className = 'marquee-layer';

    const box = document.createElement('div');
    box.className = 'marquee-box';
    layer.appendChild(box);
    canvas.appendChild(layer);

    this._layer = layer;
    this._box = box;

    // capture-phase mousedown — canvas 내 모든 이벤트를 먼저 처리
    canvas.addEventListener('mousedown', this._boundOnMouseDown, true);
  }

  private _onMouseDown(e: MouseEvent) {
    // 좌클릭만
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // [data-id] 필드 위, context-pad, drag handle, outline panel 위에서 시작 시 무시
    if (
      target.closest('[data-id]') ||
      target.closest('.fjs-context-pad') ||
      target.closest('.fjs-drag-handle') ||
      target.closest('.outline-panel') ||
      target.closest('[data-outline-container]')
    ) {
      return;
    }

    // 빈 영역 → 마퀴 시작
    this._dragStart = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
    this._dragging = false;

    document.addEventListener('mousemove', this._boundOnMouseMove);
    document.addEventListener('mouseup', this._boundOnMouseUp);
  }

  private _onMouseMove(e: MouseEvent) {
    if (!this._dragStart) return;

    const dx = e.clientX - this._dragStart.x;
    const dy = e.clientY - this._dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DRAG_THRESHOLD) return;

    // threshold 초과 → 드래그 시작
    if (!this._dragging) {
      this._dragging = true;
      if (this._box) this._box.style.display = 'block';
    }

    if (!this._box || !this._canvas) return;

    const containerRect = this._canvas.getBoundingClientRect();
    const rect = normalizeDragRect(
      { x: this._dragStart.x - containerRect.left, y: this._dragStart.y - containerRect.top },
      { x: e.clientX - containerRect.left, y: e.clientY - containerRect.top },
    );

    this._box.style.left = `${rect.left}px`;
    this._box.style.top = `${rect.top}px`;
    this._box.style.width = `${rect.width}px`;
    this._box.style.height = `${rect.height}px`;
  }

  private _onMouseUp(e: MouseEvent) {
    document.removeEventListener('mousemove', this._boundOnMouseMove);
    document.removeEventListener('mouseup', this._boundOnMouseUp);

    if (!this._dragStart) return;

    const shift = this._dragStart.shift;
    const startX = this._dragStart.x;
    const startY = this._dragStart.y;

    this._dragStart = null;

    // 박스 숨기기
    if (this._box) this._box.style.display = 'none';

    // threshold 미달 — 선택 변경 없음
    if (!this._dragging) {
      this._dragging = false;
      return;
    }

    this._dragging = false;

    // marqueeRect (viewport 좌표)
    const marqueeRect = normalizeDragRect(
      { x: startX, y: startY },
      { x: e.clientX, y: e.clientY },
    );

    // 필드 수집
    if (!this._canvas) return;

    const entries = collectFieldEntries(this._canvas, (id) => {
      const field = this._formFieldRegistry.get(id);
      return field?.type;
    });

    const ids = filterIntersecting(entries, marqueeRect, DISABLED_INSIDE_TYPES);

    this._outlinePanel.setSelectedIds(ids, { additive: shift });
  }

  destroy() {
    this._eventBus.off('import.done', this._boundOnImportDone);

    if (this._canvas) {
      this._canvas.removeEventListener('mousedown', this._boundOnMouseDown, true);
    }

    document.removeEventListener('mousemove', this._boundOnMouseMove);
    document.removeEventListener('mouseup', this._boundOnMouseUp);

    if (this._layer && this._layer.parentElement) {
      this._layer.parentElement.removeChild(this._layer);
    }

    this._canvas = null;
    this._layer = null;
    this._box = null;
    this._dragStart = null;
    this._dragging = false;
  }
}

export const MarqueeModule = {
  __init__: ['marquee'],
  marquee: ['type', MarqueeService as unknown as new (...args: unknown[]) => unknown],
};
