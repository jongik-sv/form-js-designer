# Feature: container-layout-fixes

## 요구사항

컨테이너 항목들의 가로로 다른 컴포넌트 오른쪽에 비치하는 것이 안되는 문제, 컨테이너 안에 들어간 다른 컴포넌트가 컨테이너 바깥까지 기존 컴포넌트보다 더 큰 상태로 있음(패딩 문제??), 탭은 Tab 1에서만 작업이 가능

## 배경 / 맥락

(선택: 이 기능이 필요한 이유, 관련 이슈, 영향 범위 등)

## 도메인

frontend

## 진입점 (Entry Points)

> 이 Feature는 form-js 에디터 컴포넌트 라이브러리 수정으로 별도 라우트/네비 파일 없음. 에디터 호스트 앱에서 드래그앤드롭으로 컨테이너를 배치해 검증한다.

- 사용자 진입 경로: `브라우저에서 http://localhost:5173 접속 → 팔레트에서 Card/Stack/Tabs/Modal 드래그앤드롭 → 컨테이너 안에 추가 컴포넌트 드롭`
- URL / 라우트: `http://localhost:5173` (packages/designer-editor-host)
- 수정할 라우터 파일: N/A (SPA, 단일 뷰, 라우트 없음 — packages/designer-editor-host/src/App.tsx가 유일한 진입)
- 수정할 메뉴·네비게이션 파일: N/A (팔레트 항목은 form-js 내장 + designer-components 등록으로 자동 노출)

## 비고

(선택: 제약사항, 의존성, 주의사항 등)
