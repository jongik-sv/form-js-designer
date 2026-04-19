/**
 * Row 관련 공유 타입 — TSK-12-03
 * designer-core와 designer-runtime 양쪽에서 사용 가능한 최소 타입 정의.
 */

export interface RowLike {
  id: string;
  components: string[];
}
