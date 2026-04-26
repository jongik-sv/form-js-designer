# Tiptap v2 → v3 업그레이드 런북

`@form-js-designer/designer-tiptap`을 Tiptap v3로 끌어올릴 때 따라가는 절차서.
대상 버전: 현 패키지 `0.2.x` → `0.3.x` (Tiptap v3 지원).

> 핵심 가정: 코드 표면이 좁아서(아래 §3 참고) 대부분의 변경은 dependency 핀과 회귀 검증입니다.
> 예측한 회귀가 검증되지 않은 시점에는 `^2 || ^3`로 dual-support 하지 말고 한쪽만 핀하세요.

---

## 0. Pre-flight — 시작 전 확인

- [ ] 현재 `develop`에서 `npm run test:unit`, `npm run test:e2e` 모두 green
- [ ] `examples/vanilla-host` 가 v2로 정상 동작 (브라우저에서 직접)
- [ ] Tiptap v3 공식 마이그레이션 가이드 정독: `https://tiptap.dev/docs/editor/getting-started/upgrade-tiptap-v2-to-v3`
- [ ] 현재 `0.2.x` git tag(`designer-tiptap-v0.2.0`) 가 푸시되어 있는지 확인 (롤백용)
- [ ] form-js-base / form-js-viewer 버전이 `prosemirror-*` 또는 Yjs를 직접 끌어쓰는지 확인 — 끌어쓰면 PM 단일 인스턴스 검증 비용이 추가됨

---

## 1. 브랜치 + 의존성 핀

```sh
git checkout -b feat/designer-tiptap-v3
```

### 1-1. `packages/designer-tiptap/package.json`

```jsonc
{
  "peerDependencies": {
    "@tiptap/core": "^3",         // ^2 → ^3
    "@tiptap/pm":   "^3",         // ^2 → ^3
    "@bpmn-io/form-js-viewer": "^1.21.2",
    "preact": "^10.19.3"
  },
  "devDependencies": {
    "@tiptap/core":        "^3.x.x",
    "@tiptap/pm":          "^3.x.x",
    "@tiptap/starter-kit": "^3.x.x"
  }
}
```

> dual-support(`^2 || ^3`)는 회귀 검증이 끝나기 전까지 **하지 마세요**.
> v3 PM과 v2 PM의 ProseMirror 인스턴스가 섞이면 transaction이 무음으로 사라집니다.

### 1-2. `examples/vanilla-host/package.json` 도 동일하게 v3로

### 1-3. `designer-editor-host`(인라이닝되는 host)도 v3 검증

`tsup.config.ts`의 `noExternal: [/^@form-js-designer\//]` 때문에 host 코드가 dist에 박혀 들어갑니다. host가 Tiptap을 직접 import 하지 않더라도 host의 form-js editor와 PM 인스턴스 단일성은 같이 검증해야 합니다.

### 1-4. lockfile 정리

```sh
rm -rf node_modules package-lock.json   # 또는 pnpm-lock.yaml
npm install
npm ls @tiptap/core @tiptap/pm prosemirror-state prosemirror-view
# → 각 패키지가 단일 버전으로 deduplicate 되었는지 확인
```

이중 PM이 보이면 `overrides` 또는 `resolutions` 로 강제 핀합니다.

---

## 2. v3 known breaking changes — 우리에게 영향 있는 것

| 영역 | 영향 | 우리 코드 위치 |
|------|-----|---------------|
| **ESM-only dist** | v3는 CJS 미배포. 소비자가 CJS 번들러면 깨짐. | 우리 dist는 이미 `"type": "module"` — 영향 없음 |
| **Node 20+ 요구** | dev/CI 노드 버전 | `package.json` `engines` 갱신, CI 매트릭스 점검 |
| **`StarterKit` 기본 extension 셋 변경** | atom node 페이스트/keymap 충돌 가능성 | `examples/vanilla-host/main.ts`, `__tests__/node.test.ts` |
| **`@tiptap/pm` 재익스포트 경로 정리** | `@tiptap/pm/state` 등 경로는 동일하나 일부 소소한 변경 | 우리는 직접 import 하지 않음 — 영향 없음 |
| **`getPos()` 반환 타입 `number → number \| undefined`** | NodeView에서 null guard 필요 | `nodeview/viewer.ts`, `editor/withDesigner.ts` |
| **`Extension.parent` 제거** | 미사용 | 영향 없음 |
| **`Suggestion` 유틸 경로 이동** | 미사용 | 영향 없음 |
| **`editor.options.injectCSS` 기본값 변경 가능** | 우리가 별도 CSS를 inject 하므로 충돌 가능성 낮음 | 검증만 |
| **TypeScript strict 강화** | `addCommands` 시그너처 inferred 타입이 좁아질 수 있음 | `node.ts` `declare module` 블록 |

---

## 3. 파일별 코드 점검 체크리스트

실제 우리가 쓰는 Tiptap API surface 는 매우 좁습니다. 아래만 확인하면 됩니다.

### `src/node.ts`

- [ ] `Node.create({...})` — v3 동일, 변경 불필요
- [ ] `mergeAttributes` import 경로 동일
- [ ] `addAttributes / parseHTML / renderHTML` — 동일
- [ ] `addCommands` 안의 `commands.insertContent({ type, attrs })` — v3에서도 동일 shape
- [ ] `declare module '@tiptap/core'` 의 `Commands<ReturnType>` augmentation — 동일하게 동작

### `src/nodeview/viewer.ts`

- [ ] `NodeViewRenderer`, `NodeViewRendererProps` 타입 이름 동일
- [ ] **`props.getPos()` 가 `number | undefined`** 가 되었는지 확인 후 null guard 추가:
  ```ts
  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  if (pos == null) return; // v3 대응
  ```
- [ ] `update(updatedNode)` 가 `boolean` 반환하는 계약 동일
- [ ] `destroy`, `stopEvent`, `ignoreMutation` shape 동일
- [ ] `props.node.attrs.schema` 접근 — 동일

### `src/editor/withDesigner.ts`

- [ ] `node.extend({ addNodeView() { ... } })` 패턴 동일
- [ ] `editor.state.doc.nodeAt(pos)` — 동일
- [ ] `editor.chain().setNodeSelection(pos).updateAttributes(name, attrs).run()` — 동일
- [ ] **`getPos()` null guard** — 이미 있는 코드(`livePos != null`)로 v3에서도 OK
- [ ] `mountEmbeddedEditorModal` 호출은 Tiptap에 의존하지 않음 — 영향 없음

### `src/editor/index.ts`

- 재export only. 변경 불필요.

### `src/__tests__/*.test.ts`

- [ ] `new Editor({ element, extensions: [StarterKit, FormJsBlock] })` — 동일
- [ ] StarterKit이 기본 포함하는 extension 셋이 늘어남 → `formJsBlock` 의 `parseHTML` priority 가 다른 extension에 가려지지 않는지 확인
- [ ] `editor.commands.insertFormJsBlock(schema)` 결과 HTML 검증 — 동일해야 함
- [ ] happy-dom + v3 PM 조합 동작 확인 (간헐적 incompat 가능성)

### `tsup.config.ts`

- [ ] `noExternal: [/^@form-js-designer\//]` 유지 — host 인라이닝
- [ ] `external`에 `@tiptap/core`, `@tiptap/pm`, `@bpmn-io/form-js-viewer`, `preact` 가 그대로 있는지 확인 (peer로 두기)

---

## 4. 실행 루프 (브랜치 안에서)

```sh
cd packages/designer-tiptap
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
```

녹색이 안 나오면 §3의 영역별로 좁혀가며 수정. 각 단계 사이에서 한 번씩 `npm ls @tiptap/pm`로 PM 단일성을 재확인.

### 수동 회귀 (브라우저)

`npm run dev`로 `examples/vanilla-host`를 띄운 뒤 다음을 직접 확인:

- [ ] `+ Simple form` / `+ Tabs form` / `+ Modal form` 삽입 → 폼 셀이 정상 렌더
- [ ] 블록 더블클릭 → 풀스크린 디자이너 모달이 뜨고 form-js editor 3-column 레이아웃이 정상
- [ ] 모달에서 컴포넌트 추가/수정 → ESC 또는 [닫기] 시 schema가 NodeView attr에 반영
- [ ] `Dump HTML` → `Reload from HTML` 라운드트립
- [ ] Tiptap toolbar bold/italic/heading 동작 (StarterKit 기본 셋 확인)
- [ ] Undo/Redo로 schema 변경이 정상 롤백
- [ ] 모달 떠 있는 상태에서 다른 블록 더블클릭 → 두 번째 모달 열리지 않고 기존 모달 포커스 (single-instance)
- [ ] 모달이 떠 있는 상태에서 NodeView 가 destroy(예: 블록 삭제) → 모달도 강제 정리

### Playwright 회귀

`npm run test:e2e:headed` 로 시각적으로 한 번 더 확인. CI에서는 headless 로.

---

## 5. 패키징 / 릴리스

- [ ] `package.json` `version`: `0.2.x` → `0.3.0`
- [ ] `package.json` `engines.node`: v3 요구사항 따라 `>=20`
- [ ] `peerDependencies` 최종 형태 확정 (`^3` 단독 또는 `^2 || ^3`)
- [ ] `CHANGELOG.md`에 새 엔트리:
  ```
  ## 0.3.0 — YYYY-MM-DD
  ### Changed
  - Tiptap v3 지원. peerDependencies: @tiptap/core ^3, @tiptap/pm ^3.
  ### Migration
  - 소비자는 @tiptap/core, @tiptap/pm, @tiptap/starter-kit 을 ^3 으로 함께 올려야 합니다.
  ```
- [ ] `README.md` § 1. 사전 요구사항의 Tiptap 버전 라인 갱신
- [ ] `README.md` § 10. 호환성 매트릭스에 `0.3.x — Tiptap v3` 행 추가
- [ ] `README.md` § 11. 로드맵에서 v0.3 항목을 ✅ 처리
- [ ] git tag `designer-tiptap-v0.3.0` + push
- [ ] GitHub Packages 게시: `npm publish`

---

## 6. 롤백 플랜

v3 게시 후 회귀가 발견되면:

```sh
# 소비자 측
npm i @form-js-designer/designer-tiptap@^0.2 \
      @tiptap/core@^2 @tiptap/pm@^2 @tiptap/starter-kit@^2
```

- `0.2.x` 라인은 v3 게시 후에도 **6개월간 보안 패치 백포트** 유지
- 회귀 재현 케이스를 `__tests__/` 또는 `e2e/`에 회귀 테스트로 박은 뒤 `0.3.1`로 재시도

---

## 7. dual-support (`^2 || ^3`) 를 굳이 한다면

권장하지 않지만 필요하다면:

- `peerDependencies`: `@tiptap/core: ^2 || ^3`, `@tiptap/pm: ^2 || ^3`
- `peerDependenciesMeta`로 명시적 선택 강제
- 소비자에게 **`@tiptap/pm`을 반드시 dedupe하도록** README에 명시
- CI 매트릭스에 v2/v3 두 컬럼 추가 (`tiptap-version: [2, 3]`)
- 위 §3 코드 점검을 v2/v3 양쪽에서 모두 통과해야 머지

---

## 8. 알려진 위험 & 미해결 가설

1. **happy-dom + v3 PM** — v3 PM이 happy-dom의 일부 DOM API에서 깨질 수 있음. 깨지면 `vitest.config.ts`의 environment를 `jsdom`으로 전환 검토.
2. **Yjs 협업 시 Tiptap v3 collaboration extension** — `@tiptap/extension-collaboration` v3가 form-js의 동기화 패턴과 어떻게 상호작용하는지 미검증. 협업 사용 예정이면 별도 PoC 선행.
3. **VS Code webview 변형** (v0.3 로드맵) — webview CSP의 `unsafe-eval` 부재가 v3 코드 경로를 더 압박할 수 있음. v3 본체와 webview 변형은 분리된 PR로 진행 권장.

---

## 부록: 변경되어야 하는 파일 목록 (요약)

```
packages/designer-tiptap/package.json          # peer/dev/version
packages/designer-tiptap/CHANGELOG.md          # 0.3.0 엔트리
packages/designer-tiptap/README.md             # 호환성, 로드맵
packages/designer-tiptap/src/nodeview/viewer.ts  # getPos null guard
packages/designer-tiptap/src/editor/withDesigner.ts  # (이미 guard 있음 — 검증만)
packages/designer-tiptap/examples/vanilla-host/package.json
packages/designer-editor-host/package.json     # peer/dev (host도 v3 sync)
```

코드 변경 행수는 가이드 한 자리, 의존성/문서 변경이 두 자리 수준. 큰 리팩토링은 없습니다.
