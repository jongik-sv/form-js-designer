/**
 * usePropsPanelFocusGuard
 *
 * form-js-editor는 선택된 canvas 필드에 `useEffect(() => ref.current.focus(), [selection, field])`
 * 를 설치한다. 이 때문에 사용자가 props-panel 안의 input/select 에 포커스를 두고 타이핑하는 중에도
 * 필드가 re-render 될 때마다 canvas 요소가 focus 를 훔쳐간다.
 *
 * 우회책: 전역 HTMLElement.prototype.focus 를 래핑하여, 대상이 .fjs-editor-selected 이고
 * 현재 활성 요소가 .props-panel 내부에 있을 때 focus 호출을 무시한다.
 *
 * 적용 범위가 미니멀(특정 클래스 + 활성 요소 조건) 이므로 다른 포커스 흐름을 방해하지 않는다.
 */
export function installPropsPanelFocusGuard(): () => void {
  const orig = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, ...args: unknown[]) {
    if (this.classList && this.classList.contains('fjs-editor-selected')) {
      const active = document.activeElement;
      if (active && (active as HTMLElement).closest?.('.props-panel')) {
        // props-panel input 에서 타이핑 중 — canvas 가 focus 를 훔치려는 시도 차단
        return;
      }
    }
    return orig.apply(this, args as []);
  } as typeof HTMLElement.prototype.focus;

  return () => {
    HTMLElement.prototype.focus = orig;
  };
}
