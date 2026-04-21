# Notion-style 플랫폼 매트릭스 — custom block 확장 API 비교

> **입력**: `platform-identification.md` (TSK-03-01의 플랫폼 식별 결과)
> **목적**: 사내 Notion-style 마크다운 뷰어가 어느 오픈소스 플랫폼 기반인지와 관계없이, form-js 어댑터를 적용할 수 있도록 후보 플랫폼의 custom block API·편집 지원·CSS 격리·번들 형식·위험도를 한 페이지로 정리한다.
> **채택**: **BlockNote**를 1차 지원 대상으로 채택한다 (사내 뷰어 번들 분석 결과 — platform-identification.md 참조). 나머지 플랫폼은 PoC 후보 또는 fallback 용도.

## 플랫폼 비교 매트릭스

| 플랫폼 | custom block API | 편집 지원 | CSS 격리 | 번들 형식 | 위험도 |
|--------|------------------|-----------|----------|-----------|--------|
| **BlockNote** | `createReactBlockSpec` + `insertSpec` (공식 문서화된 1급 API) | ✅ 인라인 편집 가능 (editable 속성) | Shadow DOM 자체 제공 없음 — 어댑터가 shadow root 생성 | ESM/CJS 이중, React peer | **LOW** (채택) |
| **Tiptap** | `Node.create()` + NodeView (ProseMirror 계열) | ✅ 커스텀 NodeView로 가능 | Shadow DOM 미지원 — scoped CSS class로 격리 | ESM, peer TypeScript | MEDIUM |
| **Plate** | `createPluginFactory` + React component | ✅ PlateElement 인터페이스 | Shadow DOM 미지원 | ESM, React 전용 | MEDIUM |
| **Lexical** | `DecoratorNode` 상속 + React | ⚠️ DecoratorNode 편집은 추가 구현 필요 | Shadow DOM 미지원 | ESM, Facebook 스펙 | HIGH (곡선 가파름) |
| **Novel** | Tiptap 기반 래퍼 | ✅ Tiptap과 동일 | Shadow DOM 미지원 | ESM | MEDIUM (Tiptap 파생) |
| **AFFiNE** | BlockSuite SDK (`defineBlockSchema`) | ✅ BlockSuite 내장 편집기 | scoped CSS | ESM, 독자 SDK | HIGH (SDK 안정성) |
| **자체 구현** | 사내 정의 API (문서화 필요) | 사내 확인 필요 | 사내 확인 필요 | 사내 확인 필요 | HIGH (계약 불명확) |

## 채택 근거 — BlockNote 채택

- **custom block API 성숙도**: `createReactBlockSpec` 공식 API 문서·버전 관리됨.
- **편집 지원**: viewer에서 `/form-js` 슬래시 명령·블록 메뉴 버튼으로 즉시 insert 가능하며 편집 모드 진입 시 form-js-editor로 전환 가능.
- **form-js 호환성**: React peer 의존성이 form-js의 Preact와 격리되므로 단일 인스턴스 요구사항(루트 overrides)에 영향 없음.
- **위험 평가**: Shadow DOM은 직접 생성, BlockNote v0.x API 변경 위험은 MEDIUM 수준이나 현재 LTS 채널 확정.

## 후속 조치

- platform-identification.md에서 사내 뷰어가 BlockNote 이외로 식별되면 이 문서의 **채택** 대상을 갱신하고 `packages/designer-notion-adapter/src/adapters/{platform}.ts`를 해당 플랫폼용으로 교체한다.
- 당분간은 BlockNote 어댑터(`blocknote.ts`)와 generic fallback(`generic.ts`)을 함께 제공한다.

## 참조

- 입력 문서: `docs/vscode-ext/features/notion-adapter/platform-identification.md` (TSK-03-01 산출물)
- 상세 어댑터 설계: `adapter-design.md`
- 계약·타입: `contract.md`
