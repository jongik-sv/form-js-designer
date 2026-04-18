# Feature: tabs-tabpanel-refactor

## 요구사항

Tabs 컴포넌트를 form.io식 "Tabs → TabPanel 서브필드" 구조로 리팩터. 각 탭 페이지를 실제 등록된 필드(type: tabPanel)로 구현하여 개별 선택/편집 가능하게 만들고, form-js 내장 dragula/formFieldRegistry/CommandStack과 자연스럽게 연동되도록 함. pseudo field 기반 현 구조(Option B)가 formFieldRegistry 미등록으로 drop routing이 실패하는 HIGH 리스크를 근본 해소. id 정책: tabPanel field id = tabPanel_<uuid>, Radix value = tabPanel.id (단일화). 기존 tabs[i].components 스키마는 import 시점 마이그레이션. 단위 + E2E(Playwright visible) 테스트 필수.

## 배경 / 맥락

(선택: 이 기능이 필요한 이유, 관련 이슈, 영향 범위 등)

## 도메인

(backend | frontend | fullstack | database — Dev Config의 domains 중 하나. 비워두면 dev-design이 판단)

## 진입점 (Entry Points)

> UI가 있는 Feature(fullstack/frontend)는 **필수**. 백엔드/인프라 Feature는 `N/A`로 남긴다.

- 사용자 진입 경로: (예: `로그인 후 → 사이드바 '설정' → '프로필'` 클릭 플로우)
- URL / 라우트: (예: `/settings/profile`)
- 수정할 라우터 파일: (예: `apps/web/src/app/settings/profile/page.tsx`)
- 수정할 메뉴·네비게이션 파일: (예: `apps/web/src/components/Sidebar.tsx`의 `navItems` 배열)

## 비고

(선택: 제약사항, 의존성, 주의사항 등)
