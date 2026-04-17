/**
 * schemaToOutline — form-js schema JSON → OutlineNode[] 재귀 변환 순수 함수
 * TSK-06-01
 */

import type { OutlineNode } from './outlineTypes';

export interface FieldSchema {
  id?: string;
  type?: string;
  label?: string;
  text?: string;
  key?: string;
  components?: FieldSchema[];
  rows?: Array<{ cells?: Array<{ components?: FieldSchema[] }> }>;
}

export interface FormSchema {
  type?: string;
  id?: string;
  components?: FieldSchema[];
}

/**
 * form-js FieldSchema를 OutlineNode로 변환 (재귀)
 */
function fieldToNode(field: FieldSchema): OutlineNode {
  const id = field.id ?? field.key ?? `${field.type ?? 'unknown'}-${Math.random().toString(36).slice(2, 7)}`;
  const label = field.label ?? field.text;
  const children: OutlineNode[] = [];

  // field.components 배열 처리
  if (Array.isArray(field.components)) {
    for (const child of field.components) {
      children.push(fieldToNode(child));
    }
  }

  // field.rows[].cells[].components[] 패턴 처리
  if (Array.isArray(field.rows)) {
    for (const row of field.rows) {
      if (Array.isArray(row.cells)) {
        for (const cell of row.cells) {
          if (Array.isArray(cell.components)) {
            for (const comp of cell.components) {
              children.push(fieldToNode(comp));
            }
          }
        }
      }
    }
  }

  return {
    id,
    type: field.type ?? 'unknown',
    label,
    children,
  };
}

/**
 * form-js schema → OutlineNode[]
 * schema.components 최상위 배열을 변환한다.
 * schema가 null/undefined 이거나 components가 없으면 [] 반환.
 */
export function schemaToOutline(schema: FormSchema | null | undefined): OutlineNode[] {
  if (!schema || !Array.isArray(schema.components)) {
    return [];
  }
  return schema.components.map(fieldToNode);
}
