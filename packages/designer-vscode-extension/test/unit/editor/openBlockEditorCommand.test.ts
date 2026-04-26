import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editSessionRegistry } from '../../../src/editor/editSession';
import { pendingEditSchemas } from '../../../src/editor/openBlockEditorCommand';
import * as vscode from 'vscode';

// openBlockEditorCommand는 내부에서 import * as vscode from 'vscode'를 사용한다.
// vi.mock 팩토리는 호이스팅되므로 외부 변수 참조 금지 — vi.fn()을 직접 사용한다.
vi.mock('vscode', () => ({
  ViewColumn: { Beside: 2 },
  Uri: {
    parse: (s: string) => ({ toString: () => s, fsPath: s }),
    file: (s: string) => ({ toString: () => `file://${s}`, fsPath: s }),
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
  window: {
    registerCustomEditorProvider: vi.fn(),
  },
  workspace: {
    openTextDocument: vi.fn(async () => ({
      lineCount: 5,
      lineAt: (n: number) => ({
        text: [
          '# header',
          '```form-js',
          '{"type":"default","components":[]}',
          '```',
          '',
        ][n] ?? '',
      }),
      getText: (_range?: unknown) => '{"type":"default","components":[]}',
    })),
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Range: class {
    constructor(public start: unknown, public end: unknown) {}
  },
}));

// 모킹된 vscode.commands.executeCommand 참조
function getExecuteCommandMock() {
  return vi.mocked(vscode.commands.executeCommand);
}

describe('openBlockEditorCommand', () => {
  let revealMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    editSessionRegistry.disposeAll();
    pendingEditSchemas.clear();
    revealMock = vi.fn();
    getExecuteCommandMock().mockClear();
    getExecuteCommandMock().mockResolvedValue(undefined);
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
    expect(getExecuteCommandMock()).toHaveBeenCalledWith(
      'vscode.openWith',
      expect.anything(),
      'form-js.block-editor',
      2 // ViewColumn.Beside
    );
  });

  it('viewColumn은 반드시 ViewColumn.Beside(2)이다', async () => {
    const cmd = await importCmd();
    await cmd(baseArgs);
    const callArgs = getExecuteCommandMock().mock.calls[0];
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

    expect(getExecuteCommandMock()).not.toHaveBeenCalled();
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

  it('같은 블록(mdStart/mdEnd 일치)은 edit-opened를 재전송하지 않는다', async () => {
    const postMessageMock = vi.fn();
    const mockPanel = {
      dispose: vi.fn(),
      reveal: revealMock,
      webview: { postMessage: postMessageMock },
    };
    editSessionRegistry.beginSession({
      uri: baseArgs.uri,
      mdStart: baseArgs.mdStart,
      mdEnd: baseArgs.mdEnd,
      panel: mockPanel,
    });

    const cmd = await importCmd();
    await cmd(baseArgs);

    expect(postMessageMock).not.toHaveBeenCalled();
    expect(revealMock).toHaveBeenCalled();
  });

  it('다른 블록 클릭 시 기존 세션의 mdStart/mdEnd를 갱신하고 edit-opened를 재전송한다', async () => {
    const postMessageMock = vi.fn();
    const mockPanel = {
      dispose: vi.fn(),
      reveal: revealMock,
      webview: { postMessage: postMessageMock },
    };
    editSessionRegistry.beginSession({
      uri: baseArgs.uri,
      mdStart: 0,
      mdEnd: 10,
      panel: mockPanel,
    });

    const cmd = await importCmd();
    await cmd({ ...baseArgs, mdStart: 20, mdEnd: 30 });

    // 세션 블록 정보가 새 클릭 대상으로 갱신됨
    const updated = editSessionRegistry.getActive(baseArgs.uri);
    expect(updated?.mdStart).toBe(20);
    expect(updated?.mdEnd).toBe(30);

    // 새 schema로 edit-opened 재전송
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'edit-opened',
        mdStart: 20,
        mdEnd: 30,
        schema: baseArgs.schema,
      })
    );

    // reveal도 호출됨
    expect(revealMock).toHaveBeenCalled();

    // 새 패널을 여는 vscode.openWith는 호출되지 않음 (single-editor lock)
    expect(getExecuteCommandMock()).not.toHaveBeenCalled();
  });

  it('openWith 실패 시 pendingEditSchemas stash를 rollback한다', async () => {
    getExecuteCommandMock().mockRejectedValueOnce(new Error('open failed'));

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

  it('schema 미제공 시 문서를 열어 locateFenceBody로 본문을 추출하여 stash한다', async () => {
    const cmd = await importCmd();
    await cmd({ uri: baseArgs.uri, mdStart: 1, mdEnd: 3 });
    const stashed = pendingEditSchemas.get(baseArgs.uri);
    expect(stashed).toBeDefined();
    // mock getText가 리턴하는 본문이 stash돼야 함
    expect(stashed!.schema).toBe('{"type":"default","components":[]}');
  });
});
