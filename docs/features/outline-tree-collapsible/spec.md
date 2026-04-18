# Feature: outline-tree-collapsible

## 요구사항

아웃라인 패널을 "연결선이 있는 깔끔한 트리" 형태로 표시한다 (VSCode 탐색기 / IntelliJ 프로젝트 트리와 유사).
- 부모-자식 들여쓰기 + 각 레벨의 세로 가이드 라인 + 자식 노드로 갈라지는 가로 꺾쇠 라인
- 선택 하이라이트는 기존 동작 유지

자식이 있는 노드는 접고/펼칠 수 있다:
- 트리거: chevron/triangle 토글 아이콘 (▸/▾) 또는 disclosure button
- 기본 상태: 처음엔 전부 펼침
- 접힌 노드는 자식이 DOM에서 감춰짐 (aria-expanded)
- 토글은 선택 동작과 충돌하지 않아야 함 (토글 아이콘 클릭 vs 레이블 클릭 분리)

접힌 상태는 현재 세션에서 유지 (새 import 시 리셋 허용)

## 배경 / 맥락

현재 OutlinePanel은 단순한 중첩 `<ul>` 목록으로 렌더링된다. 트리 연결선(tree lines)과 접기/펼치기 기능이 없어 복잡한 폼 스키마에서 구조 파악이 어렵다.

## 도메인

frontend

## 진입점 (Entry Points)

- 사용자 진입 경로: 에디터 호스트 앱 실행 (`http://localhost:5173`) → 좌측 아웃라인 패널에서 계층 구조 노드의 chevron 아이콘 클릭
- URL / 라우트: `http://localhost:5173` (SPA 단일 페이지, 별도 라우트 없음)
- 수정할 라우터 파일: `packages/designer-editor-host/src/App.tsx` — FormEditor additionalModules 배열 (OutlineModule 이미 등록됨, 라우터 변경 없음)
- 수정할 메뉴·네비게이션 파일: `packages/designer-editor-host/src/app.css` — outline 관련 CSS 추가/수정

## 비고

- 기존 `OutlinePanel.tsx`, `OutlineModule.ts`, `outlineTypes.ts` 파일 수정 (신규 파일 최소화)
- CSS는 `app.css`의 `@layer app` 내에 추가하거나 별도 `outline-tree.css` 신규 생성
- 접힌 상태는 Panel local state (`useState`)로 관리 — 모듈 서비스까지 끌어올리지 않음
