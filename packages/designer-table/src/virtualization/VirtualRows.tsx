/**
 * VirtualRows: viewport 렌더 컴포넌트
 * paddingTop/paddingBottom 계산 + 절대 포지셔닝 행
 * features.virtualization===false 시 일반 렌더로 fallback
 */
import { h, Fragment } from 'preact';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { Row } from '@tanstack/react-table';
import type { ComponentChildren } from 'preact';

interface VirtualRowsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  virtualizer: Virtualizer<HTMLDivElement, HTMLElement>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Row<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderRow: (row: Row<any>, virtualIndex: number) => ComponentChildren;
}

export function VirtualRows({ virtualizer, rows, renderRow }: VirtualRowsProps) {
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // 가상 스크롤 패딩 계산
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  return (
    <>
      {paddingTop > 0 && (
        <tr>
          <td style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }} />
        </tr>
      )}
      {virtualItems.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) return null;
        return (
          <Fragment key={row.id}>
            {renderRow(row, virtualRow.index)}
          </Fragment>
        );
      })}
      {paddingBottom > 0 && (
        <tr>
          <td style={{ height: `${paddingBottom}px`, padding: 0, border: 'none' }} />
        </tr>
      )}
    </>
  );
}
