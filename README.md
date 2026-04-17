# form-js-designer

form-js 기반 전문 화면 디자이너. WYSIWYG · AI-driven · 한국어(ko) 1차.

## 문서

- [`docs/PRD.md`](./docs/PRD.md) — 1차 릴리스 제품 요구사항
- [`docs/TRD.md`](./docs/TRD.md) — 기술 명세 (패키지·스키마·인터페이스·NFR)
- [`docs/idea.md`](./docs/idea.md) — 기술 설계 원본 (탐색·결정 기록)
- [`docs/adr/`](./docs/adr/) — 아키텍처 결정 기록 (ADR)

## 구조

```
form-js-designer/
├── docs/                    # PRD, TRD, ADR
├── packages/
│   ├── designer-core/       # (예정) defineComponent, OverlayLayer 유틸
│   ├── designer-components/ # (예정) Card/Stack/Tabs/Modal/Button
│   ├── designer-table/      # (예정) TanStack Table 래퍼
│   ├── designer-i18n/       # (예정) ko 번들 + t() 함수
│   └── designer-cli/        # (예정) validate / import / publish
└── .claude/                 # Skills, Slash Commands
```

## 의존성

`@bpmn-io/form-js-viewer`, `@bpmn-io/form-js-editor`를 npm dependency로 사용.
form-js 본체 소스는 본 repo에 포함하지 않음 (디버깅·참조용 클론은 `~/project/form-js-upstream`).

## 라이선스

본 repo의 코드는 비공개(UNLICENSED). 운영 출력에는 form-js의 bpmn.io 워터마크가 자동 노출되어야 함 (라이선스 의무).
