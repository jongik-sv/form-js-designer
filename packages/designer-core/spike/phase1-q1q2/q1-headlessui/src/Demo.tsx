import { useState } from 'preact/hooks';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';

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
      <Transition appear show={open}>
        <Dialog onClose={() => setOpen(false)} className="hl-dialog-root">
          <TransitionChild
            enter="ease-out duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="hl-dialog-overlay" aria-hidden="true" />
          </TransitionChild>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TransitionChild
              enter="ease-out duration-100"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="hl-dialog-panel" data-testid="dialog-panel">
                <DialogTitle>모달 제목</DialogTitle>
                <p>모달 내용 — 포커스 트랩이 동작해야 한다.</p>
                <label>
                  이름
                  <input data-testid="dialog-input" aria-label="이름" />
                </label>
                <div style={{ marginTop: 12 }}>
                  <button
                    data-testid="dialog-close"
                    onClick={() => setOpen(false)}
                  >
                    닫기
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </section>
  );
}

function TabsSection() {
  const labels = ['탭 A', '탭 B', '탭 C'];
  return (
    <section aria-labelledby="tabs-heading">
      <h2 id="tabs-heading">Tabs</h2>
      <div data-testid="tabs-root">
        <TabGroup>
          <TabList>
            {labels.map((l) => (
              <Tab key={l} data-testid={`tab-${l}`}>
                {l}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            <TabPanel data-testid="panel-A">A 패널 내용</TabPanel>
            <TabPanel data-testid="panel-B">B 패널 내용</TabPanel>
            <TabPanel data-testid="panel-C">C 패널 내용</TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </section>
  );
}

function PopoverSection() {
  return (
    <section aria-labelledby="popover-heading">
      <h2 id="popover-heading">Popover</h2>
      <Popover>
        <PopoverButton data-testid="popover-trigger">툴팁 열기</PopoverButton>
        <PopoverPanel
          anchor="bottom"
          className="pop-panel"
          data-testid="popover-panel"
        >
          <p>팝오버 내용 — 바깥 클릭으로 닫힘.</p>
          <button>도움말</button>
        </PopoverPanel>
      </Popover>
    </section>
  );
}
