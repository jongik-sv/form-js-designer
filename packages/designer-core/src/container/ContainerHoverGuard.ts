/**
 * ContainerHoverGuard — 커스텀 컨테이너(card/modal/tabs/tabPanel)의
 * sibling(좌우/상하 형제) 드롭 위치 전환을 드래그 시작 후 2초간 지연시키는 모듈.
 *
 * 문제: form-js dragula는 cursor가 컨테이너 가장자리(좌/우/상/하) 근처에 가면
 * 즉시 "형제 row/column 생성" placeholder를 활성화하여 안쪽(inside) 드롭을 방해한다.
 *
 * 해결:
 * (1) 좌/우 sibling: 컨테이너 wrapper + 부모 row에 CSS 클래스
 *     `designer-container-hover-guard`를 부여해 pointer-events를 차단.
 *     내부 drop zone(`.fjs-drop-container-vertical` 등)만 pointer-events: auto.
 * (2) 상/하 sibling: wrapper 상/하 gap 영역에 DOM overlay 두 개를 삽입.
 *     overlay는 wrapper 내부 `.fjs-drop-container-vertical` 의 자손으로 붙여,
 *     dragula가 elementFromPoint 로 overlay를 잡으면 DOM 조상 체인에서
 *     내부 drop zone을 먼저 만나 "안쪽 드롭"으로 해석된다.
 *
 * 2초 경과 또는 drag.end 시 가드를 해제한다.
 */

interface EventBus {
  on: (event: string, handler: (e: unknown) => void) => void;
}

interface FormFieldRegistry {
  get: (id: string) => { id: string; type: string } | undefined;
}

const CUSTOM_CONTAINER_TYPES = new Set<string>([
  'card',
  'modal',
  'tabs',
  'tabPanel',
]);

const HOVER_GUARD_CLASS = 'designer-container-hover-guard';
const HOVER_GUARD_OVERLAY_CLASS = 'designer-container-hover-guard-overlay';
const HOVER_GUARD_DELAY_MS = 2000;
const GAP_OVERLAY_HEIGHT_PX = 14;

export class ContainerHoverGuard {
  private readonly _formFieldRegistry: FormFieldRegistry;
  private _timerId: number | null = null;
  private _guardedElements = new Set<HTMLElement>();
  private _overlays: HTMLElement[] = [];

  constructor(eventBus: EventBus, formFieldRegistry: FormFieldRegistry) {
    this._formFieldRegistry = formFieldRegistry;

    eventBus.on('drag.start', () => this._onDragStart());
    eventBus.on('drag.end', () => this._cleanup());
    eventBus.on('dragula.destroyed', () => this._cleanup());
  }

  private _onDragStart(): void {
    this._cleanup();

    const candidates = document.querySelectorAll('.fjs-editor-container [data-id]');

    candidates.forEach((el) => {
      const id = el.getAttribute('data-id');
      if (!id) return;

      // 내부 children slot(fjs-drop-container-vertical / fjs-children)은 guard 대상 아님
      // — 이 slot이 바로 "안쪽 드롭" 타겟이므로 pointer-events를 유지해야 한다.
      if (
        el.classList.contains('fjs-drop-container-vertical') ||
        el.classList.contains('fjs-children')
      ) {
        return;
      }

      const field = this._formFieldRegistry.get(id);
      if (!field || !CUSTOM_CONTAINER_TYPES.has(field.type)) return;

      const wrapper = el as HTMLElement;

      // 컨테이너를 감싸는 parent row = 좌우 sibling drop 대상
      const row = wrapper.closest('.fjs-layout-row') as HTMLElement | null;
      if (row && !this._guardedElements.has(row)) {
        row.classList.add(HOVER_GUARD_CLASS);
        this._guardedElements.add(row);
      }

      // 컨테이너 wrapper(.fjs-element / .fjs-drag-container)도 drop target이므로
      // 가장자리 hit-test가 잡지 못하게 같이 guard.
      if (!this._guardedElements.has(wrapper)) {
        wrapper.classList.add(HOVER_GUARD_CLASS);
        this._guardedElements.add(wrapper);
      }

      // 상/하 gap을 흡수하는 overlay를 내부 drop zone 자손으로 삽입.
      this._attachGapOverlays(wrapper);
    });

    if (this._guardedElements.size === 0 && this._overlays.length === 0) return;

    this._timerId = window.setTimeout(() => {
      this._releaseGuard();
    }, HOVER_GUARD_DELAY_MS);
  }

  private _attachGapOverlays(wrapper: HTMLElement): void {
    // wrapper 내부의 첫 dragula drop container (inner children slot)
    const innerDropZone = wrapper.querySelector(
      '.fjs-drop-container-vertical, .fjs-children, .fjs-vertical-layout',
    ) as HTMLElement | null;
    if (!innerDropZone) return;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const topOverlay = this._createOverlay(
      rect.left,
      rect.top - GAP_OVERLAY_HEIGHT_PX,
      rect.width,
      GAP_OVERLAY_HEIGHT_PX,
    );
    const bottomOverlay = this._createOverlay(
      rect.left,
      rect.bottom,
      rect.width,
      GAP_OVERLAY_HEIGHT_PX,
    );

    innerDropZone.appendChild(topOverlay);
    innerDropZone.appendChild(bottomOverlay);

    this._overlays.push(topOverlay, bottomOverlay);
  }

  private _createOverlay(
    left: number,
    top: number,
    width: number,
    height: number,
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = HOVER_GUARD_OVERLAY_CLASS;
    overlay.style.position = 'fixed';
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.style.pointerEvents = 'auto';
    overlay.style.zIndex = '9999';
    overlay.style.background = 'transparent';
    return overlay;
  }

  private _releaseGuard(): void {
    this._guardedElements.forEach((el) => {
      el.classList.remove(HOVER_GUARD_CLASS);
    });
    this._guardedElements.clear();
    this._overlays.forEach((o) => o.remove());
    this._overlays = [];
    this._timerId = null;
  }

  private _cleanup(): void {
    if (this._timerId !== null) {
      window.clearTimeout(this._timerId);
      this._timerId = null;
    }
    this._releaseGuard();
  }
}

(ContainerHoverGuard as unknown as { $inject: string[] }).$inject = [
  'eventBus',
  'formFieldRegistry',
];
