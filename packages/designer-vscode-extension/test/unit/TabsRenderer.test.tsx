/**
 * TSK-05-02: TabsRenderer + TabPanelRenderer 단위 테스트
 *
 * QA 체크리스트 기반:
 * --- 정상 케이스 ---
 * - 탭 3개 fixture에서 첫 번째 탭이 기본 활성화된다 (aria-selected="true" + 패널 visible)
 * - activeTab 스키마 속성으로 두 번째 탭 id를 지정하면 두 번째 탭이 초기 활성화된다
 * - 탭 버튼 클릭 시 해당 패널이 visible, 나머지 패널은 hidden 처리된다
 * - inactive 패널의 컴포넌트는 항상 마운트 상태 유지 (hidden 속성으로만 가림)
 *
 * --- 키보드 탐색 ---
 * - ArrowRight: 다음 탭으로 이동 및 활성화
 * - 마지막 탭에서 ArrowRight: 첫 번째 탭으로 wrap-around
 * - ArrowLeft: 이전 탭으로 이동
 * - 첫 번째 탭에서 ArrowLeft: 마지막 탭으로 wrap-around
 * - Home: 첫 번째 탭으로 이동
 * - End: 마지막 탭으로 이동
 *
 * --- ARIA ---
 * - tablist에 role="tablist" 존재
 * - 각 탭 버튼에 role="tab", aria-selected, aria-controls 속성 존재
 * - 각 패널에 role="tabpanel", aria-labelledby 속성 존재
 * - aria-controls 값이 해당 tabpanel의 id와 일치
 *
 * --- 엣지 케이스 ---
 * - components: [] (탭 없음) 스키마: 에러 없이 빈 tablist 렌더
 * - activeTab이 존재하지 않는 id: 첫 번째 탭으로 fallback
 * - 탭 1개짜리 스키마: 단일 패널 렌더
 */
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { TabsRenderer, type TabsField } from '../../src/components/TabsRenderer';
import { TabPanelRenderer, type TabPanelField } from '../../src/components/TabPanelRenderer';

void h;

// ──────────────────────────────────────────────────────
// 픽스처 헬퍼
// ──────────────────────────────────────────────────────

function makeTabsField(
  panels: Array<{ id: string; label: string; components?: TabPanelField['components'] }>,
  activeTab?: string,
): TabsField {
  return {
    id: 'tabs-1',
    type: 'tabs',
    activeTab,
    components: panels.map((p) => ({
      id: p.id,
      type: 'tabPanel' as const,
      label: p.label,
      components: p.components ?? [],
    })),
  };
}

const threePanelField = makeTabsField([
  { id: 'panel-a', label: 'Tab A', components: [{ id: 'f1', type: 'textfield', key: 'name', label: '이름' }] },
  { id: 'panel-b', label: 'Tab B', components: [{ id: 'f2', type: 'textfield', key: 'email', label: '이메일' }] },
  { id: 'panel-c', label: 'Tab C', components: [{ id: 'f3', type: 'number', key: 'age', label: '나이' }] },
]);

// ──────────────────────────────────────────────────────
// Mock ChildrenRenderer — 자식 컴포넌트 목록을 렌더
// ──────────────────────────────────────────────────────
const MockChildrenRenderer = ({ field }: { field: TabPanelField }) => (
  <div data-testid={`children-${field.id}`}>
    {field.components.map((c) => (
      <div key={c.id as string} data-testid={`child-${c.id as string}`}>
        {c['label'] as string}
      </div>
    ))}
  </div>
);

// ──────────────────────────────────────────────────────
// 1. 정상 케이스 — 탭 기본 활성화
// ──────────────────────────────────────────────────────
describe('TabsRenderer: 정상 케이스', () => {
  it('탭 3개 fixture에서 첫 번째 탭이 기본 활성화된다 (aria-selected="true")', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('첫 번째 탭의 패널이 visible, 나머지는 hidden이다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const panels = getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(3);
    expect(panels[0]!.hidden).toBe(false);
    expect(panels[1]!.hidden).toBe(true);
    expect(panels[2]!.hidden).toBe(true);
  });

  it('activeTab 속성으로 두 번째 탭이 초기 활성화된다', () => {
    const field = makeTabsField(
      [
        { id: 'panel-a', label: 'Tab A' },
        { id: 'panel-b', label: 'Tab B' },
        { id: 'panel-c', label: 'Tab C' },
      ],
      'panel-b',
    );
    const { getAllByRole } = render(
      <TabsRenderer field={field} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('탭 버튼 클릭 시 해당 패널이 visible, 나머지는 hidden 처리된다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    fireEvent.click(tabs[1]!);

    const panels = getAllByRole('tabpanel', { hidden: true });
    expect(panels[0]!.hidden).toBe(true);
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[2]!.hidden).toBe(true);
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('inactive 패널의 자식 컴포넌트가 DOM에 마운트되어 있다 (hidden이지만 unmount 아님)', () => {
    const { getByTestId } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    // 두 번째, 세 번째 패널 자식도 DOM에 존재해야 함
    expect(getByTestId('children-panel-b')).toBeTruthy();
    expect(getByTestId('children-panel-c')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────
// 2. 키보드 탐색
// ──────────────────────────────────────────────────────
describe('TabsRenderer: 키보드 탐색', () => {
  it('ArrowRight: 첫 번째 탭 포커스 후 다음 탭으로 활성화된다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });

    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('마지막 탭에서 ArrowRight: 첫 번째 탭으로 wrap-around', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    // 마지막 탭 활성화
    fireEvent.click(tabs[2]!);
    tabs[2]!.focus();
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });

    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft: 두 번째 탭에서 첫 번째 탭으로 이동', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    fireEvent.click(tabs[1]!);
    tabs[1]!.focus();
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowLeft' });

    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('첫 번째 탭에서 ArrowLeft: 마지막 탭으로 wrap-around', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });

    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('Home: 첫 번째 탭으로 이동', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    fireEvent.click(tabs[2]!);
    tabs[2]!.focus();
    fireEvent.keyDown(tabs[2]!, { key: 'Home' });

    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('End: 마지막 탭으로 이동', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'End' });

    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });
});

// ──────────────────────────────────────────────────────
// 3. ARIA
// ──────────────────────────────────────────────────────
describe('TabsRenderer: ARIA', () => {
  it('tablist 컨테이너에 role="tablist"가 존재한다', () => {
    const { getByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    expect(getByRole('tablist')).toBeTruthy();
  });

  it('각 탭 버튼에 role="tab", aria-selected, aria-controls 속성이 존재한다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    for (const tab of tabs) {
      expect(tab.getAttribute('role')).toBe('tab');
      expect(tab.getAttribute('aria-selected')).toBeDefined();
      expect(tab.getAttribute('aria-controls')).toBeTruthy();
    }
  });

  it('각 패널에 role="tabpanel", aria-labelledby 속성이 존재한다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const panels = getAllByRole('tabpanel', { hidden: true });
    for (const panel of panels) {
      expect(panel.getAttribute('role')).toBe('tabpanel');
      expect(panel.getAttribute('aria-labelledby')).toBeTruthy();
    }
  });

  it('aria-controls 값이 해당 tabpanel의 id와 일치한다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    const panels = getAllByRole('tabpanel', { hidden: true });

    for (let i = 0; i < tabs.length; i++) {
      const controlsId = tabs[i]!.getAttribute('aria-controls');
      expect(panels[i]!.id).toBe(controlsId);
    }
  });

  it('aria-labelledby 값이 해당 탭 버튼의 id와 일치한다', () => {
    const { getAllByRole } = render(
      <TabsRenderer field={threePanelField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    const panels = getAllByRole('tabpanel', { hidden: true });

    for (let i = 0; i < panels.length; i++) {
      const labelledby = panels[i]!.getAttribute('aria-labelledby');
      expect(tabs[i]!.id).toBe(labelledby);
    }
  });
});

// ──────────────────────────────────────────────────────
// 4. 엣지 케이스
// ──────────────────────────────────────────────────────
describe('TabsRenderer: 엣지 케이스', () => {
  it('components: [] 스키마에서 에러 없이 빈 tablist를 렌더한다', () => {
    const emptyField: TabsField = { id: 'tabs-empty', type: 'tabs', components: [] };
    const { getByRole } = render(
      <TabsRenderer field={emptyField} ChildrenRenderer={MockChildrenRenderer} />,
    );
    expect(getByRole('tablist')).toBeTruthy();
  });

  it('activeTab이 존재하지 않는 id를 가리킬 때 첫 번째 탭으로 fallback한다', () => {
    const field = makeTabsField(
      [
        { id: 'panel-a', label: 'Tab A' },
        { id: 'panel-b', label: 'Tab B' },
      ],
      'non-existent-id',
    );
    const { getAllByRole } = render(
      <TabsRenderer field={field} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('탭 1개짜리 스키마에서 단일 패널이 렌더된다', () => {
    const field = makeTabsField([{ id: 'panel-only', label: 'Only Tab' }]);
    const { getAllByRole } = render(
      <TabsRenderer field={field} ChildrenRenderer={MockChildrenRenderer} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });
});

// ──────────────────────────────────────────────────────
// 5. TabPanelRenderer 독립 테스트
// ──────────────────────────────────────────────────────
describe('TabPanelRenderer', () => {
  const panelField: TabPanelField = {
    id: 'panel-a',
    type: 'tabPanel',
    label: 'Tab A',
    components: [{ id: 'f1', type: 'textfield', key: 'name', label: '이름' }],
  };

  it('isActive=true일 때 hidden 속성이 없다', () => {
    const { getByRole } = render(
      <TabPanelRenderer
        field={panelField}
        isActive={true}
        tabId="tab-panel-a"
        panelId="tabpanel-panel-a"
        ChildrenRenderer={MockChildrenRenderer}
      />,
    );
    const panel = getByRole('tabpanel');
    expect(panel.hidden).toBe(false);
  });

  it('isActive=false일 때 hidden 속성이 true이다', () => {
    const { getByRole } = render(
      <TabPanelRenderer
        field={panelField}
        isActive={false}
        tabId="tab-panel-a"
        panelId="tabpanel-panel-a"
        ChildrenRenderer={MockChildrenRenderer}
      />,
    );
    const panel = getByRole('tabpanel', { hidden: true });
    expect(panel.hidden).toBe(true);
  });

  it('isActive 변경 시 자식은 마운트 상태를 유지한다 (unmount 안 됨)', () => {
    const unmountSpy = vi.fn();

    // useEffect cleanup이 unmount 시 호출됨을 추적하는 컴포넌트
    const UnmountTracker = ({ field }: { field: TabPanelField }) => {
      useEffect(() => {
        return () => unmountSpy(); // cleanup = unmount
      }, []);
      return <div data-testid="tracker">{field.label}</div>;
    };

    const { rerender, getByTestId } = render(
      <TabPanelRenderer
        field={panelField}
        isActive={true}
        tabId="tab-panel-a"
        panelId="tabpanel-panel-a"
        ChildrenRenderer={UnmountTracker}
      />,
    );

    rerender(
      <TabPanelRenderer
        field={panelField}
        isActive={false}
        tabId="tab-panel-a"
        panelId="tabpanel-panel-a"
        ChildrenRenderer={UnmountTracker}
      />,
    );

    // hidden으로 바뀐 후에도 DOM에 자식이 있어야 한다
    expect(getByTestId('tracker')).toBeTruthy();
    // unmount cleanup이 호출되지 않았어야 한다 (조건부 언마운트 아님)
    expect(unmountSpy).not.toHaveBeenCalled();
  });
});
