# Form.io vs form-js(bpmn.io) 상세 비교

**작성일:** 2026-04-18
**목적:** form-js-designer 개선 방향 도출을 위해 Form.io의 강점을 폭넓게 정리
**범위:** 컴포넌트·로직·데이터·레이아웃·확장성·디자이너 UX·운영 기능

---

## 0. 근본 포지셔닝 차이

| 축 | form-js (bpmn.io) | Form.io |
|---|---|---|
| 정체성 | **JSON 폼 뷰어/에디터** (BPMN 에코시스템의 일부) | **폼 + API + 데이터 관리 플랫폼** |
| 주 사용처 | Camunda 프로세스의 User Task 폼 | 독립 업무 폼, 내부 도구, 엔터프라이즈 앱 |
| 런타임 | 정적 JSON + 클라이언트 렌더러 | 클라이언트 + (선택) 서버(API + MongoDB) |
| 스키마 철학 | 경량, 선언형, Camunda 연동 | 스키마=UI=validation=API=데이터 모델 (통합) |
| 라이선스 | MIT | MIT(core) + Commercial(Enterprise, PDF, Accessibility, Premium) |
| 핵심 의존 | Preact, FEEL | React/Bootstrap 계열, i18next, isolated-vm |

**결론:** form-js는 "폼 그리기 도구", Form.io는 "폼을 중심축으로 한 풀스택 플랫폼". 본 프로젝트는 form-js 계열을 쓰고 있으므로 Form.io의 강점을 **부분적으로 가져오는 전략**이 합리적임.

---

## 1. 컴포넌트 라이브러리

### 1-1. form-js (현재 기본판)

약 20종:
Text field, Text area, Number, Checkbox, Checkbox group, Radio, Select (single), Taglist, Date/Time, Image view, File picker, Hidden, Spacer, Separator, Button, Group, Dynamic List, IFrame, HTML, Table

### 1-2. Form.io (5개 카테고리, 35+종)

**Basic**
- Text Field, Text Area, Number, Password, Checkbox, Select Boxes(multi), Select, Radio, Button

**Advanced** ⭐ form-js 대비 큰 격차
- **Email** — 포맷 자동 검증
- **URL** — 자동 검증
- **Phone Number** — input mask
- **Tags** — 자유 태그 입력
- **Address** — 지오코딩, 프로바이더(Google/Azure Maps) 통합, 자동완성
- **Date / Time / Day** — 분리된 입력
- **Currency** — 통화·소수점·포맷
- **Survey** — matrix(행=질문, 열=척도) 컴포넌트
- **Signature** — touch/mouse 서명 → 이미지 변환

**Layout**
- HTML, Panel(접기/펴기), Columns, Field Set, Table, **Tabs**, Well

**Data** ⭐ form-js에 상응 없음
- **Hidden** — 메타데이터
- **Container** — 필드 묶음을 단일 key로
- **Data Grid** — 반복 행(테이블형) 데이터
- **Edit Grid** — 행별 모달 편집 + 테이블 뷰
- **Data Map** — key-value 컬렉션

**Premium** (엔터프라이즈 라이선스)
- **reCAPTCHA**
- **File** — 스토리지 프로바이더(S3/Azure/Google/URL/Base64) 통합
- **Nested Form** — 다른 폼을 하위 컴포넌트로 임베드(재사용)
- **Sketchpad**
- **Review Page** — 제출 전 요약 뷰

### 💡 form-js-designer 시사점
- **즉시 검토 가치**: Data Grid / Edit Grid / Container / Address / Signature / Survey / Review Page
- 본 프로젝트에는 **designer-table**이 이미 있으므로 **Data Grid로 자연스러운 진화** 가능
- Survey(matrix)는 한국 공공/의료 폼에서 매우 유용

---

## 2. 조건부 로직 / 동적 동작

### form-js
- FEEL(Friendly Enough Expression Language) 기반
- `conditional.hide` 중심 — 표시 제어가 대부분
- enable/disable·validation 상태 확장은 이슈 #4로 요청 중

### Form.io — **3단계(tier) 로직 엔진**

1. **Simple Conditions (UI)**
   - "when X equals Y, show/hide this field" 를 UI로 설정
   - 비개발자도 가능

2. **Advanced Conditions (JavaScript)**
   ```js
   show = (data.income < 50000) && (data.dependents > 2);
   ```
   - 모든 `data.*` 접근 가능
   - show/hide뿐 아니라 required·disabled 등으로 확장

3. **JSON Logic**
   - 선언형 규칙 (JS 실행 제약 환경용)
   - DB 저장·동적 생성·서버 재실행 가능

4. **Logic Engine** (상위 룰 엔진)
   - Trigger: Simple / JavaScript / Event / JSON Logic
   - Action: 속성 변경, schema 수정, value 설정, custom event emit
   - 즉, 값 변화→다른 필드 수정까지 DSL로 표현

5. **Calculated Values (`calculateValue`)**
   ```js
   value = data.qty * data.price;
   ```
   - 실시간 파생값 계산

### 💡 시사점
- 우리 FEEL만 쓰는 구조 → **3-tier 엔진(UI + JS + JSON Logic)** 이 큰 개선점
- **show/hide 외 readonly/disabled/required/custom** 까지 상태 확장
- **값 계산 훅**(`calculateValue`) 은 Expression 필드 이슈 #1073 과 닿아 있음

---

## 3. 유효성 검사

| 기능 | form-js | Form.io |
|---|---|---|
| required/min/max/pattern | ✅ | ✅ |
| 커스텀 검증 | 제한적 | ✅ JavaScript + JSON Logic |
| Unique (DB 수준) | ❌ | ✅ (Resources와 결합) |
| 서버-사이드 재검증 | ❌ | ✅ Isolated VM 기반 동일 스키마 재실행 |
| 다국어 검증 메시지 | 미약 | ✅ i18next 기반 |
| Debounced / async 검증 | 미약 | ✅ |

### 💡 시사점
- **클라이언트·서버 동일 스키마 재실행**은 폼 기반 시스템의 안전성 핵심
- Isolated-VM(또는 worker) 패턴을 참고해 경량 서버 런타임을 분리하는 방향 검토

---

## 4. 데이터 / 백엔드 통합

### form-js
- 철저히 클라이언트. `schema JSON ↔ data JSON` 교환만.
- Camunda Tasklist가 데이터/제출 담당.

### Form.io — **Forms-as-APIs**
- 폼을 드래그-드롭 하면 **REST API가 자동 생성**
- **Resources**: 폼 자체가 데이터 모델 + API (CRUD 자동)
- **Submissions**: MongoDB 기반 저장소 내장
- **Actions**: 제출 이벤트에 대해 선언적 핸들러
  - Email 발송, Webhook, Role 할당, Google Sheet push, 인증, 커스텀 액션
- **External Data Load**: Select 옵션을 외부 API에서 동적 로드

### 💡 시사점
- Form.io급 BaaS 수준은 과함. 단, **Actions 선언형**과 **External Data Load**는 디자이너에서 가치 큼
- "폼 스키마 + 액션 정의"를 함께 내보내는 패키지 포맷 고려

---

## 5. 멀티페이지 / 마법사 / 스테이지

### form-js
- 네이티브 미지원 → `camunda-community-hub/multipage-form-js-demo` 수준

### Form.io
- **Wizard**: Panel을 페이지 단위로 변환, Step navigation 자동
- **Nested Wizard**: Wizard 안에 Wizard 중첩
- **Progress bar** 자동 생성
- **Review Page**: 제출 전 요약/수정
- **Stages**: dev/test/prod 환경
- **Versioning**: 스테이지 단위 배포 JSON 스냅샷

### 💡 시사점
- **Wizard 변환 모드**는 차별화 포인트. Panel/Group을 "페이지 그룹"으로 바꾸고 step navigation 주입
- **Review/Summary 컴포넌트**는 현업 만족도 높음
- Stages/Versioning은 우리 WBS 구조(task별 상태 관리)와 닮아 있어 이식성 좋음

---

## 6. 파일 / 미디어

| | form-js | Form.io |
|---|---|---|
| File picker | ✅ 기본 | ✅ |
| Multi-file | 제한적 | ✅ |
| Drag-drop upload | 제한적 | ✅ |
| Storage providers | 직접 구현 | S3/Azure/Google/URL/Base64 |
| Preview (이미지/PDF) | ❌ 요청중(#1501) | ✅ |
| Signature | ❌ | ✅ (Advanced) |
| PDF Forms | ❌ | ✅ (기존 PDF에 overlay → 채워진 PDF 생성) |

### 💡 시사점
- **업로드 프리뷰**(#1501) + **Signature** + **Storage provider abstraction** 3종은 큰 업그레이드
- PDF forms는 엔터프라이즈 시장(관공서/보험)에서 강력

---

## 7. 확장성 / 플러그인 아키텍처

### form-js
- Custom components 가능 (Preact 기반, `escapeGridRender`·`ChildrenSlot`·`FormLayouter override` 4조건)
- Palette/Properties Panel 확장 가능
- **제약**: Camunda Web/Desktop Modeler에서는 custom 컴포넌트 import 불가 → 자체 호스팅 강제

### Form.io
- **Custom Component API**
  - `BaseComponent`(또는 유사) 상속
  - `schema()` / `builderInfo()` / `template()` 정적 메서드
  - `Formio.use({components})` 로 등록
- **Modules** (v4.5+)
  - 컴포넌트 + 템플릿 + 액션 + 번역 + 프로바이더를 하나의 번들로 배포
- **Plugins**
  - API 요청 인터셉트
  - 폼 라이프사이클 훅 (preRequest/preSubmit/postSubmit 등)
- **Template override**
  - `Templates.current.<component>.<mode>` 치환

### 💡 시사점
- 현재 우리 defineComponent/propsSchema 체계 → **Module 번들 단위 배포**로 승격 가능
- **Plugins (lifecycle hooks)** 은 로깅/분석/권한 체크 등에 유용
- Modeler 제약 문제는 **자체 디자이너를 만드는 본 프로젝트가 해결 가능한 지점** (차별화 포인트)

---

## 8. 템플릿 / 테마 / 스타일

### form-js
- Camunda 디자인 언어 고정 CSS
- CSS 변수 일부 제공
- 완전한 테마 교체는 소스 수정 수준

### Form.io
- **내장 템플릿**: Bootstrap 3/4/5, Bulma, USWDS, UK Gov Design System
- **Templates API**: 컴포넌트별 HTML 구조 자체 교체 가능
- Tailwind 등은 템플릿 오버라이드 + 커스텀 클래스로 래핑

### 💡 시사점
- **컴포넌트별 template override API** 도입은 큰 UX 향상
- 프리셋 테마 스킨 스위처(Light/Dark/Compact/Tailwind) 제공 고려

---

## 9. 국제화 (i18n)

### form-js
- 제한적. 이슈 #1169 장기 요청.

### Form.io
- **i18next** 내장
- 라벨·placeholder·옵션·검증 메시지 전부 번역
- 런타임 언어 전환 (`formio.language = 'ko'`)

### 💡 시사점
- 한국어 name·label 사용 이력상 **i18n 리소스 번들 + 런타임 전환**은 필수적으로 검토

---

## 10. 접근성 (a11y)

| | form-js | Form.io |
|---|---|---|
| semantic HTML | 기본 | ✅ |
| 키보드 네비 | 부분적 | ✅ |
| ARIA live | 부분적 | ✅ 개선중 |
| 컴플라이언스 모듈 | ❌ | ✅ (Enterprise 라이선스 별도) |

---

## 11. 오프라인 / 동기화

- form-js: 없음
- Form.io **Offline Mode**
  - 네트워크 실패 시 submission **queue**
  - 애플리케이션 상태 **로컬 캐시**
  - 온라인 복귀 시 자동 sync

### 💡 시사점
- 현장 업무(태블릿, 불안정 회선) 지원이 필요한 시장이면 큰 차별화

---

## 12. 디자이너 (Builder) UX

### form-js 디자이너
- 왼쪽 팔레트 · 가운데 캔버스 · 오른쪽 properties
- Drag & drop
- **Playground**: preview + input/output 데이터 시뮬
- Outline 트리 (우리 프로젝트에서 이미 개선 중)

### Form.io Builder 추가 기능
- **Component settings Modal** — 드롭 시 바로 모달로 설정
- **JSON Edit mode** — 스키마 직접 편집
- **Preview mode** — 별도 탭으로 렌더링 결과 확인
- **Component search** — 팔레트에서 검색
- **Copy/Paste/Duplicate** — 구조화된 복제(우리 프로젝트에서 구현 중)
- **Grid resize** — Columns 안에서 개별 col-span 드래그 리사이즈
- **Conditional logic wizard** — 단순 UI로 show/hide 규칙 설정
- **Component disable list** — 빌더에서 특정 컴포넌트 노출 제어

### 💡 시사점
- **JSON Edit 모드** + **Preview 탭**은 개발자·비개발자 모두에게 유용
- **Component search** + **custom 그룹**(#1431) 은 팔레트 UX 개선 저난이도
- **Grid resize 드래그**는 본 프로젝트 Layout 측에 매우 적합
- **Morph**(이슈 #1458)는 Form.io 에는 별도로 없는 form-js만의 진행중 기능 → 오히려 우리가 앞설 수 있는 지점

---

## 13. 제출/워크플로 자동화

### form-js
- 없음. Camunda가 담당.

### Form.io — **Actions**
- Email (템플릿, SMTP/SendGrid)
- Webhook (REST)
- Role Assignment
- Save Submission
- Google Sheet / Salesforce / 외부 커넥터
- Custom Action
- 모두 **조건부 트리거** 가능 ("특정 필드가 X일 때만")

### 💡 시사점
- 디자이너에서 "이 폼은 제출 시 X webhook을 호출"이라고 **선언적으로 붙이는 UI** 제공은 시장에서 강력

---

## 14. 운영/거버넌스 기능

| | form-js | Form.io |
|---|---|---|
| 스키마 버전 관리 | 없음(외부 git) | Stages + Version snapshot |
| 권한(폼별 role) | 없음 | Role-based access, Anonymous/Auth 분리 |
| 감사 로그 | 없음 | Audit Logs (Enterprise) |
| 사용자 관리 | 없음 | User Resources + Auth Actions |
| 테넌트 분리 | 없음 | Projects / Stages |

---

## 🎯 본 프로젝트 개선 로드맵 (우선순위)

### 🔥 Tier 1 — 즉시 가치 (디자이너 UX, 저~중 난이도)
1. **JSON Edit 모드 + Preview 탭** (별도 view로 스키마 직접 편집)
2. **팔레트 검색 + 커스텀 그룹**(#1431)
3. **Component Morph** (Checkbox ↔ Tag List 등, #1458 — form-js 본진도 진행중)
4. **Grid resize drag** (Columns 내 col-span)
5. **업로드 미리보기**(#1501), **Signature 컴포넌트**

### ⚡ Tier 2 — 핵심 역량 확장 (중 난이도)
6. **조건부 로직 3-tier 엔진**: Simple UI + Advanced JS + JSON Logic
7. **Calculated Values / Expression 필드**(#1073)
8. **Data Grid / Edit Grid / Container** (designer-table 확장)
9. **Wizard 모드 변환**: Panel/Group → 페이지 그룹 + step navigation + Review page
10. **i18n 리소스 번들 + 런타임 전환**
11. **Component Template Override API** (컴포넌트별 HTML 교체)

### 🏗️ Tier 3 — 플랫폼 승격 (고 난이도, 선택)
12. **Module 번들 포맷**: components + templates + actions + translations
13. **Plugins(lifecycle hooks)**: preSubmit/postSubmit/valueChange 등
14. **Actions 선언형 워크플로**: webhook/email/role 선언 UI
15. **서버-사이드 재검증 런타임** (Isolated VM/Worker 기반)
16. **Stages/Versioning**: 스키마 스냅샷 + dev/prod 배포
17. **Offline Mode**: queue + local cache + sync

### 🏢 Tier 4 — 엔터프라이즈 (도메인 확신 시)
18. **Address(지오코딩 프로바이더)**
19. **PDF Forms** (기존 PDF overlay → 채워진 PDF)
20. **Accessibility Compliance** 프로파일
21. **Audit Logs / RBAC**

---

## 📌 전략적 메모

- form-js의 **Morph** 작업은 Form.io에도 없는 기능 → 우리가 상류로 기여 가능한 지점
- 우리 프로젝트는 form-js를 기반으로 하므로 Form.io의 **데이터·API 플랫폼 측면**은 통째로 가져올 필요 없음. 대신 **디자이너 UX + 컴포넌트 + 로직 엔진** 영역이 ROI 높음
- Camunda Modeler 제약(custom 컴포넌트 import 불가)은 우리가 자체 디자이너 호스트를 운영하므로 이미 해소됨 → 이 **차별화 자산**을 크게 내세울 수 있음
- 한국어 name·커스텀 컨테이너 계약을 이미 갖고 있다는 점은 i18n·Module 번들 방향으로 자연스럽게 이어짐

---

## 출처

### Form.io
- [Form.io Features 전체](https://form.io/features/)
- [How Form.io Works](https://form.io/how-it-works/)
- [@formio/js 문서](https://formio.github.io/formio.js/docs/)
- [Form.io API Documentation](https://apidocs.form.io/)
- [Basic Components](https://help.form.io/userguide/forms/form-building/form-components)
- [Advanced Components](https://help.form.io/userguide/forms/form-building/form-components/advanced-components)
- [Data Components](https://help.form.io/userguide/forms/form-building/form-components/data-components)
- [Premium Components](https://help.form.io/userguide/form-building/premium-components)
- [Logic & Conditions](https://help.form.io/userguide/forms/form-building/logic-and-conditions)
- [Form Evaluations](https://help.form.io/developers/form-development/form-evaluations)
- [Conditional Logic 기능 페이지](https://form.io/features/form-conditional-logic-form-validation/)
- [Custom Component API](https://github.com/formio/formio.js/wiki/Custom-Components-API)
- [Custom Components (도움말)](https://help.form.io/developers/form-development/custom-components)
- [Modules](https://help.form.io/developers/modules)
- [Form Builder UI](https://help.form.io/userguide/forms/form-building/form-builder-ui)
- [Form Templates](https://help.form.io/developers/form-development/form-templates)
- [CSS Frameworks](https://help.form.io/developers/css-frameworks)
- [Translations](https://help.form.io/developers/form-development/translations)
- [Accessibility Compliance Module](https://help.form.io/developer-tool-ecosystem/accessibility)
- [Offline Mode](https://help.form.io/developers/offline-mode)
- [Stages](https://help.form.io/userguide/projects/stages)
- [Resources](https://help.form.io/userguide/resources)
- [PDF Forms](https://help.form.io/userguide/forms/pdf)
- [Multi-Page Form Wizards 기능 페이지](https://form.io/features/multi-page-form-wizards/)
- [Drag-and-Drop Builder 기능 페이지](https://form.io/features/drag-and-drop-form-builder-apis/)
- [Form CSS 기능 페이지](https://form.io/features/customizable-forms-with-css/)
- [Calculated Values 예제](https://formio.github.io/formio.js/app/examples/calculated.html)
- [Conditions 예제](https://formio.github.io/formio.js/app/examples/conditions.html)
- [Edit Grid 예제](https://formio.github.io/formio.js/app/examples/editgrid.html)
- [Conditional Wizard 예제](https://formio.github.io/formio.js/app/examples/conditionalwizard.html)
- [Nested Wizard Forms](https://help.form.io/faq/tutorials-and-workflows/nested-form-workflows/nested-wizard-forms)
- [Enterprise 9.7.0 E-Sign+ 릴리스](https://form.io/release-notes/)

### form-js (bpmn.io)
- [form-js Repository](https://github.com/bpmn-io/form-js)
- [form-js Issues](https://github.com/bpmn-io/form-js/issues)
- [form-js toolkit](https://bpmn.io/toolkit/form-js/)
- [form-js-examples](https://github.com/bpmn-io/form-js-examples)
- [multipage-form-js-demo](https://github.com/camunda-community-hub/multipage-form-js-demo)
- [extended-form-js](https://github.com/camunda-community-hub/extended-form-js)
- [Camunda Custom Components](https://docs.camunda.io/docs/apis-tools/frontend-development/forms/customize-and-extend/custom-components/)
