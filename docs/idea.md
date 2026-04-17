## 운영 렌더 계층 설계 (2026-04-17 논의)

### 목표
- form-js를 **전문 화면 디자이너**로 확장
- 디자인된 JSON 스키마를 **운영환경에서 직접 렌더링**하는 얇은 런타임 계층 보유

### 현재 form-js에서 재사용 가능한 것
- 스키마 ↔ 렌더 분리 (`viewer` vs `editor`)
- 컴포넌트 DI 등록 (`FormFields.register`)
- Palette / Properties Panel / 드래그·키보드 / 선택·커맨드 스택(undo·redo)
- FEEL 표현식 평가 (샌드박스 안전)
- `keyed: false` / `pathed: true` 로 비-폼 컴포넌트 표현 가능

### 갭 분석 (현재 ↔ 필요)

| 영역 | 현재 | 필요 |
|---|---|---|
| 컴포넌트 라이브러리 | 폼 필드 위주 | Card/Tabs/Modal/Table(고급)/차트/Navbar/Toast/Steps 등 |
| 디자인 토큰 | 정적 SCSS | JSON theme tokens (color/spacing/typo/radius/shadow) + 다크모드/테마 스위처 |
| 데이터 바인딩 | 폼 데이터 1개 객체 | 외부 데이터소스(REST/GraphQL/WebSocket) + 다중 변수 + 캐시 |
| 액션 | submit만 | onClick → API call / navigate / setState / openModal — 액션 그래프 |
| 멀티페이지 | 단일 폼 | Page/Route 개념, App Shell + 슬롯, 라우트 가드 |
| 권한 | 없음 | role/capability 기반 show/disable/readOnly |
| 반응형 | 없음 | breakpoint별 props override (mobile/tablet/desktop) |
| 스키마 버전 | 없음 | `$schemaVersion` + 마이그레이션 파이프라인 |
| 코드 분할 | 단일 번들 | type별 dynamic import, 차트·맵 lazy |
| i18n | 부분 | 스키마 키 → locale 매핑, RTL |
| 텔레메트리 | 없음 | 컴포넌트별 errorBoundary + 사용/렌더 메트릭 훅 |
| 협업 | 없음 | yjs/CRDT 기반 공동 편집 (선택) |

### 패키지 구조 제안

```
packages/
├── designer-core/        # 스키마 타입, 표현식, 마이그레이션
├── designer-runtime/     # 운영 렌더러 (얇음, ≈100KB 목표)
├── designer-editor/      # form-js-editor 확장
├── designer-components/  # 공통 컴포넌트 라이브러리 (viewer/editor 양쪽 등록)
├── designer-theme/       # 디자인 토큰 + CSS 변수 발행
├── designer-data/        # 데이터소스 프로바이더 (REST/GQL/Static/Computed)
└── designer-actions/     # 액션 디스패처 + 핸들러 레지스트리
```

핵심 원칙: **에디터/Palette/Properties는 빌드 타임 전용** — 운영 번들에서 제거.
런타임은 `schema + dataSources + actions + theme` 만 받아 렌더.

### 스키마 확장 예시

```json
{
  "$schemaVersion": "2.0",
  "theme": "default-dark",
  "dataSources": {
    "users": { "type": "rest", "url": "/api/users", "refetch": "5m" }
  },
  "pages": [{
    "path": "/users",
    "components": [{
      "type": "table",
      "data": "{{ users.items }}",
      "columns": [...],
      "responsive": { "mobile": { "hidden": ["email"] } },
      "permissions": { "visible": ["admin","manager"] },
      "actions": {
        "onRowClick": [
          { "type": "navigate", "to": "/users/{{ row.id }}" }
        ]
      }
    }]
  }]
}
```

### 추가해야 할 코어 메커니즘

1. **DataSourceManager** — `useBinding('{{ users.items }}')` 훅. Suspense + cache + revalidation. 컴포넌트는 데이터 출처를 모름.
2. **ActionDispatcher** — 액션 타입 레지스트리(`navigate`, `httpRequest`, `setState`, `emit`, `openModal`, `toast`). 시퀀스/조건/에러 핸들러 지원.
3. **ThemeProvider** — JSON 토큰 → CSS 변수 주입. 컴포넌트는 토큰 이름만 참조.
4. **PageRouter** — JSON 라우트 맵 → React Router/wouter 어댑터. 가드 훅.
5. **ResponsiveResolver** — 활성 breakpoint에 맞는 props 머지.
6. **PermissionGuard** — 권한 체크 HOC, 미허가 시 컴포넌트 자체 렌더 스킵.
7. **SchemaMigrator** — 버전 간 변환 (`v1 → v2`). 운영 스키마는 항상 최신으로 정규화.
8. **ErrorBoundary per component** — 한 컴포넌트 실패가 페이지 전체를 죽이지 않게.
9. **LazyComponentLoader** — 무거운 type은 `import('./Chart')`로 지연 로드.
10. **TelemetryHook** — `onRender`, `onError`, `onAction` 훅 — 운영 가시성.

### 에디터 측 보강 (전문가용)

- **Outline 패널**(컴포넌트 트리) — 깊은 중첩 탐색
- **Breakpoint 토글 미리보기**(데스크톱/태블릿/모바일)
- **데이터소스 모킹 패널** — 실제 API 없이도 미리보기
- **테마 토큰 편집기** — 색/타이포 라이브 변경
- **변수/표현식 자동완성** — 데이터소스 스키마 인식
- **컴포넌트 트리 검색·치환·복제**
- **변경 비교(diff)** — 스키마 두 버전 비교
- **롤백 가능한 publish** — draft/staged/live 상태 관리
- **가져오기/내보내기** — JSON, 그리고 정적 React 코드 export(eject)

### 보안·운영

- 표현식은 FEEL/JSONata처럼 **샌드박스된 식만 허용** (eval 금지) — form-js 기본 유지
- HTML/IFrame 컴포넌트는 **DOMPurify + sandbox 속성 강제**
- CSP 호환 (인라인 스크립트 금지)
- 스키마는 **AJV로 운영 부팅 시 검증** → 깨진 스키마 차단

### 단계별 진행 순서

1. **Phase 1 — 분리·기반**: `designer-runtime` 패키지 분리, 스키마 버전 필드 + 마이그레이터, 컴포넌트별 ErrorBoundary
2. **Phase 2 — 컴포넌트·테마**: Card/Stack/Tabs/Modal/Table/Chart 1차 + 디자인 토큰 + 다크모드
3. **Phase 3 — 데이터·액션**: DataSourceManager + ActionDispatcher + 표현식 바인딩 확장 (`{{ ds.x }}`)
4. **Phase 4 — 멀티페이지·권한**: Router + PermissionGuard + App Shell 슬롯
5. **Phase 5 — 에디터 UX**: Outline, 반응형 미리보기, 데이터 모킹, 토큰 편집기
6. **Phase 6 — 운영화**: publish 워크플로(draft/live), 텔레메트리, lazy load, A/B variant

---

## 추가 요청 내용 ↔ 설계 매핑

### 1. shadcn급 컴포넌트 라이브러리 선정

> **⚠ 본 서브섹션은 Phase 1 §2 spike 로 재정비됨 (2026-04-17)**. 아래 초기 탐색 (옵션 A/B 이진 비교, Radix vs Ark UI, 대안 표 라이브러리 비교) 은 **역사적 탐색 기록**으로만 의미를 가지며, **현행 결정은 `docs/TRD.md §3` + `docs/phase-1-plan.md §2` 참조**.
>
> **확정 요약 (2026-04-17)**:
> - **UI 프리미티브**: Radix UI + `preact/compat` 본체 (조건부 채택 — preact overrides · Portal.container `<main>` 주입 · 버전 업데이트 시 parity 재실행) / Zag.js 저수준 + 자체 Preact 어댑터 fallback. 5 후보 (Radix · Zag+자체 · Ariakit · Headless UI · 자작) 동일 게이트 실측: gzip · axe · pageerror · workaround LOC. Ariakit 탈락 (pageerror 25건), Headless UI 3순위 (46.17 KB 초과). 자작(E) 는 Dialog 한정 실측 진행 중, TRD 에서는 extrapolated fallback only 표기. 수치 상세: TRD §13.1.
> - **테이블**: TanStack Table v8 + TanStack Virtual + dnd-kit 확정 — 1만 행 평균 FPS 59.99 (합격선 55), 멀티헤더 3단계 · dnd-kit 컬럼 이동 · preact/compat hooks 호환 전부 통과. **PD1-A 자동 확정** — ADR-0001 D1/D6 "단일 컴포넌트 DOM · 픽셀 파리티" 전제 유지, canvas 예외 조항 불필요. Glide Data Grid 폴백 경로 미사용.
> - **결정서**: `docs/adr/0002-ui-primitives.md` (작성 중 · 자작 E Dialog 실측 완료 후 머지) · `docs/adr/0003-table-library.md` (작성 중).

**AI 친화 요건 충족 방법**
- 모든 컴포넌트에 **MDX/JSON spec** 동봉 (`spec.json` — props/슬롯/예시)
- 컴포넌트별 **few-shot 예시 디렉토리** (`examples/*.schema.json`)
- 에디터에 **자연어 → 컴포넌트 추가** 명령(LLM이 spec 보고 schema 생성)

### 2. 컴포넌트 추가가 편해야 함

- **컴포넌트 스캐폴더 CLI**: `npm run create:component MyCard`
  - 생성물: `Component.tsx` + `spec.json`(props 스키마) + `properties.ts`(에디터 패널) + `examples/*.json` + `palette.ts`(아이콘/그룹)
- **단일 매니페스트 패턴** — 한 파일(`MyCard.tsx`)에 viewer/editor 메타까지 모두 선언:
  ```ts
  export const MyCard = defineComponent({
    type: 'card',
    name: 'Card',
    group: 'container',
    propsSchema: { padding: { type: 'number', default: 16 } },
    render: (props) => <div ...>...</div>
  });
  ```
- **자동 등록**: `import.meta.glob('./components/*.tsx')` 로 빌드 타임 자동 수집, 등록 보일러플레이트 제거.
- **HMR 지원** — 컴포넌트 작성 → 즉시 에디터 반영 (Vite 기반 dev 서버 추가).

### 3. 디자인 즉시 렌더링 + JSON → 런타임 코드화

- **Live Preview 패널** (Phase 5에 포함): 에디터 우측에 `designer-runtime` 인스턴스 임베드 → 입력 즉시 반영
- **JSON → React 코드 export** (`eject` 기능):
  - `npm run codegen schema.json out/Page.tsx` — 정적 JSX 생성
  - 표현식은 `useBinding()` 호출로, 액션은 핸들러 함수로 변환
  - 용도: 런타임 의존 제거가 필요한 페이지(SEO, 초기 로드 최적화)나 디버깅
- **양방향 보장 X** — eject는 일방통행. 다시 JSON으로 돌아가지 않음 명시.
- **Sandbox iframe 미리보기** — 에디터에서 `?preview=1` URL로 열어 진짜 운영 런타임으로 검증.

### 4. 프로퍼티 패널 JSON 커스터마이징

컴포넌트 작성자가 **propsSchema(JSON)**만 선언하면 에디터가 패널 UI를 자동 생성:

```ts
propsSchema: {
  title:    { type: 'string',  label: '제목', i18n: true },
  variant:  { type: 'enum',    options: ['primary','ghost'] },
  padding:  { type: 'number',  min: 0, max: 64, step: 4 },
  data:     { type: 'binding', dataShape: 'array' },   // 데이터소스 자동완성
  onClick:  { type: 'action',  events: ['navigate','httpRequest'] },
  visible:  { type: 'expression' }                      // FEEL editor
}
```

- **Editor Widget Registry**: `string`/`number`/`enum`/`color`/`spacing`/`binding`/`action`/`expression`/`asset` 등 위젯을 라이브러리화 → 신규 컴포넌트는 위젯 조합만으로 패널 완성
- **그룹·접기·조건부 표시**: `group`, `collapsed`, `showIf` 메타로 패널 구조화
- **컴포넌트 라이브러리별 프리셋**: shadcn variant 같은 토큰 세트를 JSON으로 노출 → 프로젝트 단위로 교체 가능

### 5. Localization (한국어 우선)

- **스키마 i18n 모드**:
  ```json
  { "label": { "$i18n": "user.name.label", "ko": "사용자 이름", "en": "User Name" } }
  ```
- **런타임 LocaleProvider**: `locale="ko"` 주입 → 컴포넌트 내부 자동 해석
- **번들 분리**: `locales/ko.json`, `locales/en.json` — lazy load
- **숫자/날짜/통화**: `Intl.NumberFormat`, `Intl.DateTimeFormat` 어댑터 + 한국 로케일 기본
- **에디터 자체 UI**: 메뉴/팔레트/속성 라벨도 i18n. 한국어를 1차 언어로 번역
- **검증 메시지 i18n**: form-js 기본 메시지 한국어 번역 패키지 추가
- **RTL**: 1순위 아님. 인터페이스만 LTR/RTL 분기 가능하게 토큰화해 두고 후속.

### 패키지 구조 갱신 (요구사항 반영)

```
packages/
├── designer-core/        # 스키마 타입, 표현식, 마이그레이션, propsSchema 정의
├── designer-runtime/     # 운영 렌더러 (Preact + preact/compat)
├── designer-runtime-react/  # (옵션 B 채택 시) shadcn/ui 사용용 React 런타임
├── designer-editor/      # 에디터 + Live Preview + propsSchema → 패널 자동 생성
├── designer-components/  # Radix/Ark + Tailwind 기반 컴포넌트 (Card/Tabs/Modal/...)
├── designer-table/       # TanStack Table 래퍼 (편집/필터/멀티헤더/컬럼이동)
├── designer-theme/       # 디자인 토큰 + Tailwind preset
├── designer-data/        # 데이터소스 프로바이더
├── designer-actions/     # 액션 디스패처
├── designer-i18n/        # ko/en 번들 + 포맷 어댑터
├── designer-codegen/     # JSON → React/Preact 정적 코드 export
└── designer-cli/         # 컴포넌트 스캐폴더 + codegen 명령
```

### 진행 순서 보정

- Phase 2에 **TanStack Table 래퍼**와 **Tailwind/Radix 베이스** 우선 포함
- Phase 5에 **propsSchema 기반 자동 패널** + **컴포넌트 스캐폴더 CLI** 추가
- Phase 6에 **codegen(eject)** 와 **i18n 한국어 번들 1차 완성** 포함
- 별도 **Phase 0 — 결정 게이트**: Preact 단일 vs React 런타임 분리(옵션 A/B) 선택. 이후 모든 패키지 결정에 영향.

---

## 운영(Production) 등급으로 끌어올리기 위한 추가 기능

> 앞 섹션이 "어떻게 만들지"라면, 이 섹션은 **만든 걸 어떻게 안전하게 굴릴지**.

### 1. 스키마 라이프사이클 & 배포 인프라 (P0)
- **스키마 저장소**: DB(테이블 + 버전 row) + 객체 스토리지(immutable snapshot) 이중화. 검색은 DB, 서빙은 CDN/S3.
- **publish 워크플로**: `draft → staged → live` 상태 머신, 승인자 지정, 변경 사유 기록 필수.
- **버전·diff·rollback**: 모든 publish는 새 버전 생성. 1-클릭 이전 버전 복원.
- **환경 분기**: `env=dev|staging|prod` 별 독립 라이프사이클. 환경 간 promote 명령.
- **카나리/점진 배포**: 사용자 % 또는 세그먼트(테넌트/지역)에 새 버전 노출.
- **CDN invalidation**: publish → 즉시 캐시 무효화 + ETag 기반 클라이언트 캐시.
- **Schema-as-Code 옵션**: Git에 스키마 미러링 → PR 리뷰 가능.

### 2. 인증·인가 (P0)
- **AuthN 통합**: OIDC/SAML/JWT — `AuthProvider` 어댑터로 외부 IdP 연결.
- **AuthZ 정책 엔진**: OPA(Rego) 또는 Cerbos 통합 선택지. 페이지·컴포넌트·액션·필드 레벨까지 정책 평가.
- **세션·토큰 갱신**: silent refresh, 만료 시 graceful re-auth.
- **CSRF 보호**: 액션 → 외부 API 호출 시 토큰 자동 첨부.
- **세밀한 권한 모델**: `role × resource × action` 매트릭스, 운영 중 정책 수정 가능.

### 3. 감사 로그·컴플라이언스 (P0)
- **Audit log**: 누가/언제/어떤 스키마를 publish했나, 어떤 액션이 실행됐나 — append-only.
- **데이터 접근 로그**: PII가 포함된 데이터소스 접근 기록.
- **PII 태깅**: 스키마 필드에 `sensitivity: "pii"` 메타 → 로그·스크린샷·텔레메트리에서 자동 마스킹.
- **데이터 거주지(residency)**: 테넌트별 스키마/데이터 저장 지역 강제.
- **컴플라이언스 프리셋**: 한국 PIPA / EU GDPR / HIPAA 모드 — 동의 관리, 데이터 삭제 요청, 보존 기간.

### 4. 관찰가능성 (Observability) (P0)
- **에러 추적**: Sentry/Datadog 통합. 컴포넌트별 ErrorBoundary가 스키마 type, props, 데이터소스 컨텍스트 첨부.
- **RUM/Web Vitals**: LCP/INP/CLS 컴포넌트별 추적, 회귀 알림.
- **사용자 행동 분석**: PostHog/Amplitude — 클릭/입력/이탈, 컴포넌트 사용 빈도.
- **분산 트레이싱**: 액션 → API → DB OpenTelemetry 트레이스ID 전파.
- **메트릭 노출**: Prometheus 엔드포인트 (`/metrics`) — 스키마 로드 수, 에러율, 액션 지연.
- **Dead schema 탐지**: 30일 미사용 스키마/컴포넌트 자동 보고.

### 5. 안정성·복원력 (P0~P1)
- **재시도/회로차단기**: 데이터소스/액션 실패 시 exponential backoff, circuit breaker 패턴.
- **Optimistic UI + 롤백**: 액션 낙관적 반영 → 실패 시 원복.
- **충돌 해결**: 동시 편집 데이터에 ETag/version 검사 → 409 시 사용자 안내.
- **Graceful degradation**: 데이터소스 다운 시 캐시/스켈레톤/이전값 표시.
- **오프라인 지원(선택)**: Service Worker 캐시 + 액션 큐 + 복귀 시 동기화.
- **Stale data 표시**: 캐시 데이터에 "방금 전" / "오래된 데이터" 시각 표시 토큰.

### 6. CI/CD & 품질 게이트 (P0)
- **스키마 lint 룰 엔진**: 접근성/성능/보안/네이밍 규칙. PR에서 차단.
- **Visual regression**: 스키마 변경 전후 스크린샷 diff (Chromatic/Percy 또는 Playwright snapshot).
- **E2E 자동 시나리오**: 스키마 → Playwright 액션 시퀀스 자동 생성·실행.
- **PR 미리보기 환경**: 변경된 스키마를 PR마다 고유 URL로 배포.
- **Bundle 크기 회귀 차단**: 컴포넌트별 크기 추적, 임계 초과 시 PR 차단.
- **의존성 자동 업데이트**: Renovate/Dependabot + 자동 머지(테스트 통과 시).

### 7. 보안 강화 (P0)
- **Secret 관리**: 데이터소스 자격증명은 절대 스키마에 넣지 않음 — Vault/Secrets Manager 참조.
- **CSP 운영 헤더**: nonce 기반, 인라인 스크립트 금지 검증.
- **SCA 스캐닝**: Snyk/Trivy — 의존성 CVE 게이트.
- **Rate limiting**: 액션 디스패치 사용자/IP 단위 제한.
- **Input 화이트리스트**: 표현식·템플릿에 허용 함수 화이트리스트.
- **iframe sandbox 강제**: HTML/IFrame 컴포넌트 sandbox 속성 + allowlist.
- **취약점 응답 프로세스**: 심각 CVE 발견 시 hot-patch 배포 경로 정의.

### 8. 성능 (운영 SLO) (P1)
- **SSR/SSG**: 첫 페인트 빠르게 — Next/Astro 어댑터 또는 자체 prerender.
- **Edge rendering(선택)**: Cloudflare/Vercel Edge — 지역 가까운 곳에서 렌더.
- **Critical CSS 인라인**, 폰트 preload.
- **이미지 최적화**: srcset/AVIF/WebP, CDN 변환(Imgix/Cloudinary).
- **컴포넌트 lazy + prefetch hints**: 가시 영역 외 컴포넌트는 idle 시 prefetch.
- **메모리 누수 감시**: long-session 누수 자동 알림.
- **SLO 대시보드**: p95 LCP, 에러율, 가용성 — 목표 대비 추적.

### 9. 접근성·UX 안정성 (P0~P1)
- **WCAG 2.2 AA 자동 체크**: axe-core 빌드 게이트, 에디터 실시간 경고.
- **키보드/스크린리더 검증**: 컴포넌트 단위 자동 테스트.
- **표준 상태 컴포넌트**: Loading/Empty/Error/NoPermission — 모든 컴포넌트가 자동 노출.
- **Toast/Notification 큐**: 우선순위, 중복 제거, 접근성.
- **Print/Export**: 운영 화면 → PDF/Excel 출력 어댑터 (보고서 수요 대응).
- **사용자 피드백**: "이 화면 이상해요" 버튼 → 스키마 ID + 콘솔로그 + 스크린샷 자동 첨부.

### 10. 운영 도구·플래그 (P1)
- **Feature Flag 통합**: GrowthBook/LaunchDarkly/Unleash — 스키마 조건부 노출, 컴포넌트 단위 가드.
- **A/B 테스트 변형**: 한 페이지의 variant 묶음 → 자동 트래픽 분배 + 메트릭 수집.
- **Maintenance/공지 모드**: 전역 배너, 부분 차단.
- **Onboarding 투어**: 신규 컴포넌트 도입 시 사용자 가이드 자동 생성.
- **콘솔(Admin)**: 라이브 스키마 검색, 사용량, 빠른 롤백 버튼.

### 11. 멀티테넌시·기업 통합 (P1, 필요 시)
- **테넌트 격리**: `tenantId`별 스키마/테마/데이터소스/권한 오버라이드.
- **화이트라벨**: 브랜드별 토큰·로고·도메인.
- **SSO 디렉토리 동기화**: SCIM 사용자/그룹 동기.
- **per-tenant 사용량 한도**: 호출 수, 스키마 수.
- **Region pinning**: 테넌트별 데이터/연산 지역 고정.

### 12. 협업·거버넌스 (P1)
- **승인 워크플로**: publish 전 1~N명 승인 — 컴포넌트/스키마/테마 별 정책.
- **변경 알림**: Slack/Teams/이메일 — publish, 롤백, 에러율 급증.
- **역할 분리**: Designer / DataEngineer / Releaser / Viewer — 각 권한 정의.
- **스키마 코드 리뷰**: diff + 인라인 코멘트 + 승인 기록.
- **Deprecation 알림**: 사용 중인 컴포넌트가 deprecated 되면 영향받는 스키마 자동 식별.

### 13. 인프라·SRE (P0)
- **Health check**: `/healthz`(liveness) `/readyz`(readiness) 표준.
- **Graceful shutdown**: 진행 중 요청 완료 후 종료.
- **Backup/Restore**: 스키마 DB 정기 백업 + 복구 리허설.
- **Disaster Recovery**: RPO/RTO 목표 정의, region failover 시나리오.
- **컨테이너/배포**: Dockerfile, Helm chart, K8s 매니페스트, autoscaling 룰.
- **블루-그린 또는 점진 배포**: 런타임 자체 무중단 업그레이드.

### 14. AI 운영 보조 (P1~P2)
- **자연어 → 스키마**: AI-friendly spec.json 활용해 LLM이 컴포넌트 조립.
- **AI PR 리뷰**: 스키마 변경 diff → 위험도/접근성/성능 회귀 자동 코멘트.
- **자동 카피 개선**: 라벨/툴팁 LLM 제안 (한국어/존댓말 일관성).
- **이상 탐지**: 사용 패턴 이상치 자동 알림 (액션 실패율 급증, 특정 컴포넌트 에러 폭증).
- **자동 컴포넌트 추천**: 유사 페이지 패턴 학습 → "이런 화면엔 보통 X 컴포넌트가 들어갑니다".

> AI가 **직접 화면을 디자인**하는 기능은 별도 섹션 "AI 디자인 — Skill 중심 접근" 참조.

---

### 우선순위 요약

**런칭 전 필수(P0)**
- §1 스키마 라이프사이클 + rollback
- §2 AuthN/Z + 세션
- §3 Audit log + PII 마스킹
- §4 에러 추적 + Web Vitals
- §5 재시도 + graceful degradation + 표준 상태 컴포넌트
- §6 CI/CD + visual regression + bundle 게이트
- §7 Secret 관리 + CSP + SCA
- §9 WCAG 자동 게이트
- §13 Health check + Backup + 블루-그린

**스케일 단계(P1)**
- §8 SSR + 성능 SLO
- §10 Feature Flag + A/B
- §11 멀티테넌시(제품 모델에 따라)
- §12 승인 워크플로 + 알림
- §14 AI 보조

**고도화(P2)**
- Edge rendering, CRDT 협업, AI 자동 최적화 제안

---

## AI 디자인 — Skill 중심 접근

> 별도 LLM 인프라(에이전트·RAG·eval) 구축 없이, **Claude Code(또는 동등한 에이전트 클라이언트) + Skills + CLI** 조합으로 AI 화면 디자인 실현.

### 왜 MCP 대신 Skill인가
- form-js는 **파일 기반 코드 프로젝트** — Claude의 Read/Write/Edit/Glob/Bash로 충분히 조작 가능
- MCP는 별도 서버 프로세스/생명주기 관리·디버깅 비용 발생
- Skill은 마크다운 파일 — 버전관리·리뷰·배포가 단순
- 동적 작업은 `designer-cli` Bash 호출로 위임

### 구성 요소

#### ① Skill 파일들

```
.claude/skills/
├── designer/SKILL.md                   # 진입점 (when/why/how trigger)
├── designer/component-catalog.md       # 컴포넌트 찾는 법 + 카테고리 가이드
├── designer/recipes.md                 # CRUD/대시보드/위저드 템플릿
├── designer/data-binding.md            # {{ ds.x }} 바인딩 룰
├── designer/design-tokens.md           # 토큰만 사용 강제
├── designer/i18n-ko.md                 # 한국어 라벨/존댓말 규칙
├── designer/a11y.md                    # WCAG 체크리스트
├── designer/anti-patterns.md           # do/don't
├── designer/validation-workflow.md     # designer-cli validate 사용법
└── designer/publish-workflow.md        # draft → staged → live
```

`SKILL.md` frontmatter 예:
```yaml
---
name: designer
description: form-js 기반 화면 디자인 작업. *.schema.json 작업이나 "화면 만들어"/"페이지"/"design" 키워드 시 활성화. 컴포넌트 추가·수정·바인딩·검증·배포 전반.
---
```

#### ② 컴포넌트 스펙 (코드와 함께 보관)

```
packages/designer-components/Card/
├── Card.tsx
├── spec.json              # AI가 읽는 메타 (purpose/whenToUse/propsSchema/a11y)
├── examples/
│   ├── basic.schema.json
│   └── with-actions.schema.json
└── properties.ts
```

Skill은 "스펙 위치는 `packages/designer-components/<Name>/spec.json`" 만 알려주면 됨 → Claude가 Glob/Read로 자동 탐색.

#### ③ Slash Commands (`.claude/commands/`)

```
/design-page <설명>       → 신규 페이지 스키마 생성
/design-add <type>        → 컴포넌트 추가
/design-modify <설명>     → 부분 수정 ("이 표 컬럼 줄여")
/design-bind <필드> <ds>  → 데이터 바인딩
/design-recipe <name>     → 템플릿 적용
/design-validate          → designer-cli validate 호출
/design-preview           → 스크린샷 미리보기
/design-diff              → draft vs live 비교
/design-publish <env>     → 게시 (안전 게이트)
```

각 커맨드는 마크다운 한 장:
```md
---
description: 신규 페이지 스키마 생성
---
다음 설명 기반으로 새 페이지 스키마를 만들어줘: $ARGUMENTS

절차:
1. designer skill의 recipes.md 참조해 적합한 템플릿 선택
2. component-catalog.md 룰에 따라 컴포넌트 조립
3. design-tokens.md 룰 준수 (임의 색상/픽셀 금지)
4. 결과는 schemas/drafts/ 에 저장
5. designer-cli validate 자동 실행, 실패 시 수정 반복
```

#### ④ CLI 도구 (`designer-cli`)

```bash
designer-cli list-components [--category=container]
designer-cli spec <type>                 # spec.json stdout
designer-cli validate <file>             # AJV + lint
designer-cli preview <file> [--png]      # Playwright 헤드리스 → 브라우저/PNG
designer-cli diff <a> <b>
designer-cli publish <file> --env=...    # 안전 게이트 통과 시 게시
designer-cli check-prod-safety <file>    # 배포 전 위험 액션 점검
```

#### ⑤ Hooks (`.claude/settings.json`)

```jsonc
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit",
        "command": "case \"$CLAUDE_FILE_PATH\" in *.schema.json) designer-cli validate \"$CLAUDE_FILE_PATH\" ;; esac" }
    ],
    "PreToolUse": [
      { "matcher": "Bash",
        "command": "case \"$CLAUDE_COMMAND\" in *publish*) designer-cli check-prod-safety ;; esac" }
    ]
  }
}
```

#### ⑥ Subagents (선택)
- `designer-architect` — 큰 페이지 구조 설계 (별도 컨텍스트로 분리)
- `designer-reviewer` — 생성된 스키마 검토
- `designer-data-mapper` — 데이터소스 ↔ props 매핑 전담

#### ⑦ 프로젝트 CLAUDE.md
```md
# form-js Designer
화면 디자인 작업 시 `designer` skill 참조.
- 스키마: `schemas/**/*.schema.json`
- 컴포넌트 스펙: `packages/designer-components/*/spec.json`
- 검증/미리보기: `designer-cli`
```

#### ⑧ 플러그인 패키징
위 전부를 **Claude Code Plugin** 한 묶음으로 → `claude plugin install form-js-designer` 한 줄 설치.

### MCP 대비 손해 보는 것 (작음)
- 외부 클라이언트(Cursor 등)에서 즉시 사용 X — 그쪽 규칙 시스템에 별도 포팅 필요
- 동적 상태 보유 어려움 → 파일 경로 인자로 대체
- 구조화된 결과 반환 X → CLI는 JSON 출력으로 보완

### 진행 순서

**Phase 1 (1주)**
- `designer-cli` 골격: `list-components`, `spec`, `validate`
- 컴포넌트 spec.json 표준 + 3개 작성 (Card, Stack, Table)
- Skill: `SKILL.md`, `component-catalog.md`, `validation-workflow.md`

**Phase 2 (1주)**
- Slash commands 5개 (page/add/modify/validate/preview)
- `designer-cli preview` (Playwright 스크린샷)
- Skill: `recipes.md`, `data-binding.md`, `design-tokens.md`

**Phase 3**
- Recipes 3개 (CRUD 목록, 상세 폼, 대시보드)
- Skill: `i18n-ko.md`, `a11y.md`, `anti-patterns.md`
- Hooks (자동 검증/안전 게이트)

**Phase 4**
- 플러그인 패키징
- 사내 마켓플레이스 또는 GitHub 배포

---

## 라이선스 검토

### form-js 본체 라이선스 (Camunda/bpmn.io)
`/Users/jji/project/form-js/LICENSE` 기준 — **MIT 호환 + bpmn.io 워터마크 의무**.

**허용**
- 포크·수정·재배포·판매·서브라이선스 자유
- 상용/SaaS/온프레미스 운영 자유
- 본인 신규 패키지(`designer-*`)에 자체 라이선스(상용·프로프라이어터리 포함) 적용 가능
- `additionalModules`로 컴포넌트 확장 — **권장 사용 패턴, 라이선스 위반 없음**

**의무**
- 저작권 고지·라이선스 사본 배포물에 포함
- **PoweredBy 워터마크 유지** — `packages/form-js-viewer/src/render/components/PoweredBy.js` (파일 헤더에 *"This file must not be changed or exchanged"* 명시)
- `FormComponent.js:48` 에서 모든 폼 출력에 자동 렌더됨 — **시각적으로 가리거나 CSS로 숨기면 위반**
- 라이선스 원문: *"the watermark must stay fully visible and not visually overlapped by other elements"*

**위험 시나리오**
- ❌ PoweredBy.js 삭제·치환·수정
- ❌ CSS `display:none`, `visibility:hidden`, `opacity:0`, 음수 좌표, z-index 가림으로 워터마크 숨김
- ❌ form-js-viewer를 fork하여 PoweredBy 호출 제거
- ⚠️ "diagram"이라는 표현이 라이선스 문구에 있어 form(폼)에는 적용 안 된다는 해석 여지가 있으나 — 파일 자체에 명시적 보호 문구가 있으므로 **보수적으로 유지 권장**. 상업 운영 시 Camunda에 문의해 서면 확인 권장.

**Designer 운영 시 PoweredBy 처리 옵션**
1. 그대로 노출 (가장 안전)
2. 디자이너 푸터 영역에 자연스럽게 통합
3. **상용 라이선스 협상**: Camunda에 별도 라이선스 문의 — bpmn-js Enterprise 전례 있음

### 설계에 포함된 서드파티 라이브러리

| 라이브러리 | 라이선스 | 상용 OK | 비고 |
|---|---|---|---|
| **Radix UI Primitives** | MIT | ✅ | 권장 |
| **Tailwind CSS** | MIT | ✅ | |
| **CVA(class-variance-authority)** | Apache-2.0 | ✅ | |
| **Ark UI / Zag.js** | MIT | ✅ | Radix 대체재 |
| **TanStack Table v8** | MIT | ✅ | |
| **dnd-kit** | MIT | ✅ | |
| **Preact** | MIT | ✅ | form-js 기본 |
| **React (옵션 B)** | MIT | ✅ | |
| **didi** | MIT | ✅ | form-js 기본 |
| **AJV** | MIT | ✅ | |
| **DOMPurify** | Apache-2.0 또는 MPL-2.0 | ✅ | MPL 선택 시 *DOMPurify 자체 수정분만* 공개 의무 — 라이브러리로 사용은 무영향 |
| **Playwright** | Apache-2.0 | ✅ | |
| **Vite / Lerna** | MIT | ✅ | |
| **shadcn/ui (코드 복사)** | MIT | ✅ | 패키지가 아닌 복사 모델 |
| **Lucide Icons** | ISC | ✅ | shadcn과 자주 함께 |
| **Carbon Design System** | Apache-2.0 | ✅ | form-js-carbon-styles 기존 의존성 |
| **IBM Plex 폰트** | SIL OFL | ✅ | |
| **TanStack Virtual** | MIT | ✅ | |

### 주의/제외 라이브러리

| 라이브러리 | 문제 | 대응 |
|---|---|---|
| **Handsontable (v6 이후)** | 비상업 한정 / 상용 라이선스 필요 | 사용 금지 — TanStack/AG Grid Community로 대체 |
| **AG Grid Enterprise** | 상용 라이선스 필요 | Community만 사용 시 무료 (피벗·트리·집계 기능 제한) |
| **Chart.js, Recharts, Visx** | MIT | 차트 추가 시 안전 |
| **ECharts** | Apache-2.0 | 안전 |
| **Material UI** | MIT | 안전하나 Radix 권장과 중복 |
| **Ant Design** | MIT | 안전, 다만 디자인 토큰 충돌 가능 |
| **GPL/AGPL 라이브러리** | 카피레프트 — SaaS 노출 시 소스 공개 의무 | **전체 회피**. 의존성 추가 전 라이선스 확인 필수 |
| **Font Awesome Pro** | 상용 라이선스 필요 | 무료 버전 또는 Lucide/Heroicons 사용 |

### 결론

1. **계획상 의도한 모든 서드파티는 라이선스 클리어** — 무료 상용 OK
2. **유일한 실질 의무는 form-js의 PoweredBy 워터마크** — 운영 화면에 노출 유지 또는 상용 라이선스 협상
3. **신규 `designer-*` 패키지는 본인 자유**: 사내용 비공개, 듀얼 라이선스, 상용 모두 가능
4. **권장 운영 절차**:
   - SBOM 자동 생성 (`@cyclonedx/cdxgen` 등)
   - CI에 `license-checker` 게이트 → AGPL/GPL/상용 라이선스 의존 추가 차단
   - Renovate에 `licenseChange` 알림 활성화 — 의존성 업그레이드 시 라이선스 변경 감지
   - 배포물에 NOTICE/THIRD_PARTY_LICENSES 자동 생성

---

## 라이선스 100% 무이슈 스택 (2026-04-17 결정 → 갱신)

> **최종 결정**: form-js는 그대로 사용. **bpmn.io 워터마크는 노출하여 의무 충족.**
> 추가되는 모든 새 의존성은 permissive(MIT/Apache-2.0/ISC/BSD)로 한정.
>
> **UI 라이브러리·테이블 선택 갱신 (Phase 1 §2 spike, 2026-04-17)**: 아래 `#### UI 라이브러리` / `#### 테이블` 서브섹션의 후보 나열은 역사적 의존성 후보·라이선스 팩트 정리용이다. 실제 채택·탈락 여부와 채택 조건은 본 문서 위쪽 §1 스텁 + **`docs/TRD.md §3`** 에서 확정본을 읽어야 한다.

### 핵심 결정: form-js 유지 + 워터마크 노출

| 항목 | 결정 |
|---|---|
| 런타임 | `form-js-viewer` 확장 (Preact) |
| 에디터 | `form-js-editor` 확장 (Preact) |
| 워터마크 | **유지·노출** — `PoweredBy.js` 그대로 렌더 |
| 신규 의존성 | permissive 라이선스만 |

### 워터마크 노출 전략
- **위치**: form 하단 우측에 form-js 기본 렌더 — 그대로 둠 (`fjs-powered-by` 클래스)
- **금지 사항** (위반):
  - `display:none`, `visibility:hidden`, `opacity:0`
  - 음수 `position`, 화면 밖 이동
  - 다른 요소로 시각적 가림 (overlay)
  - `PoweredBy.js` 파일 수정·치환·삭제
- **허용 사항**:
  - 색상 톤만 디자인 시스템에 맞춤 (CSS 변수 `--cds-text-primary`)
  - 위치 조정은 가능하나 **fully visible** 유지 필수
  - 라이선스 페이지에 어트리뷰션 추가 (선택, 안전망)
- **상용 라이선스 옵션** (필요 시 추후): Camunda에 별도 협상 — bpmn-js Enterprise 전례 있음. 현재는 무료 옵션 채택.

### 의존성 매트릭스 (모두 무료·permissive·활발한 유지보수)

#### 런타임 코어 (form-js 베이스 + 추가)
| 용도 | 채택 | 라이선스 | 유지보수 | 비고 |
|---|---|---|---|---|
| UI 프레임워크 | **Preact** (form-js) + 신규 컴포넌트도 Preact 통일 | MIT | 활발 | preact/compat로 React 라이브러리 호환 |
| DI 컨테이너 | **didi** (form-js 기본) | MIT | 활발 | bpmn.io 소속이나 라이선스 클리어, 그대로 사용 |
| 표현식 평가 | **FEEL** (form-js 기본) + **JSONata** 보조 | MIT | 활발 | FEEL은 폼/조건, JSONata는 데이터 변환 |
| 스키마 검증 | **Ajv** + **Zod** | MIT | 매우 활발 | Ajv: JSON Schema, Zod: TS 타입 |
| 라우팅 | **wouter** 또는 **preact-iso** | ISC / MIT | 활발 | Preact 친화 (React Router도 preact/compat로 가능) |
| 데이터 페칭 | **TanStack Query** | MIT | 매우 활발 | preact/compat로 사용 |
| 상태 관리 | **Zustand** + **Jotai** | MIT | 활발 | preact/compat 호환 |
| 폼 로직 | **form-js 기본** + 필요 시 **React Hook Form**(compat) | MIT | 활발 | form-js의 폼 엔진 그대로 활용 |

#### UI 라이브러리
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| 헤드리스 프리미티브 | **Radix UI** | MIT | 접근성 표준, WAI-ARIA |
| 대안 헤드리스 | **React Aria Components** | Apache-2.0 | Adobe, 접근성 1급 |
| 스타일 | **Tailwind CSS v4** | MIT | 매우 활발 |
| 변형 패턴 | **CVA** + **tailwind-merge** | Apache-2.0 / MIT | shadcn 표준 |
| 컴포넌트 카탈로그 | **shadcn/ui (코드 복사)** | MIT | 패키지 X, 본인 코드화 |
| 아이콘 | **Lucide React** | ISC | 1500+ 아이콘 |

#### 테이블 (요구사항 핵심)
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| 헤드리스 테이블 | **TanStack Table v8** | MIT | 편집·필터·멀티헤더·정렬 모두 |
| 컬럼 드래그 | **dnd-kit** | MIT | TanStack 공식 예제 |
| 가상화 | **TanStack Virtual** | MIT | 대용량 데이터 |
| 셀 편집 | TanStack 패턴 + 자체 셀 컴포넌트 | MIT | |
| (보조) 고성능 그리드 | **Glide Data Grid** | MIT | Canvas 기반, Excel급 |
| ❌ AG Grid | (Community만 MIT) | Enterprise는 유료 — **회피** |
| ❌ Handsontable | 비상업 한정 — **금지** |

#### 차트
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| 표준 차트 | **Apache ECharts** | Apache-2.0 | Apache 재단, 매우 활발, 기능 풍부 |
| React 차트 | **Recharts** | MIT | React 친화 |
| 저수준 시각화 | **Visx** (Airbnb) | MIT | D3 기반, 컴포저블 |
| ❌ Highcharts | 비상업 한정 — **금지** |
| ❌ Chart.js (안전) | MIT | 사용 가능, 기능은 ECharts가 우위 |

#### 날짜·시간·국제화
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| 날짜 | **date-fns** | MIT | 트리쉐이커블 |
| 시간대 | **Luxon** | MIT | 시간대 필요 시 |
| i18n | **i18next** + **react-i18next** | MIT | 네임스페이스, 보간 |
| 포맷 | **Intl** 표준 | 표준 | NumberFormat/DateTimeFormat |
| 캘린더 | **react-day-picker** | MIT | shadcn 호환 |

#### 보안·검증
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| HTML 새니타이즈 | **DOMPurify** | Apache-2.0 듀얼 | Apache 트랙 사용 — 수정 시 의무 없음 |
| 마크다운 | **markdown-it** + **DOMPurify** | MIT/Apache | XSS 안전 |
| 표현식 화이트리스트 | 자체 (JSONata 함수 제한) | — | |

#### 인터랙션
| 용도 | 채택 | 라이선스 | 비고 |
|---|---|---|---|
| 토스트 | **Sonner** (Vercel) | MIT | shadcn 표준, 활발 |
| 캐러셀 | **Embla Carousel** | MIT | 가볍고 활발 |
| 코드 에디터 | **Monaco** 또는 **CodeMirror 6** | MIT | Monaco: 풍부, CM6: 가벼움 |
| 가상 키보드 | **react-aria** 자체 처리 | Apache-2.0 | |

#### 빌드·테스트·DX
| 용도 | 채택 | 라이선스 | 교체 이유 |
|---|---|---|---|
| 번들러 | **Vite** + **Rolldown** | MIT | webpack(MIT) 대비 빠름·활발 |
| 모노레포 | **pnpm workspaces** + **Turborepo** | MIT / MPL-2.0 | Lerna 대체 — 더 활발 |
| 단위 테스트 | **Vitest** | MIT | Mocha+Karma+Chai 묶음 대체 — 단일 도구 |
| E2E | **Playwright** | Apache-2.0 | 표준 |
| 시각 회귀 | **Playwright snapshots** | Apache-2.0 | Chromatic/Percy(유료) 회피 |
| 린트 | **ESLint** + **Biome** | MIT | Biome로 점진 이행 가능 (Rust 기반, 빠름) |
| 포맷 | **Prettier** 또는 **Biome** | MIT | |
| 타입 | **TypeScript** | Apache-2.0 | 표준 |

#### 폰트·디자인 자산
| 용도 | 채택 | 라이선스 |
|---|---|---|
| 본문 | **Inter** | SIL OFL |
| 한국어 본문 | **Pretendard** | SIL OFL |
| 모노 | **JetBrains Mono** | SIL OFL |
| 아이콘 세트 보조 | **Heroicons** | MIT |
| 아이콘 추가 | **Phosphor Icons** | MIT |

### 의도적으로 회피하는 것

| 항목 | 사유 |
|---|---|
| **모든 GPL/AGPL/SSPL/Commons Clause/BSL/ELv2** | 카피레프트·서비스 노출 의무 |
| **AG Grid Enterprise / Handsontable / Highcharts / Font Awesome Pro** | 상용 라이선스 |
| **MUI X Pro/Premium** | 상용 라이선스 (MUI 코어는 MIT라 무료) |
| **Tailwind UI(템플릿)** | 유료 라이선스 — shadcn은 무료 OK |
| **react-beautiful-dnd** | Atlassian 유지보수 종료 (deprecated) |
| **Karma** | 공식 deprecated → Vitest |
| **Lerna(레거시 모드)** | Nx로 흡수, 더 단순한 pnpm/Turborepo 권장 |

### 라이선스 무이슈를 강제하는 운영 장치

```yaml
# .github/workflows/license-gate.yml
- run: pnpm dlx license-checker-rseidelsohn --production \
        --excludePackages "your-internal-pkg" \
        --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;MPL-2.0;CC0-1.0;Unlicense;0BSD;Python-2.0"
- run: pnpm dlx @cyclonedx/cdxgen -o sbom.json
- run: pnpm dlx oss-attribution-generator generate --output dist/THIRD_PARTY_LICENSES.txt
```

- **block list**: GPL*, AGPL*, SSPL*, Commons-Clause, BSL, ELv2, "Custom" 자동 차단
- **PR 게이트**: 신규 의존성 추가 시 라이선스 검사 통과 필수
- **Renovate**: `packageRules`에 `matchUpdateTypes: ["major"]` + `licenseChange` 알림
- **Distribute**: 빌드 산출물에 `THIRD_PARTY_LICENSES` 자동 동봉
- **SBOM**: CycloneDX JSON, 보안 스캐너(Snyk/Trivy)와 호환

### 패키지 구조 (form-js 모노레포에 추가)

```
form-js/                           # 기존 form-js 모노레포 그대로 사용
├── packages/                      # 기존 패키지 유지
│   ├── form-js-viewer/
│   ├── form-js-editor/
│   ├── form-js/
│   ├── form-js-playground/
│   ├── form-js-carbon-styles/
│   ├── form-json-schema/
│   ├── designer-core/             # ★ 신규 — 스키마 타입, 마이그레이션
│   ├── designer-components/       # ★ 신규 — Card/Stack/Tabs/Modal 등 (Preact)
│   ├── designer-table/            # ★ 신규 — TanStack Table 래퍼
│   ├── designer-chart/            # ★ 신규 — ECharts/Recharts (compat)
│   ├── designer-theme/            # ★ 신규 — Tailwind preset + 토큰
│   ├── designer-data/             # ★ 신규 — TanStack Query 데이터소스
│   ├── designer-actions/          # ★ 신규 — 액션 디스패처
│   ├── designer-i18n/             # ★ 신규 — ko 번들
│   ├── designer-codegen/          # ★ 신규 — JSON → JSX export
│   └── designer-cli/              # ★ 신규 — validate/preview/publish
├── .claude/
│   ├── skills/designer/           # ★ Skills
│   ├── commands/                  # ★ Slash commands
│   └── settings.json              # ★ Hooks
└── tools/
    ├── license-gate/              # ★ CI 라이선스 게이트
    └── sbom/                      # ★ SBOM 생성
```

### 진행 순서 (form-js 베이스 유지)

**Phase 0 — 기반 다지기**
- 기존 form-js 모노레포에 새 `designer-*` 패키지 추가
- pnpm/Turborepo 도입은 선택 (Lerna 유지도 OK)
- Vitest로 점진 이행 (Karma는 form-js가 사용 중 → 신규 패키지부터 Vitest)
- License-gate CI + SBOM 자동화
- 컴포넌트 spec.json 표준 정의

**Phase 1 — 컴포넌트 1차 (form-js viewer 확장)**
- `designer-components`: Card/Stack/Tabs/Modal/Button 5개 → form-js `additionalModules`로 등록
- `designer-table`: TanStack Table 래퍼 (편집/필터/멀티헤더/컬럼이동)
- `designer-theme`: Tailwind 토큰 + 다크모드

**Phase 2 — 데이터·액션·라우팅**
- `designer-data` (TanStack Query, preact/compat)
- `designer-actions` (디스패처)
- 라우팅 = wouter (Preact 친화)
- FEEL + JSONata 바인딩

**Phase 3 — 에디터 확장 + Skill 통합**
- form-js-editor에 propsSchema 자동 패널 추가
- Live Preview (form-js viewer 임베드)
- Skills + Slash commands + designer-cli

**Phase 4 — 운영화**
- i18n 한국어 번들 (검증 메시지 포함)
- Permissions / Responsive / Schema migration
- 텔레메트리 / 감사 로그
- codegen(eject)
- **워터마크 노출 검증**: E2E 테스트로 PoweredBy 가시성 확인 (regression 차단)

### 비용 함의

- form-js 재사용 → **개발량 절감**, 검증된 viewer/editor 골격 활용
- **유일한 제약**: 워터마크 노출 (디자인 시스템에 자연스럽게 통합 필요)
- 신규 의존성은 모두 permissive — 라이선스 사고 차단

---

## 차후 계획: JSON 한 방 렌더 스킬 (2026-04-17 논의)

> 프로젝트 본체 완성 후 부가 스킬로 추가. 임의의 폼 JSON 파일을 디자이너 없이 **브라우저에 바로 렌더**해서 확인·공유하는 경량 프리뷰 채널.

### 배경
- 디자이너 내부에는 에디터 옆 Live Preview 패널이 포함될 예정 (Phase 5)
- 그와 **역할이 겹치지 않게** "designer 없이 JSON만으로 브라우저를 띄우는" 독립 스킬로 포지셔닝
- 쓰임새: QA·검증·PR 리뷰·버그 재현·디자이너 없이 현업 공유

### 스킬 형상 (초안)
- 진입: `/preview-schema <path>` 또는 클립보드/STDIN JSON
- 동작:
  1. 입력 JSON을 AJV + 스키마 버전 마이그레이터로 검증·정규화
  2. `@bpmn-io/form-js-viewer` + `designer-runtime` 만 로드하는 **최소 HTML**을 temp 디렉터리에 생성
  3. 로컬 정적 서버(or `file://`)로 기본 브라우저 오픈 — headless 아님, 실제 브라우저 가시 확인
  4. Playwright visible 모드로 E2E 자동 검증(옵션 플래그)
- 옵션:
  - `--schema-only` : 뷰어만
  - `--with-data <file>` : 프리필 데이터 같이 주입
  - `--env=prod|stage` : 운영 토큰·로케일 프로파일 로드
  - `--png` : 스크린샷만 저장하고 종료

### 설계 원칙
- **디자이너 의존 없음** — 에디터 패키지/에디터 설정 전혀 로드하지 않음 (번들/보안 경계 분리)
- **운영 런타임 동일성 보장** — 프리뷰가 실제 운영과 같은 `designer-runtime` 경로 타기 → "여기서 되던 게 운영서 깨짐" 회귀 방지
- **워터마크 노출 유지** — form-js PoweredBy 그대로 렌더 (라이선스 의무, E2E 가시성 테스트 포함)
- **실제 브라우저 검증 의무** — headless 측정만으로 완료 보고 금지, 항상 visible 브라우저로 한 번 확인 (memory: E2E 가시 검증 룰)
- **designer-cli preview 와 관계**: 본 스킬은 `designer-cli preview` 를 얇게 래핑하는 Claude Skill. CLI가 엔진, 스킬은 진입점·자연어 트리거.

### 구현 위치
- CLI 로직: `packages/designer-cli/src/commands/preview.ts` (기존 §AI 디자인 섹션의 `designer-cli preview` 확장)
- Skill 파일: `.claude/skills/preview-schema/SKILL.md` + 트리거 규칙(`*.schema.json` + "미리보기/preview/렌더" 키워드)
- Slash command: `.claude/commands/preview-schema.md`

### 진행 타이밍
- **Phase 1 본체 (1차 릴리스) 완료 이후**에 별도 작업으로 착수 (스코프 크리프 방지)
- 단, `designer-cli preview` 골격은 AI 디자인 Phase 2 에 이미 들어있으므로 — 스킬 래핑 자체는 그 위에 ~0.5d 정도로 얹을 수 있음
