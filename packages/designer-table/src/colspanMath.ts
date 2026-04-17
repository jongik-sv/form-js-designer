/**
 * colspanMath: 순수 유틸
 * TRD ColumnDef 트리에서 기대 colSpan/rowSpan 행렬 계산
 * TanStack 결과 QA 게이트용 독립 계산기
 */

import type { ColumnDef } from './types';

export interface CellInfo {
  id: string;
  colSpan: number;
  rowSpan: number;
}

/**
 * 트리의 최대 깊이 계산 (리프 = 1)
 */
function getTreeDepth(col: ColumnDef): number {
  if (!col.columns || col.columns.length === 0) return 1;
  return 1 + Math.max(...col.columns.map(getTreeDepth));
}

/**
 * 컬럼의 전체 트리 최대 깊이 계산
 */
function getMaxDepth(cols: ColumnDef[]): number {
  if (cols.length === 0) return 0;
  return Math.max(...cols.map(getTreeDepth));
}

/**
 * 리프(말단 컬럼) 수 계산
 */
function countLeaves(col: ColumnDef): number {
  if (!col.columns || col.columns.length === 0) return 1;
  return col.columns.reduce((sum, child) => sum + countLeaves(child), 0);
}

/**
 * TRD ColumnDef[] 트리에서 기대 colSpan/rowSpan 행렬 계산
 *
 * 반환 값은 2D 배열:
 * - matrix[rowIndex][colIndex] = { id, colSpan, rowSpan }
 * - 행 수 = 트리의 최대 깊이
 * - 각 행에서 colSpan이 2 이상인 그룹은 자식 leaf 수로 계산
 * - rowSpan이 2 이상인 셀은 그 깊이가 남은 행 수로 계산 (비대칭 트리)
 *
 * @param cols TRD ColumnDef 트리
 * @returns 행 × 열 CellInfo 2D 배열
 */
export function getExpectedMatrix(cols: ColumnDef[]): CellInfo[][] {
  const maxDepth = getMaxDepth(cols);
  if (maxDepth === 0) return [];

  const matrix: CellInfo[][] = Array.from({ length: maxDepth }, () => []);

  function traverse(col: ColumnDef, rowIndex: number): void {
    const remainingRows = maxDepth - rowIndex;

    if (!col.columns || col.columns.length === 0) {
      // 리프 노드 - rowSpan은 남은 행 전체
      matrix[rowIndex]!.push({
        id: col.id,
        colSpan: 1,
        rowSpan: remainingRows,
      });
    } else {
      // 그룹 노드
      matrix[rowIndex]!.push({
        id: col.id,
        colSpan: countLeaves(col),
        rowSpan: 1,
      });
      // 자식 순회
      for (const child of col.columns) {
        traverse(child, rowIndex + 1);
      }
    }
  }

  for (const col of cols) {
    traverse(col, 0);
  }

  return matrix;
}
