# 후보 플랫폼 비교 매트릭스

> 작성 태스크: TSK-03-02
> 입력: TSK-03-01 `platform-identification.md` (플랫폼 판정 결과)
> 상태: BlockNote 채택 확정 — 나머지 후보는 비교 목적으로 기록

---

## 개요

사내 Notion-style 마크다운 뷰어에 form-js custom block을 삽입하기 위한 후보 플랫폼 7종을 비교한다. TSK-03-01의 플랫폼 식별 결과(`platform-identification.md`)를 입력으로 받아, 어댑터 설계(TSK-03-02)의 기술 결정 근거를 제공한다.

---

## 플랫폼 비교 매트릭스

| 플랫폼 | custom block API | 편집 지원 | CSS 격리 | 번들 형식 | 위험도 | 선택 |
|--------|-----------------|----------|----------|----------|--------|------|
| **BlockNote** | `createReactBlockSpec` + `BlockNoteSchema.create({ blockSpecs })`. React 컴포넌트로 직접 렌더. | viewer + modal-edit 가능. `block.props` 갱신 API 존재. | ShadowRoot 사용 시 React 이벤트 위임 충돌 가능. scoped fallback 필요. | ESM + UMD. `@blocknote/react` peer dep. | MEDIUM — preact/compat 브리지 필요 | **채택** |
| Tiptap | `Node.create({ atom: true })` + `NodeViewWrapper`. React/Vue renderer 지원. | viewer + inline-edit 가능(조건부). `setAttributes` API 버전별 차이. | ShadowRoot 미지원 구조. scoped class 필요. | ESM. `@tiptap/core` peer dep. | MEDIUM — 버전별 API 차이 | 배제 |
| Plate | `createPluginFactory` + `PlatePlugin`. React 전용. | viewer + modal-edit 가능. Slate 기반 transforms. | ShadowRoot 일부 지원. | ESM. `@udecode/plate-core` peer dep. | MEDIUM — Slate 의존성 복잡도 | 배제 |
| Lexical | `DecoratorNode` subclass + `$createFormJsNode()`. | viewer-only (v1). `SerializedLexicalNode` 변환 비용 큼. | ShadowRoot 지원. | ESM. `lexical` peer dep. | MEDIUM — 직렬화 round-trip 위험 | 배제 |
| Novel | Tiptap 래퍼 (`createTiptapExtension`). Tiptap 경로와 동일. | Tiptap과 동일(조건부). | Tiptap과 동일. | ESM. `novel` + `@tiptap/core` peer dep. | MEDIUM — 추가 추상화 레이어 | 배제 |
| AFFiNE | `defineBlockSpec` + BlockSuite framework. 독립 런타임. | viewer + editor 가능. BlockSuite 자체 편집 모델. | Web Component + ShadowRoot 기반. 강한 격리. | ESM. BlockSuite 자체 번들. | HIGH — 사내 내부 뷰어 기반 가능성 낮음 | 배제 |
| 자체 구현 | 미정 — 내부 API 문서 없음. | TBD | TBD | TBD | HIGH — API 계약 없음, PoC 비용 최대 | 배제 |

> **"선택" 컬럼 TBD 허용**: "자체 구현" 행만. 나머지는 TSK-03-01 판정 기준으로 확정.

---

## BlockNote 채택 근거 요약

1. **TSK-03-01 판정**: 팀 내 사전 지식 + 프로젝트 문서(TSK-03-03 design.md)에 "BlockNote v0.x 유력 후보"로 기재.
2. **custom block API 완결성**: `createReactBlockSpec` + `BlockNoteSchema.create`로 React 컴포넌트를 블록으로 직접 등록 가능. iframe embed 불필요.
3. **편집 지원**: `block.props` 직접 갱신으로 modal-edit 구현 가능.
4. **위험 완화 가능**: preact/compat 브리지 + ShadowRoot 격리(또는 scoped fallback)로 주요 위험 대응.

---

## 위험도 상세 (BlockNote 채택 기준)

| 위험 | 레벨 | 완화 방안 |
|------|------|----------|
| preact ↔ React 18 충돌 | HIGH | esbuild alias `react → preact/compat` + ShadowRoot 내 preact 격리 |
| BlockNote 버전 불일치 (v0.x API 변화) | HIGH | `package.json` 직접 확인 또는 번들 semver 추출 후 확정 |
| ShadowRoot + React 이벤트 위임 충돌 | MEDIUM | `cssIsolation: 'scoped'` fallback으로 전환 |
| form-js base.css 누락 (높이=0) | MEDIUM | base.css string-import → `<style>` inline 주입 |
| CSP eval 차단 | MEDIUM | Ajv lazy-init + NODE_ENV=production define (VSCode 확장과 동일 전략) |
| 런타임 미확인 오판 | HIGH | 내부망 접근 확보 후 Playwright 분석으로 보완 |

---

## 참조

- TSK-03-01 `platform-identification.md` — 플랫폼 판정 원본
- `adapter-design.md` — 채택 플랫폼 기반 어댑터 설계
- `contract.md` — 플랫폼 비종속 계약 명세
