import { h } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';

export interface OverlayLayerProps {
  formRoot: HTMLElement;
  selectedIds: readonly string[];
}

interface Box {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

export function OverlayLayer({ formRoot, selectedIds }: OverlayLayerProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);

  useLayoutEffect(() => {
    const sync = () => {
      const rootRect = formRoot.getBoundingClientRect();
      const next: Box[] = [];
      for (const id of selectedIds) {
        const el = formRoot.querySelector<HTMLElement>(`[data-fjs-id="${CSS.escape(id)}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next.push({
          id,
          left: r.left - rootRect.left,
          top: r.top - rootRect.top,
          width: r.width,
          height: r.height,
        });
      }
      setBoxes(next);
    };

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(formRoot);
    formRoot.querySelectorAll('[data-fjs-id]').forEach((el) => ro.observe(el as HTMLElement));
    window.addEventListener('resize', sync);
    const raf = requestAnimationFrame(sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
      cancelAnimationFrame(raf);
    };
  }, [formRoot, selectedIds.join('|')]);

  return (
    <div class="fjs-designer-overlay" data-testid="overlay">
      {boxes.map((b) => (
        <div
          key={b.id}
          class="fjs-designer-overlay-selection"
          style={{
            transform: `translate(${b.left}px, ${b.top}px)`,
            width: `${b.width}px`,
            height: `${b.height}px`,
          }}
        >
          {HANDLES.map((dir) => (
            <div
              key={dir}
              class={`fjs-designer-overlay-handle fjs-designer-overlay-handle--${dir}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
