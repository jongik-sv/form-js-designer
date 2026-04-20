import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildHtml, generateNonce, FormJsBlockEditorProvider } from '../../../src/editor/customEditorProvider';
import { editSessionRegistry } from '../../../src/editor/editSession';
import { pendingEditSchemas } from '../../../src/editor/openBlockEditorCommand';

// customEditorProvider.ts 내부에서 require('vscode')를 동적으로 호출하므로
// vi.mock으로 CommonJS require도 가로채야 한다.
vi.mock('vscode', () => ({
  Uri: {
    file: (s: string) => ({
      toString: () => `file://${s}`,
      fsPath: s,
    }),
    joinPath: (base: { fsPath: string }, ...segs: string[]) => ({
      toString: () => `file://${base.fsPath}/${segs.join('/')}`,
      fsPath: `${base.fsPath}/${segs.join('/')}`,
    }),
    parse: (s: string) => ({ toString: () => s, fsPath: s }),
  },
  ViewColumn: { Beside: 2 },
  window: { registerCustomEditorProvider: vi.fn() },
  commands: { registerCommand: vi.fn(), executeCommand: vi.fn() },
}));

// Uri 팩토리는 vi.mock 내부 정의와 동일하게 인라인으로 사용
function makeUri(path: string) {
  return { toString: () => `file://${path}`, fsPath: path };
}

describe('generateNonce', () => {
  it('32자 alphanumeric 문자열을 반환한다', () => {
    const nonce = generateNonce();
    expect(nonce).toHaveLength(32);
    expect(/^[A-Za-z0-9]{32}$/.test(nonce)).toBe(true);
  });

  it('호출마다 다른 값을 반환한다', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).not.toBe(n2);
  });
});

describe('buildHtml', () => {
  const opts = {
    nonce: 'testNonce123',
    cspSource: 'vscode-webview-resource:',
    scriptUri: 'https://file+.vscode-resource.vscode-cdn.net/customEditor.js',
    styleUri: 'https://file+.vscode-resource.vscode-cdn.net/form-js-editor.css',
  };

  it('DOCTYPE과 html 태그를 포함한다', () => {
    const html = buildHtml(opts);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
  });

  it('CSP meta 태그에 nonce가 포함된다', () => {
    const html = buildHtml(opts);
    expect(html).toContain(`'nonce-${opts.nonce}'`);
  });

  it('CSP meta 태그에 cspSource가 포함된다', () => {
    const html = buildHtml(opts);
    expect(html).toContain(opts.cspSource);
  });

  it('script 태그에 nonce 속성과 src가 있다', () => {
    const html = buildHtml(opts);
    expect(html).toContain(`nonce="${opts.nonce}"`);
    expect(html).toContain(`src="${opts.scriptUri}"`);
  });

  it('inline script가 없다 (CSP 준수)', () => {
    const html = buildHtml(opts);
    // <script> 태그는 src 속성을 가진 외부 스크립트만 허용
    const inlineScriptPattern = /<script(?![^>]*\bsrc\b)[^>]*>[^<\s]/;
    expect(inlineScriptPattern.test(html)).toBe(false);
  });

  it('link rel=stylesheet 태그에 styleUri가 포함된다', () => {
    const html = buildHtml(opts);
    expect(html).toContain(`href="${opts.styleUri}"`);
  });

  it('#app 컨테이너가 포함된다', () => {
    const html = buildHtml(opts);
    expect(html).toContain('id="app"');
  });

  it("default-src 'none'이 포함된다 (CSP 기본 거부)", () => {
    const html = buildHtml(opts);
    expect(html).toContain("default-src 'none'");
  });
});

describe('FormJsBlockEditorProvider', () => {
  beforeEach(() => {
    editSessionRegistry.disposeAll();
    pendingEditSchemas.clear();
  });

  function makeWebviewPanel() {
    const postMessage = vi.fn().mockResolvedValue(undefined);
    const onDisposeCallbacks: Array<() => void> = [];

    return {
      webview: {
        options: {} as Record<string, unknown>,
        html: '',
        cspSource: 'vscode-webview-resource:',
        asWebviewUri: vi.fn((u: unknown) => ({ toString: () => `webview://${String(u)}` })),
        postMessage,
      },
      onDidDispose: vi.fn((cb: () => void) => {
        onDisposeCallbacks.push(cb);
        return { dispose: vi.fn() };
      }),
      dispose: vi.fn(),
      reveal: vi.fn(),
      _triggerDispose: () => onDisposeCallbacks.forEach(cb => cb()),
    };
  }

  function makeDocument(uriStr = 'file:///test.md') {
    return {
      uri: { toString: () => uriStr, fsPath: uriStr },
    };
  }

  function makeCancellationToken() {
    return { isCancellationRequested: false, onCancellationRequested: vi.fn() };
  }

  it('resolveCustomTextEditor: webview.html에 CSP nonce가 포함된다', async () => {
    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeWebviewPanel();
    const doc = makeDocument();

    await provider.resolveCustomTextEditor(
      doc as never,
      panel as never,
      makeCancellationToken() as never
    );

    expect(panel.webview.html).toContain("default-src 'none'");
    expect(panel.webview.html).toContain('nonce-');
  });

  it('resolveCustomTextEditor: pendingEditSchemas에서 schema를 consume한다', async () => {
    const uri = 'file:///test.md';
    pendingEditSchemas.set(uri, { mdStart: 5, mdEnd: 15, schema: '{"type":"default"}' });

    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeWebviewPanel();
    const doc = makeDocument(uri);

    await provider.resolveCustomTextEditor(doc as never, panel as never, makeCancellationToken() as never);

    expect(pendingEditSchemas.has(uri)).toBe(false);
  });

  it('resolveCustomTextEditor: EditSessionRegistry에 lock을 등록한다', async () => {
    const uri = 'file:///test.md';
    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeWebviewPanel();
    const doc = makeDocument(uri);

    await provider.resolveCustomTextEditor(doc as never, panel as never, makeCancellationToken() as never);

    expect(editSessionRegistry.getActive(uri)).toBeDefined();
  });

  it('resolveCustomTextEditor: 이미 lock이 있으면 panel.dispose()를 호출한다', async () => {
    const uri = 'file:///test.md';
    editSessionRegistry.beginSession({ uri, mdStart: 0, mdEnd: 5, panel: { dispose: vi.fn() } });

    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeWebviewPanel();
    const doc = makeDocument(uri);

    await provider.resolveCustomTextEditor(doc as never, panel as never, makeCancellationToken() as never);

    expect(panel.dispose).toHaveBeenCalled();
  });

  it('dispose 시 editSessionRegistry.endSession이 호출되어 lock이 해제된다', async () => {
    const uri = 'file:///test.md';
    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeWebviewPanel();
    const doc = makeDocument(uri);

    await provider.resolveCustomTextEditor(doc as never, panel as never, makeCancellationToken() as never);
    expect(editSessionRegistry.getActive(uri)).toBeDefined();

    (panel as { _triggerDispose(): void })._triggerDispose();
    expect(editSessionRegistry.getActive(uri)).toBeUndefined();
  });

  it('dispose 시 broadcastFn이 edit-closed 메시지와 함께 호출된다', async () => {
    const uri = 'file:///test.md';
    const broadcastFn = vi.fn();
    pendingEditSchemas.set(uri, { mdStart: 3, mdEnd: 7, schema: '{}' });

    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri, broadcastFn);
    const panel = makeWebviewPanel();
    const doc = makeDocument(uri);

    await provider.resolveCustomTextEditor(doc as never, panel as never, makeCancellationToken() as never);
    (panel as { _triggerDispose(): void })._triggerDispose();

    expect(broadcastFn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'edit-closed', mdStart: 3, mdEnd: 7 })
    );
  });
});
