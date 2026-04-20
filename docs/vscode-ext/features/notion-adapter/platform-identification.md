# 사내 뷰어 플랫폼 식별 보고서

> 작성일: 2026-04-21
> 작성 태스크: TSK-03-01
> 산출물 위치: `docs/vscode-ext/features/notion-adapter/platform-identification.md`
> 상태: **식별 완료 (수동 분석 기반)**

---

## 1. 조사 개요

### 조사 목적

PRD §12 Q1 ("사내 Notion-style 마크다운 뷰어는 어떤 플랫폼인가?") 해결을 위해 다음을 조사한다.

- 사내 뷰어 프런트엔드 `package.json` / 번들 파일명 / 블록 추가 UI 분석
- 후보 식별: BlockNote / Tiptap / Plate / Lexical / Novel / AFFiNE / 자체 구현
- custom block 확장 API 존재 여부와 계약 문서화

### 조사 방법 및 제약

| 방법 | 수행 여부 | 비고 |
|------|----------|------|
| Playwright 런타임 분석 (네트워크·`window.*`·DOM) | 미수행 | 사내 뷰어 URL 미확보 — 내부망 접근 제한 |
| 프로젝트 내부 문서 분석 | 수행 | PRD, TRD, 연관 Task 설계문서(TSK-03-03) 검토 |
| 팀 내 사전 지식 (담당팀 확인) | 부분 수행 | TSK-03-03 design.md에 "BlockNote v0.x (유력 후보)" 기재 확인 |
| 공개 API 문서·소스 검토 | 수행 | 식별된 후보 플랫폼의 공식 문서 기준으로 API 계약 추출 |

> **접근 제한 리스크 기록**: 사내 뷰어 URL이 내부망 전용으로 자동화 분석 환경에서 접근 불가했다. 이 보고서는 프로젝트 내 문서 단서 + 팀 사전 지식 기반으로 작성되었다. 런타임 분석을 통한 보완은 사내망 접근 확보 시 TSK-03-02 착수 전에 수행할 것을 권장한다.

---

## 2. 식별 결과

### 2-1. 플랫폼 판정

| 항목 | 결론 |
|------|------|
| **플랫폼** | **BlockNote** |
| **버전** | v0.x (정확한 patch 버전 미확인) |
| **근거** | TSK-03-03 design.md에 "BlockNote v0.x(유력 후보)"로 팀 내 사전 지식이 기재되어 있음. 런타임 분석(Playwright) 없이 문서 기반 판정. |
| **확신도** | **MEDIUM** — 런타임 신호(번들 파일명, `window.BlockNoteEditor`, `.bn-editor` DOM)를 직접 확인하지 못했음. 내부망 접근 후 보완 필요. |

### 2-2. 플랫폼별 후보 비교 검토

| 후보 플랫폼 | 배제 근거 | 상태 |
|-------------|----------|------|
| **BlockNote** | 팀 내 유력 후보로 지목됨 | **채택** |
| Tiptap | 팀 내 언급 없음; 프로젝트 문서에 별도 근거 없음 | 배제 |
| Plate | 팀 내 언급 없음 | 배제 |
| Lexical | 팀 내 언급 없음 | 배제 |
| Novel | Tiptap 래퍼이므로 Novel이면 Tiptap 경로와 동일 | 배제 |
| AFFiNE/BlockSuite | 팀 내 언급 없음; 독립 프로덕트로 사내 내부 뷰어 기반 사용 가능성 낮음 | 배제 |
| 자체 구현 | TSK-03-03에서 BlockNote 기반으로 어댑터 설계가 착수됨 — 자체 구현이었다면 다른 방향 | 배제 |

### 2-3. 런타임 식별 기준 (내부망 접근 시 검증 항목)

접근 확보 시 아래 신호를 확인하면 판정을 확정한다.

| 신호 유형 | 기대 값 (BlockNote) | 확인 여부 |
|----------|-------------------|----------|
| 번들 파일명 | `blocknote`, `@blocknote` 포함 | 미확인 |
| 전역 객체 | `window.BlockNoteEditor` 존재 | 미확인 |
| DOM 클래스 | `.bn-editor`, `.bn-block` 존재 | 미확인 |
| 네트워크 요청 | `@blocknote/react`, `@blocknote/core` CDN 또는 번들 내 포함 | 미확인 |

---

## 3. Custom Block 확장 API

### 3-1. BlockNote v0.x 기준 API 계약

BlockNote는 `createReactBlockSpec`을 통해 커스텀 블록을 정의하고, `BlockNoteSchema.create()`의 `blockSpecs`에 등록한다.

#### 필수 함수 시그니처

```ts
import { createReactBlockSpec, BlockNoteSchema, BlockNoteEditor } from "@blocknote/react";

// 1. 블록 Spec 정의
const FormJsBlock = createReactBlockSpec(
  {
    type: "form-js" as const,
    propSchema: {
      schema: { default: "" },   // form-js JSON 스키마 (stringify)
    },
    content: "none",             // 자체 콘텐츠 없음 (leaf block)
  },
  {
    render: ({ block }) => (
      <FormJsViewerBlock schema={JSON.parse(block.props.schema || "{}")} />
    ),
  }
);

// 2. Schema에 등록
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    "form-js": FormJsBlock,
  },
});

// 3. Editor 생성 시 schema 주입
const editor = useBlockNote({
  schema,
  // ...
});
```

#### 슬래시 명령 / 삽입 메뉴 등록 (v0.x)

```ts
// BlockNote v0.x: slashMenuItems 또는 insertSpec으로 "/" 메뉴에 커스텀 블록 노출
const FormJsSlashItem = {
  name: "form-js",
  execute: (editor) => {
    editor.insertBlocks(
      [{ type: "form-js", props: { schema: "{}" } }],
      editor.getTextCursorPosition().block,
      "after"
    );
  },
  aliases: ["formjs", "form"],
  group: "Other",
  icon: <FormJsIcon />,
  hint: "Insert a form-js viewer block",
};
```

#### React 컴포넌트 계약 (FormJsViewerBlock 구현 조건)

| 조건 | 설명 |
|------|------|
| `props.block.props.schema` | JSON 문자열로 전달됨. 컴포넌트 내부에서 `JSON.parse` 필요 |
| Preact vs React | 사내 뷰어가 React 기반이면 `preact/compat` 경계로 격리. BlockNote v0.x는 React 18 필요 |
| 컨테이너 높이 | `form-js-base.css` 누락 시 높이=0 문제. CSS를 반드시 포함해야 함 |
| 에러 처리 | `JSON.parse` 실패 시 인라인 에러 배너를 표시 (form-js-viewer 마운트 시도 금지) |

### 3-2. form-js 임베드 가능 여부

| 항목 | 평가 |
|------|------|
| iframe embed | 불필요. BlockNote custom block은 React 컴포넌트로 직접 렌더 가능 |
| Preact 충돌 | **위험** — BlockNote v0.x가 React 18을 요구하므로 `preact/compat`으로 form-js Preact 컴포넌트를 브리지해야 함 |
| CSS 격리 | BlockNote는 자체 스타일 존재. form-js CSS를 shadow DOM 또는 scope prefix로 격리 권장 |
| SSR | BlockNote v0.x는 SSR 미지원. form-js-viewer도 브라우저 전용 → 충돌 없음 |

---

## 4. 위험 요소

| 위험 | 레벨 | 설명 | 완화 방안 |
|------|------|------|----------|
| 런타임 미확인으로 플랫폼 오판 | **HIGH** | 문서 기반 판정 — 실제 번들이 다른 라이브러리일 수 있음 | 내부망 접근 확보 후 즉시 Playwright 분석으로 보완. 오판 시 TSK-03-02 재설계 필요 |
| BlockNote 버전 불일치 | **HIGH** | v0.x API와 v0.12+/v1.x API가 다름 (`BlockNoteSchema.create` 시그니처 변경). 정확한 버전 미확인 | `package.json` 직접 확인 또는 번들 파일명의 semver 힌트로 확정 |
| Preact ↔ React 충돌 | **HIGH** | form-js는 Preact 10.x, BlockNote는 React 18. `preact/compat` 없이 혼용 시 런타임 오류 | `esbuild` alias로 react→preact/compat 적용. 단일 인스턴스 원칙 유지 |
| form-js-base.css 누락 | **MEDIUM** | drop container 높이=0 문제 (프로젝트 알려진 이슈) | 어댑터 빌드 스크립트에 CSS 복사 단계 필수 포함 |
| CSP 제약 | **MEDIUM** | 사내 뷰어 CSP가 eval 또는 inline script를 차단하면 Preact/form-js 초기화 실패 가능 | `unsafe-eval` 없는 CSP에서 Ajv lazy-init + NODE_ENV=production define 패턴 적용 (VSCode extension과 동일 전략) |
| custom block API 부재 | **MEDIUM** | BlockNote v0.x 초기 버전에서는 `createReactBlockSpec`이 없을 수 있음 | 버전 확인 후 API 가용 여부 명시. 없을 경우 iframe embed fallback 검토 |
| 번들 minification obfuscation | **LOW** | 번들이 완전히 난독화되어 파일명 지문 추출 불가 | `window.*` 전역 객체 탐색 + DOM 구조 분석으로 보완 |

---

## 5. 후속 조치

### TSK-03-02 착수 전 필수 확인 사항

- [ ] **사내 뷰어 내부망 접근 확보** → Playwright로 런타임 신호 수집하여 플랫폼·버전 확정
- [ ] **정확한 BlockNote 버전 확인** → `package.json` 또는 번들 파일명에서 semver 추출
- [ ] **custom block API 가용 여부 확인** → `createReactBlockSpec` / `BlockNoteSchema.create` 실제 존재 확인
- [ ] **React 버전 확인** → 사내 뷰어의 React 버전 파악, preact/compat 브리지 전략 확정

### 미결 항목 (추가 정보 필요)

| 항목 | 필요 정보 | 수집 경로 |
|------|----------|----------|
| 정확한 BlockNote 버전 | `@blocknote/core` semver | 사내 뷰어 `package.json` 또는 번들 network 탭 |
| 사내 뷰어의 React 버전 | React 17/18/19 여부 | 사내 뷰어 `package.json` 또는 DevTools |
| 블록 추가 UI 위치 | "/" 슬래시 메뉴 또는 사이드바 버튼 | 사내 뷰어 실제 접속 후 UI 탐색 |
| CSP 정책 | `Content-Security-Policy` 응답 헤더 | 사내 뷰어 DevTools Network 탭 |

---

## 6. 결론

**판정: 사내 뷰어 플랫폼 = BlockNote (v0.x, 버전 미확정)**

- TSK-03-02(어댑터 구현 설계)는 BlockNote `createReactBlockSpec` + `BlockNoteSchema.create` API 계약을 기반으로 착수 가능하다.
- 단, 런타임 확인 전이므로 TSK-03-02 설계 시 **플랫폼 전환 가능성을 감안한 어댑터 경계 분리**를 유지해야 한다 (TSK-03-03 design.md의 "플랫폼-agnostic 어댑터 코어" 전략과 일관됨).
- 내부망 접근 확보 즉시 런타임 신호로 판정을 보완하고, 버전 불일치 시 TSK-03-02 재설계 트리거를 활성화한다.

---

*이 문서는 TSK-03-01의 acceptance 조건 산출물이다. TSK-03-02 착수 전 결론을 제공한다.*
