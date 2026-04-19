# form-js 커뮤니티 기능 요청 조사

**조사일:** 2026-04-18
**출처:** bpmn-io/form-js GitHub Issues (enhancement 라벨), bpmn.io 포럼, Camunda 블로그/문서, Camunda Community Hub

---

## 🔥 최근 자주 요청되는 기능 (GitHub enhancement)

### 1. 편집기/디자이너 개선
- **컴포넌트 모핑(Morph)** — Checkbox Group ↔ Tag List처럼 유사 컴포넌트 간 변환 (#1458)
- **Select/Radio/Checkbox Group/Tag List 옵션 순서 재정렬** (#1459)
- **컴포넌트 패널 커스텀 그룹** — 팔레트를 사용자 정의 그룹으로 조직화 (#1431)
- **미리보기 접기/펴기 화살표 위치 통일** — 우측 상단 고정 (#1423)
- **공용 bpmn-io properties panel로 마이그레이션** (#249)

### 2. 렌더링/동작 확장
- **조건부 렌더링·활성화 상태** — 다른 필드 값에 따라 show/hide/enable/disable (#4)
- **표현식(Expression) 필드 & Hidden 필드** — FEEL로 파생 데이터 생성 (#1073)
- **Text view 내용을 FEEL 표현식으로 지정** (#436)
- **Dynamic List maxRepetitions** — 반복 상한 옵션 (#1435)
- **유효성 오류 시 Submit 버튼 비활성화** (#1451)

### 3. 파일·문서
- **업로드 중 문서 미리보기(File Picker)** (#1501)
- **JSON 타입 문서 미리보기** (#1405)

### 4. 고전적 요구 (오래된 이슈, 여전히 요청 지속)
- **Multi-select checkbox** (#196)
- **필드 편집 비활성화(readonly 강화)** (#181)
- **다국어 번역(i18n)** (#1169)
- **커스텀 엘리먼트 팔레트 등록** (#123) — Viewer는 가능하지만 Camunda Modeler 임베드 불가

---

## 🧩 커뮤니티 허브 (Camunda Community Hub)

- **multipage-form-js-demo** — wizard / page flow / survey 등 멀티페이지 폼 (form-js 네이티브 미지원, 데모 수준)
- **extended-form-js** — 커뮤니티 포크, 기본판에 없는 컴포넌트 보강

---

## 📌 현재 form-js의 한계로 자주 언급되는 것

- 멀티페이지/마법사(Wizard) 네이티브 미지원 → Form.io와 자주 비교됨
- 커스텀 컴포넌트를 Camunda Modeler(Web/Desktop)에서 import 불가 → 자체 호스팅 필요
- 조건부 로직 제한적 — FEEL 기반이지만 show/hide 외 활성화/검증 상태 확장 요구 많음

---

## 🗺️ 본 프로젝트(form-js-designer)에 시사점

1. **Morph/옵션 재정렬/팔레트 커스텀 그룹** 은 디자이너 UX 영역이라 우리 designer-editor-host가 직접 담당 가능
2. **Wizard/멀티페이지** 는 커뮤니티 데모 수준에 머물러 있어 차별화 포인트가 될 수 있음
3. **조건부 활성화 상태** 및 **Expression/Hidden 필드** 는 Layouter·Renderer 확장과 연결됨
4. **File preview / JSON preview** 는 커스텀 컨테이너 계약(ChildrenSlot + Layouter override)과 결합 가능
5. **i18n** 과 **custom components 팔레트** 는 우리가 이미 한국어 name·커스텀 컨테이너를 쓰는 구조라 자연스러운 확장

---

## 출처

- [form-js Issues](https://github.com/bpmn-io/form-js/issues)
- [#4 Conditional rendering/activation states](https://github.com/bpmn-io/form-js/issues/4)
- [#123 Custom elements](https://github.com/bpmn-io/form-js/issues/123)
- [#181 Disable editing](https://github.com/bpmn-io/form-js/issues/181)
- [#196 Multi-select checkbox](https://github.com/bpmn-io/form-js/issues/196)
- [#249 Common properties panel migration](https://github.com/bpmn-io/form-js/issues/249)
- [#436 FEEL in text view](https://github.com/bpmn-io/form-js/issues/436)
- [#1073 Expression/Hidden fields](https://github.com/bpmn-io/form-js/issues/1073)
- [#1169 i18n](https://github.com/bpmn-io/form-js/issues/1169)
- [form-js toolkit](https://bpmn.io/toolkit/form-js/)
- [Camunda Forms features blog (2024-01)](https://camunda.com/blog/2024/01/camunda-forms-features-you-dont-know/)
- [multipage-form-js-demo](https://github.com/camunda-community-hub/multipage-form-js-demo)
- [extended-form-js](https://github.com/camunda-community-hub/extended-form-js)
- [Camunda custom components docs](https://docs.camunda.io/docs/apis-tools/frontend-development/forms/customize-and-extend/custom-components/)
