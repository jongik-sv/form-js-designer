import { useId } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import * as dialog from '@zag-js/dialog';
import * as tabs from '@zag-js/tabs';
import * as popover from '@zag-js/popover';
import { useMachine, normalizeProps } from './zag-preact';

// ---- Dialog scenario ----
function DialogDemo() {
  const id = useId();
  const service = useMachine(dialog.machine, { id });
  const api = dialog.connect(service, normalizeProps);
  return (
    <section>
      <h2>1. Dialog</h2>
      <button {...(api.getTriggerProps() as any)} data-testid="dialog-trigger">
        열기
      </button>
      {api.open &&
        createPortal(
          <>
            <div {...(api.getBackdropProps() as any)} className="dialog-backdrop" data-testid="dialog-backdrop" />
            <div {...(api.getPositionerProps() as any)} className="dialog-positioner">
              <div
                {...(api.getContentProps() as any)}
                className="dialog-content"
                data-testid="dialog-content"
              >
                <h3 {...(api.getTitleProps() as any)}>다이얼로그 제목</h3>
                <p {...(api.getDescriptionProps() as any)}>
                  본문입니다. ESC 또는 backdrop click 으로 닫힙니다.
                </p>
                <label style={{ display: 'block', marginTop: 12 }}>
                  입력값
                  <input
                    type="text"
                    data-testid="dialog-input"
                    style={{ display: 'block', marginTop: 4, padding: 6, width: '100%' }}
                  />
                </label>
                <button
                  {...(api.getCloseTriggerProps() as any)}
                  data-testid="dialog-close"
                  style={{ marginTop: 16 }}
                >
                  닫기
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </section>
  );
}

// ---- Tabs scenario ----
function TabsDemo() {
  const id = useId();
  const service = useMachine(tabs.machine, { id, defaultValue: 'a' });
  const api = tabs.connect(service, normalizeProps);
  return (
    <section>
      <h2>2. Tabs</h2>
      <div {...(api.getRootProps() as any)} data-testid="tabs-root">
        <div {...(api.getListProps() as any)} className="tabs-list" aria-label="예시 탭">
          <button
            {...(api.getTriggerProps({ value: 'a' }) as any)}
            className="tabs-trigger"
            data-testid="tab-a"
          >
            탭 A
          </button>
          <button
            {...(api.getTriggerProps({ value: 'b' }) as any)}
            className="tabs-trigger"
            data-testid="tab-b"
          >
            탭 B
          </button>
          <button
            {...(api.getTriggerProps({ value: 'c' }) as any)}
            className="tabs-trigger"
            data-testid="tab-c"
          >
            탭 C
          </button>
        </div>
        <div {...(api.getContentProps({ value: 'a' }) as any)} className="tabs-content">
          A 패널 내용
        </div>
        <div {...(api.getContentProps({ value: 'b' }) as any)} className="tabs-content">
          B 패널 내용
        </div>
        <div {...(api.getContentProps({ value: 'c' }) as any)} className="tabs-content">
          C 패널 내용
        </div>
      </div>
    </section>
  );
}

// ---- Popover scenario ----
function PopoverDemo() {
  const id = useId();
  const service = useMachine(popover.machine, { id });
  const api = popover.connect(service, normalizeProps);
  return (
    <section>
      <h2>3. Popover</h2>
      <button
        {...(api.getTriggerProps() as any)}
        data-testid="popover-trigger"
        aria-label="예시 popover 열기"
      >
        툴팁 열기
      </button>
      {api.open &&
        createPortal(
          <div {...(api.getPositionerProps() as any)} className="popover-positioner">
            <div
              {...(api.getContentProps() as any)}
              className="popover-content"
              data-testid="popover-content"
              aria-label="예시 popover"
            >
              Popover 내용 — 바깥 클릭 시 닫힘
              <div {...(api.getArrowProps() as any)}>
                <div {...(api.getArrowTipProps() as any)} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

export function Demo() {
  return (
    <main>
      <DialogDemo />
      <TabsDemo />
      <PopoverDemo />
    </main>
  );
}
