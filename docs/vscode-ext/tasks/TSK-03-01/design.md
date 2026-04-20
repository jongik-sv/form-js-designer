# TSK-03-01: 사내 뷰어 플랫폼 식별 조사 - 설계

## 요구사항 확인

- 사내 Notion-style 마크다운 뷰어가 어떤 에디터 플랫폼(BlockNote / Tiptap / Plate / Lexical / Novel / AFFiNE / 자체 구현) 기반인지 식별한다.
- 식별된 플랫폼의 custom block 확장 API 계약(함수 시그니처·필수 메서드·React 컴포넌트 계약)을 문서화한다.
- 결과를 `docs/vscode-ext/features/notion-adapter/platform-identification.md`에 산출물로 작성하여 TSK-03-02(어댑터 구현 설계)가 즉시 착수 가능한 상태로 만든다.

## 타겟 앱

- **경로**: N/A (단일 앱) — 본 Task는 사내 뷰어 런타임 코드·번들에 대한 조사이며, 이 레포에 새 소스 파일을 작성하지 않는다.
- **근거**: 조사·문서화 Task이므로 산출물 Markdown만 생성한다.

## 구현 방향

1. **브라우저 DevTools 분석**: 사내 뷰어 URL을 `plugin_playwright`로 열고 네트워크 요청 번들 파일명, `window.*` 전역 객체, DOM 구조를 수집하여 라이브러리 지문을 추출한다. (pkill 선행 필수 — profile lock 방지)
2. **패키지 지문 매칭**: 수집된 번들 파일명·전역 객체·DOM class 패턴을 각 후보 플랫폼의 알려진 지문과 대조한다 (아래 "플랫폼별 식별 기준" 참조).
3. **확장 API 조사**: 식별된 플랫폼의 공식 문서·소스에서 custom block 추가 API 계약을 추출하고 form-js iframe/component embed 가능 여부를 평가한다.
4. **위험 요소 평가**: CSP 제약·iframe sandboxing·Preact 충돌 등 어댑터 구현 시 예상되는 위험을 HIGH/MEDIUM/LOW로 분류한다.
5. **산출물 작성**: `docs/vscode-ext/features/notion-adapter/platform-identification.md`에 결과를 작성한다.

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `docs/vscode-ext/features/notion-adapter/platform-identification.md` | 플랫폼 식별 결과 보고서 — 플랫폼·버전·확장 API 요약 + 위험 요소 | 신규 |

## 진입점 (Entry Points)

N/A — `domain=infra` research Task이므로 UI 진입점 없음.

## 주요 구조

조사 실행 절차는 다음 4단계로 구성된다:

**1. `identifyPlatform(url)`** — Playwright (`plugin_playwright`)로 사내 뷰어 URL에 접속, 네트워크 요청·`window.*`·DOM 구조를 수집하는 일회성 조사 절차

**2. `matchFingerprint(signals)`** — 수집된 신호를 아래 플랫폼별 식별 기준 테이블과 대조하여 플랫폼·버전 추정

**3. `extractCustomBlockAPI(platform)`** — 식별된 플랫폼의 공식 문서에서 custom block 추가 함수 시그니처·필수 메서드·React 컴포넌트 계약 추출

**4. 산출물 작성** — 위 3단계 결과를 `platform-identification.md` 양식으로 정리

### 플랫폼별 식별 기준

| 후보 플랫폼 | 번들 파일명 지문 | 전역 객체 | DOM 특징 | 확장 API 핵심 |
|-------------|----------------|-----------|----------|--------------|
| **BlockNote** | `blocknote`, `@blocknote` | `BlockNoteEditor` | `.bn-editor`, `.bn-block` | `BlockNoteSchema.create().extend()` + `createReactBlockSpec()` |
| **Tiptap** | `tiptap`, `@tiptap/core` | `Editor` (Tiptap) | `.ProseMirror`, `tiptap-editor` | `Node.create()` + `ReactNodeViewRenderer()` |
| **Plate** | `platejs`, `@platejs/core` | `createPlateEditor` | `.slate-editor` | `createPlatePlugin()` + `PlatePlugin` |
| **Lexical** | `lexical`, `@lexical` | `LexicalEditor`, `$getRoot` | `[data-lexical-editor]` | `DecoratorNode` 상속 + `nodes` 배열 등록 |
| **Novel** | `novel`, `@tiptap` (Tiptap 래퍼) | Tiptap와 동일 | Tiptap와 동일 | Tiptap extension 동일 사용 가능 |
| **AFFiNE/BlockSuite** | `blocksuite`, `affine` | `AffineEditorContainer` | `.affine-page-root` | `BlockSpec` 정의 + specs 배열 주입 |
| **자체 구현** | 고유 파일명, 외부 라이브러리 미검출 | 커스텀 전역 | 고유 class명 | 소스 저장소 직접 분석 필요 |

### custom block API 계약 요약 (후보별)

**BlockNote** (`createReactBlockSpec`):
```ts
createReactBlockSpec(
  { type: 'form-js', content: 'none', propSchema: { schema: { default: '' } } },
  { render: ({ block }) => <FormJsViewer schema={block.props.schema} /> }
)
// BlockNoteSchema.create({ blockSpecs: { 'form-js': createFormJsBlock() } })
```

**Tiptap** (`Node.create` + `ReactNodeViewRenderer`):
```ts
const FormJsNode = Node.create({
  name: 'formJs', group: 'block', atom: true,
  addNodeView() { return ReactNodeViewRenderer(FormJsComponent) },
});
```

**Plate** (`createPlatePlugin`):
```ts
const FormJsPlugin = createPlatePlugin({
  key: 'form_js', node: { isElement: true, isVoid: true },
});
```

**Lexical** (`DecoratorNode` 상속):
```ts
class FormJsNode extends DecoratorNode<JSX.Element> {
  static getType() { return 'form-js'; }
  decorate() { return <FormJsViewer schema={this.__schema} />; }
}
// editor config: { nodes: [FormJsNode] }
```

## 데이터 흐름

사내 뷰어 URL → Playwright 분석 → 플랫폼 지문 신호 수집 → 후보 테이블 매칭 → 식별된 플랫폼 + 버전 → 공식 API 문서 추출 → `platform-identification.md` 산출물

## 설계 결정 (대안이 있는 경우만)

- **결정**: Playwright headless (`plugin_playwright`)로 런타임 신호 수집 (네트워크 인터셉트 + `page.evaluate()`)
- **대안**: 사내 뷰어 소스 저장소 직접 접근 (권한 필요)
- **근거**: 저장소 접근 권한 없이도 실행 가능한 블랙박스 접근이 선행 조사에 적합; 소스 접근 확보 시 보완 가능

- **결정**: `platform-identification.md` 단일 산출물로 모든 결과 통합
- **대안**: 플랫폼별 별도 문서 분리
- **근거**: TSK-03-02가 단일 파일에서 결론을 즉시 확인할 수 있어야 한다는 acceptance 조건에 부합

## 선행 조건

- TSK-00-01 완료 (프로젝트 초기 환경 설정)
- 사내 뷰어 URL 접근 가능 (VPN 또는 내부망 환경)
- `plugin_playwright` 사용 가능 (profile lock 방지 위해 실행 전 pkill 선행)

## 리스크

- **HIGH**: 사내 뷰어가 완전히 자체 구현된 경우 공개 문서가 없어 조사 기간 대폭 증가. 완화: 소스 저장소 접근 또는 담당 팀 인터뷰 병행 준비
- **HIGH**: 사내 뷰어 URL이 내부망 전용이어서 자동화 분석 환경에서 접근 불가. 완화: 수동 DevTools 분석 + 스크린샷/HAR 파일 수집으로 대체
- **MEDIUM**: 번들 minification으로 인해 파일명 지문이 obfuscate됨. 완화: `window.*` 전역 객체 탐색 + DOM 구조 분석 병행
- **MEDIUM**: 식별된 플랫폼의 버전이 낮아 custom block API가 없거나 제한적. 완화: 버전 확인 후 API 가용 여부 명시, TSK-03-02에서 fallback 전략(iframe embed) 검토
- **LOW**: Novel은 Tiptap 래퍼이므로 Novel 식별 시 Tiptap API 조사로 바로 이어짐 (추가 공수 없음)

## QA 체크리스트

- [ ] 정상 케이스: 사내 뷰어 접속 후 네트워크 번들 파일명 목록이 수집되고, 후보 플랫폼 중 하나와 매칭됨
- [ ] 정상 케이스: `platform-identification.md`가 생성되고 "플랫폼명·버전·확장 API 요약·위험 요소" 4개 섹션이 모두 비어 있지 않음
- [ ] 엣지 케이스: 사내 뷰어가 자체 구현인 경우 "자체 구현"으로 명시하고 확장 불가 여부 및 대안(iframe embed) 평가가 기록됨
- [ ] 엣지 케이스: 사내 뷰어 접근 불가 시 수동 DevTools 분석 결과(스크린샷, 콘솔 캡처)를 근거로 판정하고 "접근 제한" 리스크가 문서에 명시됨
- [ ] 에러 케이스: 플랫폼 식별 결론에 도달하지 못할 경우 TSK-03-01을 "미결" 상태로 표시하고 추가 정보 요청 항목이 문서에 포함됨
- [ ] 통합 케이스: TSK-03-02 담당자가 `platform-identification.md`만 읽고 어댑터 구현 설계를 착수할 수 있는 정보(플랫폼·버전·API 계약·위험 요소)가 모두 포함됨
