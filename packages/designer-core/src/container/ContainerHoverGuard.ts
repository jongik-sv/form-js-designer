/**
 * ContainerHoverGuard — 커스텀 컨테이너(card/stack/modal/tabs/tabPanel)의
 * sibling(좌우/상하 형제) 드롭 위치 전환을 드래그 시작 후 1초간 지연시키는 모듈.
 *
 * 문제: form-js dragula는 cursor가 컨테이너 가장자리 근처에 가면 즉시 "형제
 * 컬럼 생성" placeholder를 활성화하여 안쪽(inside) 드롭을 방해한다.
 *
 * 해결: drag.start 시 커스텀 컨테이너를 감싸는 row에 CSS 클래스
 * `designer-container-hover-guard`를 부여해 1초 동안 pointer-events를 차단.
 * 내부 drop zone(`.fjs-drop-container-vertical` 등)만 pointer-events: auto로
 * 복원되어, 1초간은 안쪽 드롭만 허용된다. 1초 경과 후 클래스 제거 → 정상 동작.
 *
 * drag.end에서 즉시 해제.
 */

interface EventBus {
  on: (event: string, handler: (e: unknown) => void) => void;
}

interface FormFieldRegistry {
  get: (id: string) => { id: string; type: string } | undefined;
}

const CUSTOM_CONTAINER_TYPES = new Set<string>([
  'card',
  'stack',
  'modal',
  'tabs',
  'tabPanel',
]);

const HOVER_GUARD_CLASS = 'designer-container-hover-guard';
const HOVER_GUARD_DELAY_MS = 2000;

export class ContainerHoverGuard {
  private readonly _formFieldRegistry: FormFieldRegistry;
  private _timerId: number | null = null;
  private _guardedElements = new Set<HTMLElement>();

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

      // 컨테이너를 감싸는 parent row = 좌우 sibling drop 대상
      const row = el.closest('.fjs-layout-row') as HTMLElement | null;
      if (row && !this._guardedElements.has(row)) {
        row.classList.add(HOVER_GUARD_CLASS);
        this._guardedElements.add(row);
      }

      // 컨테이너 wrapper(.fjs-element / .fjs-drag-container)도 drop target이므로
      // 가장자리 hit-test가 잡지 못하게 같이 guard.
      const wrapper = el as HTMLElement;
      if (!this._guardedElements.has(wrapper)) {
        wrapper.classList.add(HOVER_GUARD_CLASS);
        this._guardedElements.add(wrapper);
      }
    });

    if (this._guardedElements.size === 0) return;

    this._timerId = window.setTimeout(() => {
      this._releaseGuard();
    }, HOVER_GUARD_DELAY_MS);
  }

  private _releaseGuard(): void {
    this._guardedElements.forEach((el) => {
      el.classList.remove(HOVER_GUARD_CLASS);
    });
    this._guardedElements.clear();
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
