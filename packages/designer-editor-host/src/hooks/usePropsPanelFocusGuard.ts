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
 * @param scope (v0.2 추가) — 기본 document. Element를 넘기면 그 element 안의
 *              fjs-editor-selected 요소에만 패치를 적용한다. 외부 요소의 focus
 *              호출은 원본 동작 그대로. 사용처: 임베디드 디자이너 모달이 자기
 *              스코프 내부 패치만 활성화.
 */
export function installPropsPanelFocusGuard(
  scope: Element | Document = document,
): () => void {
  const orig = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, ...args: unknown[]) {
    const inScope = scope === document || (scope as Element).contains(this);
    if (inScope && this.classList && this.classList.contains('fjs-editor-selected')) {
      const active = document.activeElement;
      if (active && (active as HTMLElement).closest?.('.props-panel')) {
        return;
      }
    }
    return orig.apply(this, args as []);
  } as typeof HTMLElement.prototype.focus;

  return () => {
    HTMLElement.prototype.focus = orig;
  };
}
