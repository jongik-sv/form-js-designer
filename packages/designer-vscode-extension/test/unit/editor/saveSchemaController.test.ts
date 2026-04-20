/**
 * saveSchemaController.test.ts — TSK-02-04
 *
 * handleSaveSchema(message, deps) — 저장 트랜잭션 오케스트레이터 단위 테스트.
 * 8+ 케이스:
 *   1. 정상 저장 (버전 일치)
 *   2. 버전 불일치 + 덮어쓰기 선택
 *   3. 버전 불일치 + 취소
 *   4. fence 미발견 (FenceNotFoundError)
 *   5. applyEdit 실패 (false 반환)
 *   6. applyEdit throw
 *   7. inFlightSaveToken — clearSaveInFlight finally 보장
 *   8. openTextDocument 실패
 */
import { describe, it, expect, vi } from 'vitest';
import { handleSaveSchema } from '../../../src/editor/saveSchemaController';
import type { SaveSchemaDeps } from '../../../src/editor/saveSchemaController';
import type { SaveSchemaMessage } from '../../../src/shared/messages';

/** 테스트용 최소 TextDocument mock */
function makeDoc(version: number, lines: string[] = []) {
  return {
    version,
    lineCount: lines.length || 3,
    lineAt: (n: number) => ({ text: lines[n] ?? '  "type": "default"' }),
    uri: { toString: () => 'file:///test.md' },
  };
}

/** 기본 SaveSchemaMessage */
function makeMsg(overrides?: Partial<SaveSchemaMessage>): SaveSchemaMessage {
  return {
    type: 'save-schema',
    uri: 'file:///test.md',
    mdStart: 1,
    mdEnd: 5,
    schema: '{"type":"default","components":[]}',
    docVersion: 3,
    ...overrides,
  };
}

/** 기본 deps 팩토리 */
function makeDeps(overrides?: Partial<SaveSchemaDeps>): SaveSchemaDeps {
  const doc = makeDoc(3);
  const range = { start: { line: 2, character: 0 }, end: { line: 4, character: 10 } };
  const edit = { _replacements: [] };

  return {
    openTextDocument: vi.fn().mockResolvedValue(doc),
    applyEdit: vi.fn().mockResolvedValue(true),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    locateFenceBody: vi.fn().mockReturnValue(range),
    replaceFenceBody: vi.fn().mockResolvedValue(edit),
    onResult: vi.fn(),
    onSourceUpdate: vi.fn(),
    markSaveInFlight: vi.fn(),
    clearSaveInFlight: vi.fn(),
    ...overrides,
  };
}

describe('handleSaveSchema', () => {
  // ── 1. 정상 저장 (버전 일치) ──────────────────────

  it('버전이 일치하면 applyEdit을 호출하고 ok:true를 반환한다', async () => {
    const deps = makeDeps();
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);

    expect(deps.applyEdit).toHaveBeenCalledOnce();
    expect(deps.onResult).toHaveBeenCalledWith({ ok: true });
  });

  it('정상 저장 시 충돌 모달(showWarningMessage)이 호출되지 않는다', async () => {
    const deps = makeDeps();
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);
    expect(deps.showWarningMessage).not.toHaveBeenCalled();
  });

  it('정상 저장 시 markSaveInFlight, clearSaveInFlight가 쌍으로 호출된다', async () => {
    const deps = makeDeps();
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);
    expect(deps.markSaveInFlight).toHaveBeenCalledOnce();
    expect(deps.clearSaveInFlight).toHaveBeenCalledOnce();
  });

  // ── 2. 버전 불일치 + 덮어쓰기 ────────────────────

  it('버전 불일치 시 충돌 모달을 띄우고, 덮어쓰기 선택 시 applyEdit을 호출한다', async () => {
    const doc = makeDoc(5); // 현재 버전 5, webview는 3을 보냄
    const deps = makeDeps({
      openTextDocument: vi.fn().mockResolvedValue(doc),
      showWarningMessage: vi.fn().mockResolvedValue('덮어쓰기'),
    });
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);

    expect(deps.showWarningMessage).toHaveBeenCalledOnce();
    expect(deps.applyEdit).toHaveBeenCalledOnce();
    expect(deps.onResult).toHaveBeenCalledWith({ ok: true });
  });

  // ── 3. 버전 불일치 + 취소 ────────────────────────

  it('버전 불일치 + 취소 선택 시 applyEdit 호출 없이 ok:false, error:cancelled를 반환한다', async () => {
    const doc = makeDoc(5);
    const deps = makeDeps({
      openTextDocument: vi.fn().mockResolvedValue(doc),
      showWarningMessage: vi.fn().mockResolvedValue('취소'),
    });
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);

    expect(deps.applyEdit).not.toHaveBeenCalled();
    expect(deps.onResult).toHaveBeenCalledWith({ ok: false, error: 'cancelled' });
  });

  it('버전 불일치 + dismiss(undefined) 시 ok:false, error:cancelled를 반환한다', async () => {
    const doc = makeDoc(5);
    const deps = makeDeps({
      openTextDocument: vi.fn().mockResolvedValue(doc),
      showWarningMessage: vi.fn().mockResolvedValue(undefined),
    });
    await handleSaveSchema(makeMsg({ docVersion: 3 }), deps);

    expect(deps.applyEdit).not.toHaveBeenCalled();
    expect(deps.onResult).toHaveBeenCalledWith({ ok: false, error: 'cancelled' });
  });

  // ── 4. fence 미발견 ───────────────────────────────

  it('locateFenceBody가 FenceNotFoundError를 throw하면 applyEdit 없이 ok:false를 반환한다', async () => {
    const { FenceNotFoundError } = await import('../../../src/editor/blockLocator');
    const deps = makeDeps({
      locateFenceBody: vi.fn().mockImplementation(() => {
        throw new FenceNotFoundError();
      }),
    });
    await handleSaveSchema(makeMsg(), deps);

    expect(deps.applyEdit).not.toHaveBeenCalled();
    expect(deps.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.stringContaining('fence') })
    );
  });

  // ── 5. applyEdit 실패 (false 반환) ───────────────

  it('applyEdit이 false를 반환하면 ok:false를 반환하고 clearSaveInFlight를 호출한다', async () => {
    const deps = makeDeps({
      applyEdit: vi.fn().mockResolvedValue(false),
    });
    await handleSaveSchema(makeMsg(), deps);

    expect(deps.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
    expect(deps.clearSaveInFlight).toHaveBeenCalledOnce();
  });

  // ── 6. applyEdit throw ───────────────────────────

  it('applyEdit이 throw하면 ok:false, error에 메시지 포함, clearSaveInFlight 호출된다', async () => {
    const deps = makeDeps({
      applyEdit: vi.fn().mockRejectedValue(new Error('disk full')),
    });
    await handleSaveSchema(makeMsg(), deps);

    expect(deps.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: expect.stringContaining('disk full') })
    );
    expect(deps.clearSaveInFlight).toHaveBeenCalledOnce();
  });

  // ── 7. inFlightSaveToken — clearSaveInFlight finally 보장 ──

  it('applyEdit 성공 후에도 clearSaveInFlight가 반드시 호출된다', async () => {
    const deps = makeDeps();
    await handleSaveSchema(makeMsg(), deps);
    expect(deps.clearSaveInFlight).toHaveBeenCalledOnce();
  });

  it('applyEdit throw 후에도 clearSaveInFlight가 호출된다 (finally 보장)', async () => {
    const deps = makeDeps({
      applyEdit: vi.fn().mockRejectedValue(new Error('err')),
    });
    await handleSaveSchema(makeMsg(), deps);
    expect(deps.clearSaveInFlight).toHaveBeenCalledOnce();
  });

  // ── 8. openTextDocument 실패 ─────────────────────

  it('openTextDocument가 throw하면 ok:false를 반환한다', async () => {
    const deps = makeDeps({
      openTextDocument: vi.fn().mockRejectedValue(new Error('file not found')),
    });
    await handleSaveSchema(makeMsg(), deps);

    expect(deps.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
  });
});
