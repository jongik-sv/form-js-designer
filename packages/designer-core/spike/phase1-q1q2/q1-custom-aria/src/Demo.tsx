import { Dialog } from './custom/Dialog';

export function Demo() {
  return (
    <section aria-labelledby="demo-title">
      <h2 id="demo-title">Dialog (자작 WAI-ARIA)</h2>
      <p>라이브러리 의존 없이 Dialog 한 종만 WAI-ARIA Authoring Practices 규약대로 구현.</p>
      <Dialog
        title="예시 모달"
        description="ESC 또는 오버레이 클릭으로 닫힙니다."
        trigger={(t) => (
          <button
            type="button"
            data-testid="dialog-trigger"
            onClick={t.onClick}
            aria-haspopup={t['aria-haspopup']}
            aria-expanded={t['aria-expanded']}
            ref={t.ref}
          >
            열기
          </button>
        )}
      >
        {(close) => (
          <>
            <label>
              <span>이름</span>
              <input type="text" data-testid="dialog-input" placeholder="입력해 주세요" />
            </label>
            <div class="caria-actions">
              <button type="button" onClick={close} data-testid="dialog-close">
                닫기
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}
