/**
 * TSK-05-03: portalRoot 유틸
 *
 * .form-js-block 조상 요소 내에서 .fjs-portal-root div를 lazy 생성 및 반환한다.
 * Modal이 document.body로 누출되지 않도록 portal 컨테이너를 블록 내부에 한정한다.
 *
 * - blockEl이 null이면 document.body에 fallback
 * - 동일 blockEl에 대해 항상 같은 DOM 노드를 반환 (WeakMap 캐싱)
 */

const portalRootCache = new WeakMap<Element, HTMLElement>();

/**
 * blockEl 내부에서 .fjs-portal-root를 lazy 생성하여 반환한다.
 * @param blockEl .form-js-block 요소. null이면 document.body에 fallback.
 */
export function getPortalRoot(blockEl: Element | null): HTMLElement {
  const parent: Element = blockEl ?? document.body;

  // WeakMap에서 캐시 조회
  if (portalRootCache.has(parent)) {
    return portalRootCache.get(parent)!;
  }

  // 이미 DOM에 직계 자식 .fjs-portal-root가 있으면 재사용
  const existing = parent.querySelector(':scope > .fjs-portal-root') as HTMLElement | null;
  if (existing) {
    portalRootCache.set(parent, existing);
    return existing;
  }

  // 새로 생성하여 parent에 추가
  const root = document.createElement('div');
  root.className = 'fjs-portal-root';
  parent.appendChild(root);
  portalRootCache.set(parent, root);
  return root;
}
