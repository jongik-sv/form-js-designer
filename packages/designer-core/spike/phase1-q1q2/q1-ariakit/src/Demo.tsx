import { useState } from 'preact/hooks';
import * as Ariakit from '@ariakit/react';

export function Demo() {
  return (
    <main>
      <DialogSection />
      <TabsSection />
      <PopoverSection />
      <div id="status" data-testid="status">
        ready
      </div>
    </main>
  );
}

function DialogSection() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="dialog-heading">
      <h2 id="dialog-heading">Dialog</h2>
      <button data-testid="dialog-trigger" onClick={() => setOpen(true)}>
        열기
      </button>
      <Ariakit.Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="ak-dialog"
        backdrop={<div className="ak-dialog-backdrop" />}
        data-testid="dialog-panel"
        aria-labelledby="dialog-title"
      >
        <Ariakit.DialogHeading id="dialog-title">모달 제목</Ariakit.DialogHeading>
        <p>모달 내용 — 포커스 트랩이 동작해야 한다.</p>
        <label>
          이름
          <input data-testid="dialog-input" aria-label="이름" />
        </label>
        <div style={{ marginTop: 12 }}>
          <button data-testid="dialog-close" onClick={() => setOpen(false)}>
            닫기
          </button>
        </div>
      </Ariakit.Dialog>
    </section>
  );
}

function TabsSection() {
  const labels = ['탭 A', '탭 B', '탭 C'];
  const ids = ['A', 'B', 'C'];
  return (
    <section aria-labelledby="tabs-heading">
      <h2 id="tabs-heading">Tabs</h2>
      <div data-testid="tabs-root">
        <Ariakit.TabProvider defaultSelectedId="A">
          <Ariakit.TabList aria-label="샘플 탭">
            {labels.map((label, idx) => (
              <Ariakit.Tab key={label} id={ids[idx]} data-testid={`tab-${label}`}>
                {label}
              </Ariakit.Tab>
            ))}
          </Ariakit.TabList>
          <Ariakit.TabPanel tabId="A" data-testid="panel-A">
            A 패널 내용
          </Ariakit.TabPanel>
          <Ariakit.TabPanel tabId="B" data-testid="panel-B">
            B 패널 내용
          </Ariakit.TabPanel>
          <Ariakit.TabPanel tabId="C" data-testid="panel-C">
            C 패널 내용
          </Ariakit.TabPanel>
        </Ariakit.TabProvider>
      </div>
    </section>
  );
}

function PopoverSection() {
  return (
    <section aria-labelledby="popover-heading">
      <h2 id="popover-heading">Popover</h2>
      <Ariakit.PopoverProvider>
        <Ariakit.PopoverDisclosure data-testid="popover-trigger">
          툴팁 열기
        </Ariakit.PopoverDisclosure>
        <Ariakit.Popover
          className="ak-popover"
          data-testid="popover-panel"
          aria-label="도움말 팝오버"
        >
          <p>팝오버 내용 — 바깥 클릭으로 닫힘.</p>
          <button>도움말</button>
        </Ariakit.Popover>
      </Ariakit.PopoverProvider>
    </section>
  );
}
