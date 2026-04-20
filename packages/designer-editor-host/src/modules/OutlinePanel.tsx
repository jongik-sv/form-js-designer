import { h } from 'preact';
import { useState, useCallback, useRef } from 'preact/hooks';
import type { OutlineNode, DropPosition, OnDropMulti } from './outlineTypes';
import { MULTI_DRAG_MIME } from './outlineTypes';
import { getDropPosition } from './outlineUtils';

export interface OutlinePanelProps {
  nodes: OutlineNode[];
  selectedIds: string[];
  onSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
  onDrop: (dragId: string, targetId: string, position: DropPosition) => void;
  onDropMulti?: OnDropMulti;
  onCopy: (id: string) => void;
  onPaste: () => void;
}

const VIRTUAL_ROOT_ID = '__outline_root__';

/** 컨테이너 타입 목록: inside 드롭 가능 여부 판단에 사용 */
const CONTAINER_TYPES = new Set(['card', 'modal', 'tabPanel', 'tabs']);

function wrapWithVirtualRoot(nodes: OutlineNode[]): OutlineNode {
  return {
    id: VIRTUAL_ROOT_ID,
    type: '',
    label: 'Outline',
    children: nodes,
  };
}

interface OutlineNodeItemProps {
  node: OutlineNode;
  depth: number;
  selectedIds: string[];
  onSelect: (id: string, opts?: { additive?: boolean; range?: boolean }) => void;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  isVirtualRoot?: boolean;
  dragOverId: string | null;
  dragOverPosition: DropPosition | null;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragOver: (e: DragEvent, id: string, type: string) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent, id: string) => void;
}

function OutlineNodeItem({
  node,
  depth,
  selectedIds,
  onSelect,
  collapsedIds,
  onToggle,
  isVirtualRoot = false,
  dragOverId,
  dragOverPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: OutlineNodeItemProps): h.JSX.Element {
  const isSelected = !isVirtualRoot && selectedIds.includes(node.id);
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  const isDragOver = dragOverId === node.id;
  const dropPos = isDragOver ? dragOverPosition : null;

  const handleToggle = useCallback(
    (e: Event) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onToggle(node.id);
      }
    },
    [node.id, onToggle],
  );

  // DnD CSS 클래스 조합
  const nodeRowClass = [
    'outline-node-row',
    isDragOver && dropPos === 'before' ? 'outline-drop-indicator--before' : '',
    isDragOver && dropPos === 'after' ? 'outline-drop-indicator--after' : '',
    isDragOver && dropPos === 'inside' ? 'outline-drop-indicator--inside' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li role="treeitem">
      <div
        class={nodeRowClass}
        style={{ '--depth': depth } as h.JSX.CSSProperties}
        onDragOver={!isVirtualRoot ? (e) => onDragOver(e, node.id, node.type) : undefined}
        onDragLeave={!isVirtualRoot ? onDragLeave : undefined}
        onDrop={!isVirtualRoot ? (e) => onDrop(e, node.id) : undefined}
      >
        {hasChildren ? (
          <button
            class="outline-toggle"
            type="button"
            aria-expanded={isCollapsed ? 'false' : 'true'}
            aria-label={isCollapsed ? '펼치기' : '접기'}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span class="outline-toggle-spacer" aria-hidden="true" />
        )}
        {isVirtualRoot ? (
          <span
            class="outline-node outline-node--virtual-root"
            data-outline-id={node.id}
            data-testid="outline-virtual-root"
          >
            <span class="outline-node__label">{node.label}</span>
          </span>
        ) : (
          <button
            class={`outline-node${isSelected ? ' outline-node--selected' : ''}`}
            data-outline-id={node.id}
            data-testid={`outline-node-${node.id}`}
            onClick={(e) => {
              if (e.shiftKey) {
                // shift: range 선택 (anchor→target 사이 모든 노드)
                onSelect(node.id, { range: true });
              } else if (e.metaKey || e.ctrlKey) {
                // ctrl/meta: additive 토글 (개별 추가/제거)
                onSelect(node.id, { additive: true });
              } else {
                onSelect(node.id);
              }
            }}
            type="button"
            aria-selected={isSelected ? 'true' : 'false'}
            draggable={true}
            onDragStart={(e) => onDragStart(e, node.id)}
          >
            <span class="outline-node__type">{node.type}</span>
            {node.label && <span class="outline-node__label">{node.label}</span>}
          </button>
        )}
      </div>
      {hasChildren && !isCollapsed && (
        <ul class="outline-node__children">
          {node.children.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              onSelect={onSelect}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              dragOverId={dragOverId}
              dragOverPosition={dragOverPosition}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OutlinePanel({
  nodes,
  selectedIds,
  onSelect,
  onDrop,
  onDropMulti,
  onCopy,
  onPaste,
}: OutlinePanelProps): h.JSX.Element {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DropPosition | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    dragIdRef.current = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      // 멀티 선택 중이고 드래그 대상이 선택 집합에 포함된 경우 id-list 직렬화
      if (selectedIds.includes(id) && selectedIds.length > 1) {
        e.dataTransfer.setData(MULTI_DRAG_MIME, JSON.stringify(selectedIds));
      }
    }
    // 드래그 중 노드에 CSS 마킹
    const target = e.currentTarget as HTMLElement;
    target.classList.add('outline-node--dragging');
  }, [selectedIds]);

  const handleDragOver = useCallback(
    (e: DragEvent, id: string, type: string) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const isContainer = CONTAINER_TYPES.has(type);
      const position = getDropPosition(rect, e.clientY, isContainer);

      setDragOverId(id);
      setDragOverPosition(position);
    },
    [],
  );

  const handleDragLeave = useCallback((_e: DragEvent) => {
    setDragOverId(null);
    setDragOverPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault();
      const dragId = dragIdRef.current;
      const position = dragOverPosition;

      // 인디케이터 초기화
      setDragOverId(null);
      setDragOverPosition(null);
      dragIdRef.current = null;

      if (!dragId || !position) return;

      // 멀티 DnD: application/x-outline-id-list 먼저 시도
      const multiPayload = e.dataTransfer?.getData(MULTI_DRAG_MIME);
      if (multiPayload) {
        try {
          const ids = JSON.parse(multiPayload) as string[];
          if (Array.isArray(ids) && ids.length > 1 && onDropMulti) {
            onDropMulti(ids, targetId, position);
            return;
          }
        } catch {
          // JSON 파싱 실패 → 단일 드래그 fallback
        }
      }

      onDrop(dragId, targetId, position);
    },
    [dragOverPosition, onDrop, onDropMulti],
  );

  /** Cmd/Ctrl+C/V 키보드 이벤트 처리 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === 'c' || e.key === 'C') {
        e.stopPropagation();
        if (selectedIds.length > 0) {
          onCopy(selectedIds[0]!);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        e.stopPropagation();
        onPaste();
      }
    },
    [selectedIds, onCopy, onPaste],
  );

  const virtualRoot = wrapWithVirtualRoot(nodes);

  return (
    <div
      class="outline-panel"
      data-testid="outline-panel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <ul class="outline-panel__tree" role="tree">
        <OutlineNodeItem
          key={VIRTUAL_ROOT_ID}
          node={virtualRoot}
          depth={0}
          selectedIds={selectedIds}
          onSelect={onSelect}
          collapsedIds={collapsedIds}
          onToggle={handleToggle}
          isVirtualRoot={true}
          dragOverId={dragOverId}
          dragOverPosition={dragOverPosition}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </ul>
    </div>
  );
}
