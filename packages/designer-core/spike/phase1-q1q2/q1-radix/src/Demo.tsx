import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Popover from '@radix-ui/react-popover';

export function Demo() {
  return (
    <main>
      <section>
        <h2>1. Dialog</h2>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button data-testid="dialog-trigger">열기</button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content" data-testid="dialog-content">
              <Dialog.Title>다이얼로그 제목</Dialog.Title>
              <Dialog.Description>본문입니다. ESC 또는 Overlay click 으로 닫힙니다.</Dialog.Description>
              <label style={{ display: 'block', marginTop: 12 }}>
                입력값
                <input
                  type="text"
                  data-testid="dialog-input"
                  style={{ display: 'block', marginTop: 4, padding: 6, width: '100%' }}
                />
              </label>
              <Dialog.Close asChild>
                <button data-testid="dialog-close" style={{ marginTop: 16 }}>닫기</button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>

      <section>
        <h2>2. Tabs</h2>
        <Tabs.Root defaultValue="a" data-testid="tabs-root">
          <Tabs.List className="tabs-list" aria-label="예시 탭">
            <Tabs.Trigger className="tabs-trigger" value="a" data-testid="tab-a">탭 A</Tabs.Trigger>
            <Tabs.Trigger className="tabs-trigger" value="b" data-testid="tab-b">탭 B</Tabs.Trigger>
            <Tabs.Trigger className="tabs-trigger" value="c" data-testid="tab-c">탭 C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content className="tabs-content" value="a">A 패널 내용</Tabs.Content>
          <Tabs.Content className="tabs-content" value="b">B 패널 내용</Tabs.Content>
          <Tabs.Content className="tabs-content" value="c">C 패널 내용</Tabs.Content>
        </Tabs.Root>
      </section>

      <section>
        <h2>3. Popover</h2>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button data-testid="popover-trigger">툴팁 열기</button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="popover-content"
              data-testid="popover-content"
              sideOffset={6}
              aria-label="예시 popover"
            >
              Popover 내용 — 바깥 클릭 시 닫힘
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </section>
    </main>
  );
}
