/**
 * useColumnReorder: dnd-kit 기반 컬럼 순서 이동 훅
 * leaf header 전용 드래그 (group header 불변)
 * TSK-05-02 설계 결정 3
 *
 * NOTE: 이 파일은 React hooks를 사용하므로 preact/compat alias 환경에서 동작한다.
 * happy-dom 테스트 환경에서는 useColumnReorder을 직접 호출하지 않는다
 * (unit test는 moveItem pure reducer를 직접 테스트, E2E에서 dnd 검증).
 */
import { useMemo } from 'react';
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { moveItem } from './moveItem';

interface UseColumnReorderOptions {
  leafColumnIds: string[];
  columnOrder: string[];
  setColumnOrder: (updater: (prev: string[]) => string[]) => void;
}

interface UseColumnReorderResult {
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  leafIds: string[];
}

export function useColumnReorder({
  leafColumnIds,
  columnOrder,
  setColumnOrder,
}: UseColumnReorderOptions): UseColumnReorderResult {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const leafIds = useMemo(() => {
    // columnOrder가 있으면 그 순서대로, 없으면 leafColumnIds 순서
    if (columnOrder.length > 0) {
      return columnOrder.filter((id) => leafColumnIds.includes(id));
    }
    return leafColumnIds;
  }, [columnOrder, leafColumnIds]);

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setColumnOrder((prev) => {
      const order = prev.length > 0 ? prev : leafColumnIds;
      return moveItem(order, activeId, overId);
    });
  }

  return { sensors, onDragEnd, leafIds };
}
