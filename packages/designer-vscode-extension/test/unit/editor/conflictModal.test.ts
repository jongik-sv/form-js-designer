/**
 * conflictModal.test.ts — TSK-02-04
 *
 * conflictModal.showConflictModal() — showWarningMessage 호출 인자 검증 및
 * 사용자 응답('덮어쓰기' / '취소' / undefined dismiss)을 'overwrite' | 'cancel' 로 매핑.
 */
import { describe, it, expect, vi } from 'vitest';
import { showConflictModal } from '../../../src/editor/conflictModal';

describe('showConflictModal', () => {
  it('showWarningMessage를 modal:true 옵션으로 호출한다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue(undefined);
    await showConflictModal(showWarningMessage);
    expect(showWarningMessage).toHaveBeenCalledOnce();
    const args = showWarningMessage.mock.calls[0] as unknown[];
    // 두 번째 인자에 modal: true 포함
    expect(args[1]).toMatchObject({ modal: true });
  });

  it('showWarningMessage 메시지 텍스트가 외부 변경 관련 내용을 포함한다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue(undefined);
    await showConflictModal(showWarningMessage);
    const args = showWarningMessage.mock.calls[0] as unknown[];
    expect(typeof args[0]).toBe('string');
    expect(args[0]).toContain('외부에서 변경');
  });

  it('showWarningMessage에 detail 문자열이 포함된다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue(undefined);
    await showConflictModal(showWarningMessage);
    const args = showWarningMessage.mock.calls[0] as unknown[];
    const opts = args[1] as { modal?: boolean; detail?: string };
    expect(typeof opts.detail).toBe('string');
    expect(opts.detail!.length).toBeGreaterThan(0);
  });

  it('버튼이 "덮어쓰기"와 "취소" 두 개이다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue(undefined);
    await showConflictModal(showWarningMessage);
    const args = showWarningMessage.mock.calls[0] as unknown[];
    expect(args).toContain('덮어쓰기');
    expect(args).toContain('취소');
  });

  it('"덮어쓰기" 선택 시 "overwrite"를 반환한다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue('덮어쓰기');
    const result = await showConflictModal(showWarningMessage);
    expect(result).toBe('overwrite');
  });

  it('"취소" 선택 시 "cancel"을 반환한다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue('취소');
    const result = await showConflictModal(showWarningMessage);
    expect(result).toBe('cancel');
  });

  it('dismiss(undefined) 시 "cancel"을 반환한다', async () => {
    const showWarningMessage = vi.fn().mockResolvedValue(undefined);
    const result = await showConflictModal(showWarningMessage);
    expect(result).toBe('cancel');
  });
});
