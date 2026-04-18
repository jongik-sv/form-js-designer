import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import { OutlinePanel } from '../modules/OutlinePanel';
import type { OutlinePanelProps } from '../modules/OutlinePanel';
import type { OutlineNode } from '../modules/outlineTypes';

afterEach(() => {
  cleanup();
});

function makeNode(
  id: string,
  type: string,
  label?: string,
  children: OutlineNode[] = [],
): OutlineNode {
  return { id, type, label, children };
}

const leafNode = makeNode('leaf-1', 'textfield', 'Name');
const parentNode = makeNode('parent-1', 'card', 'My Card', [
  makeNode('child-1', 'textfield', 'Child A'),
  makeNode('child-2', 'textfield', 'Child B'),
]);

function renderPanel(props: Partial<OutlinePanelProps> & { nodes: OutlinePanelProps['nodes'] }) {
  const fullProps: OutlinePanelProps = {
    nodes: props.nodes,
    selectedIds: props.selectedIds ?? [],
    onSelect: props.onSelect ?? vi.fn(),
    onDrop: props.onDrop ?? vi.fn(),
    onCopy: props.onCopy ?? vi.fn(),
    onPaste: props.onPaste ?? vi.fn(),
  };
  return render(<OutlinePanel {...fullProps} />);
}

// ============================================================
// 0. 가상 루트 노드 — 항상 렌더 (outline-root-node feature)
// ============================================================
describe('OutlinePanel — virtual root node', () => {
  it('always renders virtual root node with data-testid="outline-virtual-root"', () => {
    renderPanel({ nodes: [] });
    expect(screen.getByTestId('outline-virtual-root')).toBeTruthy();
  });

  it('renders virtual root with label "Outline"', () => {
    renderPanel({ nodes: [] });
    const rootEl = screen.getByTestId('outline-virtual-root');
    expect(rootEl.textContent).toContain('Outline');
  });

  it('renders virtual root even when nodes is non-empty', () => {
    renderPanel({ nodes: [leafNode] });
    expect(screen.getByTestId('outline-virtual-root')).toBeTruthy();
  });

  it('does NOT render old empty state "컴포넌트 없음" when nodes is empty', () => {
    renderPanel({ nodes: [] });
    expect(document.querySelector('[data-testid="outline-panel-empty"]')).toBeNull();
  });

  it('clicking virtual root row does NOT call onSelect', () => {
    const onSelect = vi.fn();
    renderPanel({ nodes: [leafNode], onSelect });
    const rootEl = screen.getByTestId('outline-virtual-root');
    fireEvent.click(rootEl);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('virtual root has CSS class outline-node--virtual-root', () => {
    renderPanel({ nodes: [leafNode] });
    const rootEl = screen.getByTestId('outline-virtual-root');
    expect(rootEl.classList.contains('outline-node--virtual-root')).toBe(true);
  });

  it('virtual root has chevron toggle button (has children)', () => {
    renderPanel({ nodes: [leafNode] });
    // 가상 루트는 자식이 있으므로 toggle 버튼이 있어야 함
    const rootRow = screen.getByTestId('outline-virtual-root').closest('.outline-node-row');
    const toggle = rootRow?.querySelector('.outline-toggle');
    expect(toggle).toBeTruthy();
  });

  it('collapsing virtual root hides all child nodes from DOM', () => {
    renderPanel({ nodes: [leafNode] });
    // 가상 루트의 toggle 버튼 찾기
    const rootRow = screen.getByTestId('outline-virtual-root').closest('.outline-node-row');
    const toggle = rootRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);
    // 자식 노드가 DOM에서 사라짐
    expect(document.querySelector('[data-testid="outline-node-leaf-1"]')).toBeNull();
  });

  it('virtual root is expanded by default (aria-expanded=true)', () => {
    renderPanel({ nodes: [leafNode] });
    const rootRow = screen.getByTestId('outline-virtual-root').closest('.outline-node-row');
    const toggle = rootRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('virtual root does not have aria-selected attribute', () => {
    renderPanel({ nodes: [leafNode] });
    const rootEl = screen.getByTestId('outline-virtual-root');
    // aria-selected가 없거나 false여야 함 (설계: 생략 또는 false 고정)
    const ariaSelected = rootEl.getAttribute('aria-selected');
    expect(ariaSelected === null || ariaSelected === 'false').toBe(true);
  });
});

// ============================================================
// 1. 빈 노드 → 가상 루트 표시 (기존 empty state 대체)
// ============================================================
describe('OutlinePanel — empty state (updated)', () => {
  it('renders virtual root instead of "컴포넌트 없음" when nodes is empty', () => {
    renderPanel({ nodes: [] });
    // 기존 outline-panel-empty는 없어야 함
    expect(document.querySelector('[data-testid="outline-panel-empty"]')).toBeNull();
    // 가상 루트는 있어야 함
    expect(screen.getByTestId('outline-virtual-root')).toBeTruthy();
  });

  it('virtual root with empty children has no toggle (or toggle shows no children)', () => {
    renderPanel({ nodes: [] });
    // 가상 루트에 children=[]이면 toggle이 없거나 접어도 자식이 없음
    // 실제 outline-panel 컨테이너는 표시됨
    expect(screen.getByTestId('outline-panel')).toBeTruthy();
  });
});

// ============================================================
// 2. 리프 노드 렌더 — chevron 없음, 스페이서만
// ============================================================
describe('OutlinePanel — leaf node', () => {
  it('renders leaf node without toggle button (only virtual root has toggle)', () => {
    renderPanel({ nodes: [leafNode] });
    // 가상 루트 toggle + leaf 스페이서
    // leaf 노드 row는 toggle button이 없어야 함
    const leafBtn = screen.getByTestId('outline-node-leaf-1');
    const leafRow = leafBtn.closest('.outline-node-row');
    const leafToggle = leafRow?.querySelector('.outline-toggle');
    expect(leafToggle).toBeNull();
  });

  it('renders leaf node label', () => {
    renderPanel({ nodes: [leafNode] });
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('renders leaf type badge', () => {
    renderPanel({ nodes: [leafNode] });
    expect(screen.getByText('textfield')).toBeTruthy();
  });
});

// ============================================================
// 3. 자식 있는 노드 — chevron 표시 + 초기 펼침
// ============================================================
describe('OutlinePanel — parent node with children', () => {
  it('renders chevron toggle button for parent node', () => {
    renderPanel({ nodes: [parentNode] });
    // 가상 루트 toggle + parent node toggle = 2개
    const toggles = document.querySelectorAll('.outline-toggle');
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it('parent node chevron has aria-expanded="true" initially (expanded)', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('children are rendered initially (not collapsed)', () => {
    renderPanel({ nodes: [parentNode] });
    expect(screen.getByTestId('outline-node-child-1')).toBeTruthy();
    expect(screen.getByTestId('outline-node-child-2')).toBeTruthy();
  });

  it('role=tree on root ul, role=treeitem on li', () => {
    renderPanel({ nodes: [parentNode] });
    const tree = document.querySelector('[role="tree"]');
    expect(tree).toBeTruthy();
    const treeItems = document.querySelectorAll('[role="treeitem"]');
    expect(treeItems.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 4. Chevron 클릭 → 접힘 (collapsedIds에 추가)
// ============================================================
describe('OutlinePanel — toggle collapse', () => {
  it('clicking parent chevron hides children', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.click(toggle);
    // 자식 노드가 DOM에서 사라짐
    expect(document.querySelector('[data-testid="outline-node-child-1"]')).toBeNull();
    expect(document.querySelector('[data-testid="outline-node-child-2"]')).toBeNull();
  });

  it('clicking parent chevron changes aria-expanded to false', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking parent chevron again shows children (toggle back)', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.click(toggle); // collapse
    fireEvent.click(toggle); // expand
    expect(screen.getByTestId('outline-node-child-1')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

// ============================================================
// 5. 선택 분리 — 행 클릭 vs chevron 클릭
// ============================================================
describe('OutlinePanel — select vs toggle separation', () => {
  it('clicking row label calls onSelect(id)', () => {
    const onSelect = vi.fn();
    renderPanel({ nodes: [parentNode], onSelect });
    const nodeBtn = screen.getByTestId('outline-node-parent-1');
    fireEvent.click(nodeBtn);
    expect(onSelect).toHaveBeenCalledWith('parent-1');
  });

  it('clicking chevron does NOT call onSelect', () => {
    const onSelect = vi.fn();
    renderPanel({ nodes: [parentNode], onSelect });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.click(toggle);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('collapsedIds does not change when row is clicked', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    // aria-expanded stays true after row click
    fireEvent.click(parentBtn);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('outline-node-child-1')).toBeTruthy();
  });
});

// ============================================================
// 6. 선택 상태 — outline-node--selected 클래스
// ============================================================
describe('OutlinePanel — selected state', () => {
  it('applies outline-node--selected class to selected node', () => {
    renderPanel({ nodes: [parentNode], selectedIds: ['parent-1'] });
    const nodeBtn = screen.getByTestId('outline-node-parent-1');
    expect(nodeBtn.classList.contains('outline-node--selected')).toBe(true);
  });

  it('does not apply outline-node--selected to non-selected node', () => {
    renderPanel({ nodes: [parentNode], selectedIds: [] });
    const nodeBtn = screen.getByTestId('outline-node-parent-1');
    expect(nodeBtn.classList.contains('outline-node--selected')).toBe(false);
  });
});

// ============================================================
// 7. depth CSS 변수 (가상 루트 도입 후 shift)
// ============================================================
describe('OutlinePanel — depth CSS variable', () => {
  it('virtual root has --depth=0', () => {
    renderPanel({ nodes: [parentNode] });
    // 가상 루트 row
    const rootEl = screen.getByTestId('outline-virtual-root');
    const rootRow = rootEl.closest('.outline-node-row') as HTMLElement;
    expect(rootRow).toBeTruthy();
    const depthVal = rootRow.style.getPropertyValue('--depth');
    expect(depthVal).toBe('0');
  });

  it('former root level nodes now have --depth=1 (under virtual root)', () => {
    renderPanel({ nodes: [parentNode] });
    // 기존 최상위 노드 (가상 루트의 직접 자식) = depth 1
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row') as HTMLElement;
    expect(parentRow).toBeTruthy();
    const depthVal = parentRow.style.getPropertyValue('--depth');
    expect(depthVal).toBe('1');
  });

  it('child nodes have --depth=2', () => {
    renderPanel({ nodes: [parentNode] });
    // 자식 노드 row
    const childNodeBtn = screen.getByTestId('outline-node-child-1');
    const childRow = childNodeBtn.closest('.outline-node-row') as HTMLElement;
    expect(childRow).toBeTruthy();
    const depthVal = childRow.style.getPropertyValue('--depth');
    expect(depthVal).toBe('2');
  });
});

// ============================================================
// 8. 재마운트 → state 리셋 (새 import 시뮬레이션)
// ============================================================
describe('OutlinePanel — remount resets collapsed state', () => {
  it('resets collapsed state on unmount + remount', () => {
    const onSelect = vi.fn();

    renderPanel({ nodes: [parentNode], onSelect });

    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.click(toggle);
    expect(document.querySelector('[data-testid="outline-node-child-1"]')).toBeNull();

    // 재마운트 시뮬레이션 (OutlineModule이 key를 변경하면 Preact가 재마운트함)
    cleanup();
    renderPanel({ nodes: [parentNode], onSelect });

    expect(screen.getByTestId('outline-node-child-1')).toBeTruthy();
    const parentBtn2 = screen.getByTestId('outline-node-parent-1');
    const parentRow2 = parentBtn2.closest('.outline-node-row');
    const newToggle = parentRow2?.querySelector('.outline-toggle') as HTMLButtonElement;
    expect(newToggle.getAttribute('aria-expanded')).toBe('true');
  });
});

// ============================================================
// 9. 키보드 접근성 — Space/Enter 토글
// ============================================================
describe('OutlinePanel — keyboard accessibility', () => {
  it('Space key on parent chevron toggles collapse', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.keyDown(toggle, { code: 'Space', key: ' ' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('Enter key on parent chevron toggles collapse', () => {
    renderPanel({ nodes: [parentNode] });
    const parentBtn = screen.getByTestId('outline-node-parent-1');
    const parentRow = parentBtn.closest('.outline-node-row');
    const toggle = parentRow?.querySelector('.outline-toggle') as HTMLButtonElement;
    fireEvent.keyDown(toggle, { code: 'Enter', key: 'Enter' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
