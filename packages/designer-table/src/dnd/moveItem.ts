/**
 * moveItem: pure reducer — splice 기반 컬럼 순서 이동
 * TSK-05-02 설계 결정 3: leaf header 전용, group header 불변
 *
 * @param order 현재 컬럼 ID 배열
 * @param fromId 이동할 컬럼 ID
 * @param toId 목적지 컬럼 ID
 * @returns 새로운 컬럼 ID 배열 (원본 변경 없음)
 */
export function moveItem(order: string[], fromId: string, toId: string): string[] {
  const fromIdx = order.indexOf(fromId);
  const toIdx = order.indexOf(toId);

  // 존재하지 않는 ID → 원본 그대로
  if (fromIdx === -1 || toIdx === -1) return order;

  // 같은 위치 → 원본 그대로
  if (fromIdx === toIdx) return order;

  const result = [...order];
  const [removed] = result.splice(fromIdx, 1);
  result.splice(toIdx, 0, removed!);
  return result;
}
