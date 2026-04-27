/**
 * PanelResizeModule — 좌측 left-rail / 우측 properties 패널 폭 리사이즈.
 *
 * 동작:
 * - #left-rail 우측 가장자리, .fjs-properties-container 좌측 가장자리에 4px split-handle을 삽입한다.
 * - pointerdown → pointermove로 드래그하여 너비를 갱신, pointerup에서 vscode webview state에 저장한다.
 * - 너비는 :root에 --left-rail-width / --properties-panel-width 변수로 노출되며,
 *   form-js editor base CSS의 .fjs-properties-container { width: var(--properties-panel-width) }와
 *   form-js-editor-host.css의 .left-rail { width: var(--left-rail-width) }에서 사용된다.
 * - #app min-width(좌측 + 1280 + 우측 + 8px handle)는 CSS calc()로 자동 재계산되므로 inline 보정 없이 동작.
 */
const LEFT_MIN = 200;
const LEFT_MAX = 480;
const RIGHT_MIN = 240;
const RIGHT_MAX = 640;
const STATE_KEY = 'panelWidths';

interface PanelWidths {
  leftRailWidth: number;
  propertiesWidth: number;
}

interface VsCodeApiLike {
  getState(): unknown;
  setState(state: unknown): void;
}

let mounted = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readSavedWidths(api: VsCodeApiLike | null): Partial<PanelWidths> {
  if (!api) return {};
  try {
    const state = api.getState() as Record<string, unknown> | null;
    const saved = state?.[STATE_KEY] as Partial<PanelWidths> | undefined;
    return saved ?? {};
  } catch {
    return {};
  }
}

function writeSavedWidths(api: VsCodeApiLike | null, widths: PanelWidths): void {
  if (!api) return;
  try {
    const state = (api.getState() as Record<string, unknown> | null) ?? {};
    api.setState({ ...state, [STATE_KEY]: widths });
  } catch {
    /* state 저장 실패는 무시 */
  }
}

function applyLeftRailWidth(width: number): void {
  document.documentElement.style.setProperty('--left-rail-width', `${width}px`);
}

/**
 * properties 패널 폭을 적용한다.
 * form-js-editor-base.css가 `.fjs-properties-container { --properties-panel-width: 300px }`로
 * 자기 자신에게 변수를 재정의하므로 :root에 거는 것만으로는 무시된다.
 * → 컨테이너 element에 직접 inline 변수를 박아야 한다.
 * #app min-width 계산용으로 :root에도 함께 갱신.
 */
function applyPropertiesWidth(width: number): void {
  document.documentElement.style.setProperty('--properties-panel-width', `${width}px`);
  const propsContainer = document.querySelector('.fjs-properties-container') as HTMLElement | null;
  if (propsContainer) {
    propsContainer.style.setProperty('--properties-panel-width', `${width}px`);
  }
}

interface DragContext {
  startX: number;
  startWidth: number;
  edge: 'left' | 'right';
}

/**
 * pointer drag로 width를 갱신한다.
 * @param edge 'left' = #left-rail 우측 핸들 (drag 우측이면 width 증가)
 *             'right' = .fjs-properties-container 좌측 핸들 (drag 좌측이면 width 증가)
 */
function startDrag(
  handle: HTMLElement,
  edge: 'left' | 'right',
  initialWidth: number,
  onCommit: (width: number) => void,
  onMove: (width: number) => void,
): (e: PointerEvent) => void {
  let ctx: DragContext | null = null;

  const onPointerMove = (ev: PointerEvent): void => {
    if (!ctx) return;
    const dx = ev.clientX - ctx.startX;
    const raw = ctx.edge === 'left' ? ctx.startWidth + dx : ctx.startWidth - dx;
    const min = ctx.edge === 'left' ? LEFT_MIN : RIGHT_MIN;
    const max = ctx.edge === 'left' ? LEFT_MAX : RIGHT_MAX;
    const next = clamp(raw, min, max);
    onMove(next);
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (!ctx) return;
    const dx = ev.clientX - ctx.startX;
    const raw = ctx.edge === 'left' ? ctx.startWidth + dx : ctx.startWidth - dx;
    const min = ctx.edge === 'left' ? LEFT_MIN : RIGHT_MIN;
    const max = ctx.edge === 'left' ? LEFT_MAX : RIGHT_MAX;
    const final = clamp(raw, min, max);
    ctx = null;
    handle.removeAttribute('data-resizing');
    document.body.removeAttribute('data-panel-resizing');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    onCommit(final);
  };

  return (ev: PointerEvent): void => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    ctx = { startX: ev.clientX, startWidth: initialWidth, edge };
    handle.setAttribute('data-resizing', 'true');
    document.body.setAttribute('data-panel-resizing', 'true');
    // pointer capture로 drag 도중 cursor가 다른 element 위에 있어도 events가 handle로 라우팅된다.
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch {
      /* setPointerCapture 미지원 환경 무시 */
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    // eslint-disable-next-line no-console
    console.log('[PanelResize] drag start', { edge, startX: ev.clientX, initialWidth });
  };
}

function makeHandle(
  edge: 'left' | 'right',
  ariaLabel: string,
): HTMLDivElement {
  const handle = document.createElement('div');
  handle.className = 'panel-resize-handle';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', ariaLabel);
  handle.setAttribute('data-edge', edge);
  handle.setAttribute('data-testid', `panel-resize-${edge}`);
  return handle;
}

function getCurrentWidth(prop: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 좌측 rail / 우측 properties 패널 가장자리에 split-handle을 삽입한다.
 * 한 번만 호출 — 재호출은 무시된다 (form-js editor 재마운트 시 properties 컨테이너가 새로 생성되므로
 * 우측 핸들은 매번 재삽입한다).
 */
export function mountPanelResize(api: VsCodeApiLike | null): void {
  // 우측 핸들은 form-js editor 마운트 후 .fjs-properties-container가 생긴 뒤에만 가능.
  attachLeftHandle(api);
  attachRightHandle(api);
  mounted = true;
  // eslint-disable-next-line no-console
  console.log('[PanelResize] mounted', {
    leftRail: !!document.getElementById('left-rail'),
    propsContainer: !!document.querySelector('.fjs-properties-container'),
    handles: document.querySelectorAll('.panel-resize-handle').length,
  });
}

function attachLeftHandle(api: VsCodeApiLike | null): void {
  const rail = document.getElementById('left-rail');
  if (!rail) return;
  if (rail.nextElementSibling?.classList.contains('panel-resize-handle')) return;

  const saved = readSavedWidths(api);
  if (typeof saved.leftRailWidth === 'number') {
    applyLeftRailWidth(clamp(saved.leftRailWidth, LEFT_MIN, LEFT_MAX));
  }

  const handle = makeHandle('left', '좌측 패널 폭 조절');
  rail.parentElement?.insertBefore(handle, rail.nextSibling);

  const onMove = (w: number): void => applyLeftRailWidth(w);
  const onCommit = (w: number): void => {
    applyLeftRailWidth(w);
    const current = readSavedWidths(api);
    writeSavedWidths(api, {
      leftRailWidth: w,
      propertiesWidth:
        typeof current.propertiesWidth === 'number' ? current.propertiesWidth : 300,
    });
  };

  handle.addEventListener('pointerdown', (ev) => {
    const start = getCurrentWidth('--left-rail-width', 260);
    startDrag(handle, 'left', start, onCommit, onMove)(ev);
  });
}

function attachRightHandle(api: VsCodeApiLike | null): void {
  const propsContainer = document.querySelector('.fjs-properties-container') as HTMLElement | null;
  if (!propsContainer) return;
  if (propsContainer.previousElementSibling?.classList.contains('panel-resize-handle')) return;

  const saved = readSavedWidths(api);
  if (typeof saved.propertiesWidth === 'number') {
    applyPropertiesWidth(clamp(saved.propertiesWidth, RIGHT_MIN, RIGHT_MAX));
  }

  const handle = makeHandle('right', '우측 프로퍼티 패널 폭 조절');
  propsContainer.parentElement?.insertBefore(handle, propsContainer);

  const onMove = (w: number): void => applyPropertiesWidth(w);
  const onCommit = (w: number): void => {
    applyPropertiesWidth(w);
    const current = readSavedWidths(api);
    writeSavedWidths(api, {
      leftRailWidth:
        typeof current.leftRailWidth === 'number' ? current.leftRailWidth : 260,
      propertiesWidth: w,
    });
  };

  handle.addEventListener('pointerdown', (ev) => {
    const start = getCurrentWidth('--properties-panel-width', 300);
    startDrag(handle, 'right', start, onCommit, onMove)(ev);
  });
}

/**
 * form-js editor가 재마운트되어 .fjs-properties-container가 새로 생긴 경우
 * 우측 핸들을 다시 삽입한다. 좌측 rail은 #app 자식으로 그대로 유지되므로 재삽입 불필요.
 */
export function reattachRightHandle(api: VsCodeApiLike | null): void {
  if (!mounted) return;
  attachRightHandle(api);
}
