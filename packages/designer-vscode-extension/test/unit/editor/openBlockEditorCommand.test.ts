import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editSessionRegistry } from '../../../src/editor/editSession';
import { pendingEditSchemas } from '../../../src/editor/openBlockEditorCommand';

// openBlockEditorCommand는 내부에서 require('vscode')를 동적으로 호출한다.
// vi.mock으로 vscode를 모킹하여 executeCommand 호출을 추적한다.
const executeCommandMock = vi.fn().mockResolvedValue(undefined);
const revealMock = vi.fn();

vi.mock('vscode', () => ({
  ViewColumn: { Beside: 2 },
  Uri: {
    parse: (s: string) => ({ toString: () => s, fsPath: s }),
    file: (s: string) => ({ toString: () => `file://${s}`, fsPath: s }),
  },
  commands: {
    executeCommand: executeCommandMock,
  },
  window: {
    registerCustomEditorProvider: vi.fn(),
  },
}));

describe('openBlockEditorCommand', () => {
  beforeEach(() => {
    editSessionRegistry.disposeAll();
    pendingEditSchemas.clear();
    executeCommandMock.mockClear();
    revealMock.mockClear();
    executeCommandMock.mockResolvedValue(undefined);
  });

  async function importCmd() {
    const mod = await import('../../../src/editor/openBlockEditorCommand');
    return mod.openBlockEditorCommand;
  }

  const baseArgs = {
    uri: 'file:///test.md',
    mdStart: 0,
    mdEnd: 10,
    schema: '{"type":"default","components":[]}',
  };

  it('세션이 없을 때 pendingEditSchemas에 schema를 stash한다', async () => {
    const cmd = await importCmd();
    await cmd(baseArgs);
    expect(pendingEditSchemas.get(baseArgs.uri)).toEqual({
      mdStart: baseArgs.mdStart,
      mdEnd: baseArgs.mdEnd,
      schema: baseArgs.schema,
    });
  });

  it('세션이 없을 때 vscode.openWith를 form-js.block-editor viewType으로 호출한다', async () => {
    const cmd = await importCmd();
    await cmd(baseArgs);
    expect(executeCommandMock).toHaveBeenCalledWith(
      'vscode.openWith',
      expect.anything(),
      'form-js.block-editor',
      2 // ViewColumn.Beside
    );
  });

  it('viewColumn은 반드시 ViewColumn.Beside(2)이다', async () => {
    const cmd = await importCmd();
    await cmd(baseArgs);
    const callArgs = executeCommandMock.mock.calls[0];
    expect(callArgs?.[3]).toBe(2);
  });

  it('이미 활성 세션이 있으면 vscode.openWith를 호출하지 않는다 (single-editor lock)', async () => {
    const mockPanel = { dispose: vi.fn(), reveal: revealMock };
    editSessionRegistry.beginSession({
      uri: baseArgs.uri,
      mdStart: baseArgs.mdStart,
      mdEnd: baseArgs.mdEnd,
      panel: mockPanel,
    });

    const cmd = await importCmd();
    await cmd(baseArgs);

    expect(executeCommandMock).not.toHaveBeenCalled();
  });

  it('이미 활성 세션이 있으면 panel.reveal()을 호출하여 기존 패널로 포커스한다', async () => {
    const mockPanel = { dispose: vi.fn(), reveal: revealMock };
    editSessionRegistry.beginSession({
      uri: baseArgs.uri,
      mdStart: 0,
      mdEnd: 10,
      panel: mockPanel,
    });

    const cmd = await importCmd();
    await cmd(baseArgs);

    expect(revealMock).toHaveBeenCalled();
  });

  it('openWith 실패 시 pendingEditSchemas stash를 rollback한다', async () => {
    executeCommandMock.mockRejectedValueOnce(new Error('open failed'));

    const cmd = await importCmd();
    await expect(cmd(baseArgs)).rejects.toThrow('open failed');

    expect(pendingEditSchemas.has(baseArgs.uri)).toBe(false);
  });

  it('openWith 성공 후 pendingEditSchemas에 stash가 유지된다 (provider가 consume)', async () => {
    const cmd = await importCmd();
    await cmd(baseArgs);
    // provider.resolveCustomTextEditor가 consume하기 전까지 stash는 남아있음
    expect(pendingEditSchemas.has(baseArgs.uri)).toBe(true);
  });
});
