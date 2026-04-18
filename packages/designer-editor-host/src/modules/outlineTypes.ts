/**
 * OutlineNode — form-js 스키마 트리 시각화 타입
 * TSK-06-01
 *
 * DropPosition — outline-dnd-copy-paste feature
 */

export interface OutlineNode {
  id: string;
  type: string;
  label?: string;
  children: OutlineNode[];
}

/** DnD 드롭 위치: 대상 노드 위 / 아래 / 내부(컨테이너) */
export type DropPosition = 'before' | 'after' | 'inside';
