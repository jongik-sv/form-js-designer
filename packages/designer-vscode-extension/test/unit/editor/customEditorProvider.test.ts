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
  ViewColumn: { Active: -1, Beside: -2 },
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

  it('additionalStyleUris의 모든 CSS가 <link> 태그로 포함된다', () => {
    const extras = [
      'webview://form-js.css',
      'webview://form-js-editor.css',
      'webview://properties-panel.css',
    ];
    const html = buildHtml({ ...opts, additionalStyleUris: extras });
    for (const uri of extras) {
      expect(html).toContain(`href="${uri}"`);
    }
  });

  it('additionalStyleUris 미지정 시에도 정상 동작한다 (backward compat)', () => {
    const html = buildHtml(opts);
    expect(html).toContain(`href="${opts.styleUri}"`);
  });

  it('renders left-rail and editor-host containers in body', () => {
    const html = buildHtml(opts);
    expect(html).toContain('id="left-rail"');
    expect(html).toContain('data-active-panel="components"');
    expect(html).toContain('id="left-rail-panel-components"');
    expect(html).toContain('id="left-rail-panel-outline"');
    expect(html).toContain('data-outline-container');
    expect(html).toContain('id="editor-host"');
  });
});

/**
 * Block Editor 스타일 회귀 방지:
 * form-js-editor 팔레트/properties-panel 정상 렌더링을 위해
 * 반드시 로드돼야 하는 핵심 CSS 자산들을 webview HTML이 참조하는지 검증.
 */
describe('resolveCustomTextEditor CSS 자산 로드', () => {
  beforeEach(() => {
    editSessionRegistry.disposeAll();
    pendingEditSchemas.clear();
  });

  function makeFullWebviewPanel() {
    return {
      webview: {
        options: {} as Record<string, unknown>,
        html: '',
        cspSource: 'vscode-webview-resource:',
        asWebviewUri: vi.fn((u: { toString(): string }) => ({
          toString: () => `webview://${u.toString()}`,
        })),
        postMessage: vi.fn().mockResolvedValue(undefined),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
      reveal: vi.fn(),
    };
  }

  it.each([
    'form-js-base.css',
    'form-js.css',
    'form-js-editor-base.css',
    'form-js-editor.css',
    'properties-panel.css',
    'draggle.css',
    'form-js-editor-host.css',
  ])('webview HTML이 %s를 <link>로 포함한다', async (cssFile) => {
    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeFullWebviewPanel();
    const doc = { uri: { toString: () => 'file:///test.md', fsPath: 'file:///test.md' } };

    await provider.resolveCustomTextEditor(
      doc as never,
      panel as never,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as never
    );

    expect(panel.webview.html).toContain(cssFile);
  });

  it('webview HTML이 customEditor.css(빌드 산출물)도 포함한다', async () => {
    const extensionUri = makeUri('/ext') as never;
    const provider = new FormJsBlockEditorProvider(extensionUri);
    const panel = makeFullWebviewPanel();
    const doc = { uri: { toString: () => 'file:///test.md', fsPath: 'file:///test.md' } };

    await provider.resolveCustomTextEditor(
      doc as never,
      panel as never,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as never
    );

    expect(panel.webview.html).toContain('customEditor.css');
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
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
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

/**
 * 0.1.4: .form-js 네이티브 파일 분기 — 전체-파일을 스키마로 로드하는 경로.
 * pendingEditSchemas는 무시하고 document.getText()를 사용해야 한다.
 */
describe('resolveCustomTextEditor: .form-js 파일 분기', () => {
  beforeEach(() => {
    editSessionRegistry.disposeAll();
    pendingEditSchemas.clear();
  });

  function makeFormJsPanel() {
    const posted: unknown[] = [];
    return {
      webview: {
        options: {} as Record<string, unknown>,
        html: '',
        cspSource: 'vscode-webview-resource:',
        asWebviewUri: vi.fn((u: { toString(): string }) => ({
          toString: () => `webview://${u.toString()}`,
        })),
        postMessage: vi.fn((m: unknown) => {
          posted.push(m);
          return Promise.resolve(undefined);
        }),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
      reveal: vi.fn(),
      _posted: posted,
    };
  }

  function makeFormJsDocument(body: string, uriStr = 'file:///workspace/sample.form-js') {
    return {
      uri: { toString: () => uriStr, fsPath: uriStr, path: uriStr },
      version: 1,
      lineCount: Math.max(1, body.split('\n').length),
      lineAt: (n: number) => ({ text: body.split('\n')[n] ?? '', range: { end: { line: n, character: 0 } } }),
      getText: () => body,
      save: vi.fn().mockResolvedValue(true),
    };
  }

  it('.form-js URI에서는 pendingEditSchemas 대신 document.getText()를 스키마로 사용한다', async () => {
    // pending 값은 .form-js에서 무시돼야 함 (URI가 다르므로 애초에 매칭되지 않음)
    pendingEditSchemas.set('file:///ghost.md', { mdStart: 1, mdEnd: 2, schema: '{"ghost":true}' });

    const provider = new FormJsBlockEditorProvider(makeUri('/ext') as never);
    const panel = makeFormJsPanel();
    const body = '{"components":[{"type":"textfield","key":"name"}]}';
    const doc = makeFormJsDocument(body);

    await provider.resolveCustomTextEditor(
      doc as never,
      panel as never,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as never
    );

    // setImmediate로 dispatched edit-opened 메시지가 posted에 들어갈 때까지 대기
    await new Promise((resolve) => setImmediate(resolve));

    const editOpened = (panel._posted as Array<{ type: string; schema?: string; mdStart?: number; mdEnd?: number }>)
      .find((m) => m.type === 'edit-opened');
    expect(editOpened).toBeDefined();
    expect(editOpened!.schema).toBe(body);
    expect(editOpened!.mdStart).toBe(-1);
    expect(editOpened!.mdEnd).toBe(-1);
  });

  it('.form-js 빈 파일에서는 기본 스키마로 초기화한다', async () => {
    const provider = new FormJsBlockEditorProvider(makeUri('/ext') as never);
    const panel = makeFormJsPanel();
    const doc = makeFormJsDocument('');

    await provider.resolveCustomTextEditor(
      doc as never,
      panel as never,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as never
    );

    await new Promise((resolve) => setImmediate(resolve));

    const editOpened = (panel._posted as Array<{ type: string; schema?: string }>).find(
      (m) => m.type === 'edit-opened'
    );
    expect(editOpened!.schema).toBe('{"type":"default","components":[]}');
  });
});
