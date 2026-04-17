/**
 * OutlineNode — form-js 스키마 트리 시각화 타입
 * TSK-06-01
 */

export interface OutlineNode {
  id: string;
  type: string;
  label?: string;
  children: OutlineNode[];
}
