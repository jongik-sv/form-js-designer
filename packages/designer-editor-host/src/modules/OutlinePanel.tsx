/**
 * OutlinePanel — form-js 스키마 트리 시각화 Preact 컴포넌트
 * TSK-06-01
 */

import { h } from 'preact';
import type { OutlineNode } from './outlineTypes';

export interface OutlinePanelProps {
  nodes: OutlineNode[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}

function OutlineNodeItem({
  node,
  selectedIds,
  onSelect,
}: {
  node: OutlineNode;
  selectedIds: string[];
  onSelect: (id: string) => void;
}): h.JSX.Element {
  const isSelected = selectedIds.includes(node.id);

  return (
    <li>
      <button
        class={`outline-node${isSelected ? ' outline-node--selected' : ''}`}
        data-outline-id={node.id}
        data-testid={`outline-node-${node.id}`}
        onClick={() => onSelect(node.id)}
        type="button"
        aria-selected={isSelected}
      >
        <span class="outline-node__type">{node.type}</span>
        {node.label && <span class="outline-node__label">{node.label}</span>}
      </button>
      {node.children.length > 0 && (
        <ul class="outline-node__children">
          {node.children.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OutlinePanel({ nodes, selectedIds, onSelect }: OutlinePanelProps): h.JSX.Element {
  if (nodes.length === 0) {
    return (
      <div class="outline-panel outline-panel--empty" data-testid="outline-panel-empty">
        <p>컴포넌트 없음</p>
      </div>
    );
  }

  return (
    <div class="outline-panel" data-testid="outline-panel">
      <ul class="outline-panel__tree">
        {nodes.map((node) => (
          <OutlineNodeItem
            key={node.id}
            node={node}
            selectedIds={selectedIds}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}
