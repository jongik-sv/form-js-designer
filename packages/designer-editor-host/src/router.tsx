/**
 * router.tsx — 에디터 호스트 앱 라우터 (TSK-06-02)
 *
 * 해시 기반 탭 전환: #/props, #/preview
 * useSidePanelTab() 훅으로 현재 탭 상태를 제공한다.
 */

import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export type SidePanelTab = 'props' | 'preview' | null;

/**
 * 해시에서 사이드 패널 탭을 파싱한다.
 */
function parseTabFromHash(): SidePanelTab {
  const hash = window.location.hash;
  if (hash === '#/props') return 'props';
  if (hash === '#/preview') return 'preview';
  return null;
}

/**
 * 현재 사이드 패널 탭 상태와 전환 함수를 반환하는 훅.
 */
export function useSidePanelTab(): [SidePanelTab, (tab: SidePanelTab) => void] {
  const [tab, setTab] = useState<SidePanelTab>(parseTabFromHash);

  useEffect(() => {
    const onHashChange = () => {
      setTab(parseTabFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (newTab: SidePanelTab) => {
    if (newTab === null) {
      window.location.hash = '';
    } else {
      window.location.hash = `#/${newTab}`;
    }
    setTab(newTab);
  };

  return [tab, navigate];
}

/**
 * AppRouter — 앱 진입점 라우터 래퍼.
 * 단일 페이지 에디터이므로 실 라우팅 분기 없이 훅만 제공한다.
 */
export function AppRouter({ children }: { children: h.JSX.Element | h.JSX.Element[] }) {
  return <Fragment>{children}</Fragment>;
}
