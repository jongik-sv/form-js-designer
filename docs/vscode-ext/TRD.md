# TRD — vscode-ext (form-js Markdown Extension)

> 상태: **초안 (Draft)**
> 최초 작성: 2026-04-19
> 상위 PRD: [`./PRD.md`](./PRD.md)

## 1. 스택 / 의존성

| 영역 | 선택 | 이유 |
|------|------|------|
| 호스트 API | VSCode Extension API (Markdown contributions + Custom Editor API) | 표준 공식 경로, Cursor/Windsurf 호환 |
| Markdown 파서 | VSCode 내장 markdown-it (host 주입) | 추가 파서 도입 없이 contribution 지점 확보 |
| 렌더링 엔진 | `@bpmn-io/form-js-viewer` (뷰어), `@bpmn-io/form-js-editor` (편집기) | 디자이너 본체와 동일 — 스키마 호환성 보장 |
| UI 컴포넌트 | `@form-js-designer/designer-components`, `designer-runtime`, `designer-core` (workspace 패키지) | 본체 디자이너 컴포넌트 재사용 |
| 번들러 | esbuild (single-file ESM / CommonJS 듀얼 타깃) | `.vsix` 크기 최소화, Preact single-instance 유지 |
| 테스트 | Vitest (단위) + `@vscode/test-electron` (통합) + Playwright (Notion 뷰어 어댑터 E2E) | 디자이너 본체와 동일 도구 |

## 2. 패키지 레이아웃

```
packages/designer-vscode-extension/
├── package.json              # VSCode manifest + npm manifest 통합
├── esbuild.config.mjs
├── tsconfig.json
├── src/
│  ├── extension.ts           # activate / deactivate, Custom Editor 등록
│  ├── markdown/
│  │  ├── plugin.ts           # markdown-it 확장 (form-js fence → placeholder)
│  │  └── preview.ts          # webview 내 실행 스크립트 (viewer 마운트 + ✏️ 버튼)
│  ├── editor/
│  │  ├── customEditor.ts     # form-js-editor webview provider
│  │  ├── blockLocator.ts     # markdown 원본에서 해당 fence 블록 range 재탐지
│  │  └── workspaceEdit.ts    # WorkspaceEdit 교체 로직 (들여쓰기 보존)
│  ├── adapters/
│  │  └── notion-viewer/      # (M3) 사내 Notion-style 뷰어 어댑터 (플랫폼 식별 후 확정)
│  └── shared/
│     ├── schemaHash.ts       # 스키마 해시 계산 (인스턴스 재사용)
│     └── messages.ts         # webview ↔ extension postMessage 타입
├── media/                    # CSS (form-js.css, form-js-base.css 복사본) + 아이콘
└── test/
   ├── unit/
   └── integration/
```

**중요**: Preact 단일 인스턴스 원칙(루트 `package.json overrides: preact 10.29.x`) 준수. 번들 시 `preact`는 external 처리하지 말고 내부에 포함 (webview sandbox 격리 때문에 외부 공유 불가).

## 3. 핵심 인터페이스

### 3.1 Markdown-it 플러그인

```ts
// src/markdown/plugin.ts
export function formJsMarkdownPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() !== 'form-js') return defaultFence(tokens, idx, options, env, self);
    const raw = token.content;              // JSON 본문
    const [start, end] = token.map ?? [0, 0];
    const id = schemaHash(raw);
    return `<div class="form-js-block"
                 data-schema-id="${id}"
                 data-md-start="${start}"
                 data-md-end="${end}">
              <pre class="form-js-source" hidden>${escapeHtml(raw)}</pre>
            </div>`;
  };
}
```

### 3.2 Preview 스크립트 (contributes.markdown.previewScripts)

```ts
// src/markdown/preview.ts — webview 컨텍스트
import { createForm } from '@bpmn-io/form-js-viewer';

document.querySelectorAll<HTMLDivElement>('.form-js-block').forEach(async (host) => {
  const rawJson = host.querySelector('.form-js-source')!.textContent!;
  const schema = JSON.parse(rawJson);
  await createForm({ container: host, schema });
  mountEditButton(host);   // ✏️ → postMessage({ type: 'edit', mdStart, mdEnd })
});
```

### 3.3 Custom Editor / WorkspaceEdit

```ts
// src/editor/workspaceEdit.ts
export async function replaceFenceBody(
  doc: vscode.TextDocument,
  mdStart: number,
  mdEnd: number,
  newJson: string
): Promise<void> {
  const range = locateFenceBody(doc, mdStart, mdEnd);  // ```form-js ... ``` 내부 라인 범위
  const indent = detectIndent(doc, range.start);
  const formatted = formatJson(newJson, indent);        // 2/4-space 자동 맞춤
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, range, formatted);
  await vscode.workspace.applyEdit(edit);
}
```

### 3.4 메시지 프로토콜

| 방향 | 메시지 | 필드 |
|------|--------|------|
| webview → ext | `request-edit` | `{ uri, mdStart, mdEnd, schema }` |
| ext → webview | `edit-opened` | `{ editorViewColumn }` |
| webview → ext | `save-schema` | `{ uri, mdStart, mdEnd, schema, docVersion }` |
| ext → webview | `save-result` | `{ ok: boolean, error?: string }` |
| ext → webview | `source-updated` | `{ uri, version }` (외부 편집 알림) |

## 4. 빌드 / 번들

### 4.1 esbuild 설정 (축약)
```js
// esbuild.config.mjs
import { build } from 'esbuild';
await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  external: ['vscode'],           // vscode는 host 제공
  outfile: 'dist/extension.cjs',
  sourcemap: 'linked',
  minify: true,
});
await build({
  entryPoints: ['src/markdown/preview.ts', 'src/editor/customEditor.ts'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  outdir: 'dist/webview',
  sourcemap: 'linked',
  minify: true,
});
```

### 4.2 package.json contribution 요지
```json
{
  "contributes": {
    "markdown.markdownItPlugins": true,
    "markdown.previewScripts": ["./dist/webview/preview.js"],
    "markdown.previewStyles": [
      "./media/form-js.css",
      "./media/form-js-base.css",
      "./media/form-js-block.css"
    ],
    "customEditors": [
      {
        "viewType": "form-js.block-editor",
        "displayName": "form-js Block Editor",
        "selector": [{ "filenamePattern": "*.md" }]
      }
    ],
    "commands": [
      { "command": "form-js.editBlock", "title": "form-js: Edit Block" }
    ]
  }
}
```

## 5. 성능 / 보안 / 안정성 (NFR)

- **성능**: 단일 스키마 마운트 p95 < 500ms (local dev, 10 필드 기준). 스키마 해시 LRU로 재마운트 방지.
- **보안 CSP**: 웹뷰 CSP는 VSCode 기본 정책 준수. 인라인 스크립트 금지 — 모든 초기화는 `previewScripts`로부터.
- **오프라인**: 번들 내부에 form-js 런타임과 CSS 포함 (CDN 금지).
- **충돌 처리**: 저장 시 `docVersion` 불일치 → 자동 병합 금지, 사용자 확인 유도.
- **에러 격리**: JSON 파싱 실패 한 블록이 전체 미리보기를 깨지 않음 (try/catch per block + 오류 배너).

## 6. 테스트 전략

- **단위 (Vitest)**: `schemaHash`, `blockLocator`, `formatJson`, `detectIndent` — 순수 로직 전수
- **통합 (`@vscode/test-electron`)**:
  - 미리보기 열기 → `.form-js-block` DOM 마운트 확인
  - ✏️ 클릭 → Custom Editor 패널 오픈
  - 저장 → WorkspaceEdit 반영 후 파일 내용 비교
- **어댑터 E2E (Playwright)**: Notion 뷰어 어댑터 PoC 환경에 대해 블록 렌더/편집 플로우 스모크

## 7. dev-plugin 연계

- 본 서브프로젝트의 WBS/태스크는 `docs/vscode-ext/` 경로 기준
- dev 플러그인 호출 예:
  - `/wbs vscode-ext` — WBS 생성
  - `/feat vscode-ext markdown-preview-render "…"` — 기능 단위 태스크 스캐폴드
  - `/dev vscode-ext TSK-01-01` — 설계→구현→테스트→리팩토링 전체 사이클
  - `/dev-team vscode-ext WP-01` — WP 단위 병렬 개발

## 8. 오픈 이슈 (결정 필요)

| ID | 내용 | 결정 기한 |
|----|------|---------|
| O1 | 사내 Notion-style 뷰어 플랫폼 식별 (BlockNote/Tiptap/Plate/Lexical/자체) | M3 착수 전 |
| O2 | 편집 범위: form-js-editor 풀셋 vs 축소판 | M2 착수 전 |
| O3 | `.vsix` 배포 채널: 내부 registry vs 파일 공유 | M4 착수 전 |
| O4 | 스키마 JSON 스키마 검증 시점(저장 전 vs 저장 후) | M2 설계 시 |
