# 프로젝트 매니저 시스템 — 화면 설계 문서

작성일: 2026-04-29
작성: form-js-designer (form-designer skill)
검증: designer-cli validate (전 화면 통과)

---

## 시스템 개요

- **목적**: 사내 프로젝트의 상태, 일정, 리소스, 리포트를 통합 관리
- **사용자**: PMO, 부서장, 프로젝트 매니저, 팀원
- **데이터 모델**: `project`, `task`, `milestone`, `member` 4개 핵심 엔티티 + `filters` / `reports` 보조 네임스페이스

---

## 화면 구성도

### 운영 화면 (일상 업무)
| 화면 | 파일 | 역할 |
|------|------|------|
| 프로젝트 매니저 | `project-manager.form-js` | 전체 대시보드, 프로젝트 목록, 상세/등록 인라인 카드 |
| 프로젝트 상세 | `project-detail.form-js` | 단일 프로젝트 정보, 태스크·마일스톤·파일 뷰 |
| 태스크 보드 | `task-board.form-js` | 칸반 4열(할 일·진행중·검토·완료) + 태스크 상세 |
| 마일스톤 | `milestone-timeline.form-js` | 마일스톤 목록 타임라인, 이번 달 마감·지연 요약 |

### 관리 화면 (등록·인사)
| 화면 | 파일 | 역할 |
|------|------|------|
| 신규 등록 | `project-create.form-js` | 프로젝트 신규 등록 전용 폼 |
| 팀원 관리 | `team-members.form-js` | 전체 팀원 목록, 부서·역할별 통계, 팀원 정보 카드 |

### 분석 화면 (보고)
| 화면 | 파일 | 역할 |
|------|------|------|
| 리포트 | `project-reports.form-js` | 완료율·예산 집행 지표, 부서별·월별 현황, 비용 분석 |

---

## 데이터 모델 요약 표

| 엔티티 | 주요 dot.path 키 | 설명 |
|--------|-----------------|------|
| **project** | `project.name`, `project.code`, `project.manager`, `project.department`, `project.priority`, `project.status`, `project.startDate`, `project.dueDate`, `project.progress`, `project.progressRate`, `project.budget`, `project.description`, `project.nextMilestone`, `project.notify` | 프로젝트 기본 정보 및 진행 현황 |
| **task** | `task.title`, `task.description`, `task.assignee`, `task.priority`, `task.status`, `task.dueDate`, `task.label`, `task.progress`, `task.comment` | 태스크(작업) 단위 상세 정보 |
| **milestone** | `milestone.name`, `milestone.project`, `milestone.owner`, `milestone.startDate`, `milestone.dueDate`, `milestone.status`, `milestone.progress`, `milestone.deliverables` | 마일스톤 일정 및 산출물 |
| **member** | `member.name`, `member.empId`, `member.department`, `member.role`, `member.position`, `member.joinDate`, `member.utilization`, `member.email`, `member.phone`, `member.note` | 팀원 인적 정보 및 가동률 |
| **filters** | `filters.search`, `filters.status`, `filters.priority`, `filters.owner`, `filters.department`, `filters.project`, `filters.startDate`, `filters.endDate`, `filters.category` | 각 화면 공통 필터 네임스페이스 |
| **reports** | `reports.notes` | 리포트 분석 메모 |

---

## 1. 프로젝트 매니저 (대시보드) — project-manager.form-js

### 목적

전체 프로젝트 현황을 한눈에 파악하는 메인 대시보드다. 상태 요약 카드 4개(전체·진행중·완료·지연)로 현황 수치를 보여주고, 검색·필터를 통해 프로젝트 목록 테이블을 좁힌다. 하단에는 다가오는 마감·최근 활동 피드와 프로젝트 상세/신규 등록 인라인 카드가 배치되어 별도 화면 전환 없이 빠른 조회·편집이 가능하다.

### 주요 섹션

- **상태 요약 (row-2)**: 전체·진행중·완료·지연을 각 4-column 카드로 4-up 배치
- **프로젝트 목록 (row-3~4)**: 검색 textfield + 상태·우선순위·담당자 select 필터 + 페이지네이션 table
- **하단 보조 (row-5)**: 다가오는 마감 테이블(좌 8col) + 최근 활동 피드(우 8col)
- **상세/등록 인라인 카드 (row-6)**: PRJ-2026-001 샘플 defaultValue 포함, 저장·취소 버튼

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 프로젝트 매니저" | 페이지 최상단 타이틀 |
| button-1 | button | "+ 새 프로젝트" | 신규 프로젝트 등록 화면으로 이동 트리거 (submit) |
| card-1 | card | header "전체 프로젝트" | 전체 프로젝트 수 KPI 카드 — 내부 text-2가 수치 표시 |
| text-2 | text | "# 24 / 전월 대비 +3" | 전체 프로젝트 수 및 증감 텍스트 |
| card-2 | card | header "진행중" | 현재 진행중인 프로젝트 수 KPI 카드 |
| text-3 | text | "# 13 / 이번 주 마일스톤 5건" | 진행중 프로젝트 수 및 마일스톤 건수 텍스트 |
| card-3 | card | header "완료" | 완료된 프로젝트 수 KPI 카드 |
| text-4 | text | "# 8 / 분기 완료율 67%" | 완료 수 및 분기 완료율 텍스트 |
| card-4 | card | header "지연" | 지연된 프로젝트 수 KPI 카드 |
| text-5 | text | "# 3 / 즉시 검토 필요" | 지연 프로젝트 수 및 긴급 안내 텍스트 |
| textfield-1 | textfield | filters.search | 프로젝트명·ID·담당자 검색 입력 — 필터 적용 대상 |
| select-1 | select | filters.status | 상태 필터 (전체/진행중/대기/완료/지연) |
| select-2 | select | filters.priority | 우선순위 필터 (전체/높음/보통/낮음) |
| select-3 | select | filters.owner | 담당자 필터 (검색 가능, 6명 옵션) |
| table-1 | table | "프로젝트 목록" | 메인 프로젝트 목록 테이블, 페이지네이션, 10건 인라인 데이터 |
| card-5 | card | header "다가오는 마감" | 마감 임박 프로젝트 요약 컨테이너 |
| table-2 | table | "마감 임박" | 마감 임박 5건 테이블 — 프로젝트·남은 일수·담당자 |
| card-6 | card | header "최근 활동" | 최근 팀원 활동 피드 컨테이너 |
| text-6 | text | (활동 피드 마크다운) | 5건 최근 활동 불릿 리스트 (담당자·내용·시간) |
| card-7 | card | header "프로젝트 상세 / 신규 등록" | 인라인 상세 조회·편집 컨테이너 (하단 전폭) |
| textfield-2 | textfield | project.name | 프로젝트명 입력 — defaultValue "신규 결제 시스템 도입" |
| textfield-3 | textfield | project.code | 프로젝트 코드 입력 — defaultValue "PRJ-2026-001" |
| select-4 | select | project.priority | 우선순위 선택 — defaultValue "high" |
| select-5 | select | project.owner | 담당자 선택 (검색 가능) — defaultValue "u-001" (김민수) |
| datetime-1 | datetime | project.startDate | 시작일 입력 (date) — defaultValue "2026-04-01" |
| datetime-2 | datetime | project.dueDate | 마감일 입력 (date) — defaultValue "2026-06-30" |
| textarea-1 | textarea | project.description | 프로젝트 설명 멀티라인 입력 — defaultValue 프로젝트 개요 |
| number-1 | number | project.progress | 진행률(%) 숫자 입력 — defaultValue 68 |
| select-6 | select | project.status | 상태 선택 (대기/진행중/완료/지연) — defaultValue "active" |
| checkbox-1 | checkbox | project.notify | 마감 임박 알림 수신 여부 — defaultValue true |
| button-2 | button | "취소" | 인라인 카드 편집 취소 (reset) |
| button-3 | button | "저장" | 인라인 카드 저장 (submit) |

### 스키마

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "text",
      "id": "text-1",
      "text": "# 프로젝트 매니저",
      "layout": { "row": "row-1", "columns": 12 }
    },
    {
      "type": "button",
      "id": "button-1",
      "label": "+ 새 프로젝트",
      "action": "submit",
      "layout": { "row": "row-1", "columns": 4 }
    },
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "전체 프로젝트",
      "headerTag": "h4",
      "layout": { "row": "row-2", "columns": 4, "height": 140 },
      "components": [
        {
          "type": "text",
          "id": "text-2",
          "text": "# 24\n\n전월 대비 +3"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-2",
      "padding": "md",
      "elevation": 1,
      "header": "진행중",
      "headerTag": "h4",
      "layout": { "row": "row-2", "columns": 4, "height": 140 },
      "components": [
        {
          "type": "text",
          "id": "text-3",
          "text": "# 13\n\n이번 주 마일스톤 5건"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-3",
      "padding": "md",
      "elevation": 1,
      "header": "완료",
      "headerTag": "h4",
      "layout": { "row": "row-2", "columns": 4, "height": 140 },
      "components": [
        {
          "type": "text",
          "id": "text-4",
          "text": "# 8\n\n분기 완료율 67%"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-4",
      "padding": "md",
      "elevation": 1,
      "header": "지연",
      "headerTag": "h4",
      "layout": { "row": "row-2", "columns": 4, "height": 140 },
      "components": [
        {
          "type": "text",
          "id": "text-5",
          "text": "# 3\n\n즉시 검토 필요"
        }
      ]
    },
    {
      "type": "textfield",
      "id": "textfield-1",
      "key": "filters.search",
      "label": "검색",
      "description": "프로젝트명, ID, 담당자로 검색",
      "layout": { "row": "row-3", "columns": 6 }
    },
    {
      "type": "select",
      "id": "select-1",
      "key": "filters.status",
      "label": "상태",
      "values": [
        { "label": "전체 상태", "value": "all" },
        { "label": "진행중", "value": "active" },
        { "label": "대기", "value": "pending" },
        { "label": "완료", "value": "completed" },
        { "label": "지연", "value": "overdue" }
      ],
      "layout": { "row": "row-3", "columns": 3 }
    },
    {
      "type": "select",
      "id": "select-2",
      "key": "filters.priority",
      "label": "우선순위",
      "values": [
        { "label": "전체 우선순위", "value": "all" },
        { "label": "높음", "value": "high" },
        { "label": "보통", "value": "medium" },
        { "label": "낮음", "value": "low" }
      ],
      "layout": { "row": "row-3", "columns": 3 }
    },
    {
      "type": "select",
      "id": "select-3",
      "key": "filters.owner",
      "label": "담당자",
      "searchable": true,
      "values": [
        { "label": "전체 담당자", "value": "all" },
        { "label": "김민수", "value": "u-001" },
        { "label": "이지은", "value": "u-002" },
        { "label": "박상우", "value": "u-003" },
        { "label": "최유진", "value": "u-004" },
        { "label": "정현우", "value": "u-005" },
        { "label": "한가람", "value": "u-006" }
      ],
      "layout": { "row": "row-3", "columns": 4 }
    },
    {
      "type": "table",
      "id": "table-1",
      "label": "프로젝트 목록",
      "rowCount": 10,
      "pagination": true,
      "columns": [
        { "label": "프로젝트명", "key": "name" },
        { "label": "ID", "key": "projectId" },
        { "label": "담당자", "key": "owner" },
        { "label": "상태", "key": "status" },
        { "label": "진행률", "key": "progress" },
        { "label": "마감일", "key": "dueDate" },
        { "label": "우선순위", "key": "priority" }
      ],
      "dataSource": "= [{name:\"신규 결제 시스템 도입\",projectId:\"PRJ-2026-001\",owner:\"김민수\",status:\"진행중\",progress:\"68%\",dueDate:\"2026-06-30\",priority:\"높음\"}, {name:\"모바일 앱 리뉴얼\",projectId:\"PRJ-2026-002\",owner:\"이지은\",status:\"진행중\",progress:\"45%\",dueDate:\"2026-07-15\",priority:\"높음\"}, {name:\"고객 지원 챗봇\",projectId:\"PRJ-2026-003\",owner:\"박상우\",status:\"대기\",progress:\"0%\",dueDate:\"2026-08-01\",priority:\"보통\"}, {name:\"데이터 웨어하우스 마이그레이션\",projectId:\"PRJ-2026-004\",owner:\"최유진\",status:\"진행중\",progress:\"82%\",dueDate:\"2026-05-20\",priority:\"높음\"}, {name:\"사내 위키 개편\",projectId:\"PRJ-2025-098\",owner:\"정현우\",status:\"완료\",progress:\"100%\",dueDate:\"2026-04-15\",priority:\"낮음\"}, {name:\"보안 감사 대응\",projectId:\"PRJ-2026-005\",owner:\"한가람\",status:\"지연\",progress:\"55%\",dueDate:\"2026-04-10\",priority:\"높음\"}, {name:\"브랜드 리프레시\",projectId:\"PRJ-2026-006\",owner:\"송지원\",status:\"진행중\",progress:\"30%\",dueDate:\"2026-09-30\",priority:\"보통\"}, {name:\"신입사원 온보딩 자동화\",projectId:\"PRJ-2026-007\",owner:\"윤재호\",status:\"대기\",progress:\"0%\",dueDate:\"2026-10-15\",priority:\"낮음\"}, {name:\"ERP 모듈 업그레이드\",projectId:\"PRJ-2026-008\",owner:\"김민수\",status:\"진행중\",progress:\"22%\",dueDate:\"2026-11-30\",priority:\"보통\"}, {name:\"고객 만족도 대시보드\",projectId:\"PRJ-2026-009\",owner:\"이지은\",status:\"진행중\",progress:\"74%\",dueDate:\"2026-05-31\",priority:\"보통\"}]",
      "layout": { "row": "row-4", "columns": 16, "height": 520 }
    },
    {
      "type": "card",
      "id": "card-5",
      "padding": "md",
      "elevation": 1,
      "header": "다가오는 마감",
      "headerTag": "h3",
      "layout": { "row": "row-5", "columns": 8, "height": 320 },
      "components": [
        {
          "type": "table",
          "id": "table-2",
          "label": "마감 임박",
          "rowCount": 5,
          "columns": [
            { "label": "프로젝트", "key": "name" },
            { "label": "남은 일수", "key": "daysLeft" },
            { "label": "담당자", "key": "owner" }
          ],
          "dataSource": "= [{name:\"보안 감사 대응\",daysLeft:\"D-2 (지연)\",owner:\"한가람\"}, {name:\"사내 위키 개편\",daysLeft:\"D+0 (완료)\",owner:\"정현우\"}, {name:\"데이터 웨어하우스 마이그레이션\",daysLeft:\"D-21\",owner:\"최유진\"}, {name:\"고객 만족도 대시보드\",daysLeft:\"D-32\",owner:\"이지은\"}, {name:\"신규 결제 시스템 도입\",daysLeft:\"D-62\",owner:\"김민수\"}]"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-6",
      "padding": "md",
      "elevation": 1,
      "header": "최근 활동",
      "headerTag": "h3",
      "layout": { "row": "row-5", "columns": 8, "height": 320 },
      "components": [
        {
          "type": "text",
          "id": "text-6",
          "text": "- **김민수** — PRJ-2026-001 마일스톤 \"PG 연동 1차 완료\" 처리 · 10분 전\n- **이지은** — PRJ-2026-002에 디자인 리뷰 코멘트 3건 추가 · 32분 전\n- **최유진** — PRJ-2026-004 진행률 78% → 82% · 1시간 전\n- **한가람** — PRJ-2026-005 상태를 \"지연\"으로 변경 · 2시간 전\n- **정현우** — PRJ-2025-098을 \"완료\"로 종료 · 어제"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-7",
      "padding": "md",
      "elevation": 1,
      "header": "프로젝트 상세 / 신규 등록",
      "headerTag": "h3",
      "layout": { "row": "row-6", "columns": 16 },
      "components": [
        {
          "type": "textfield",
          "id": "textfield-2",
          "key": "project.name",
          "label": "프로젝트명",
          "defaultValue": "신규 결제 시스템 도입",
          "validate": { "required": true },
          "layout": { "row": "row-1", "columns": 8 }
        },
        {
          "type": "textfield",
          "id": "textfield-3",
          "key": "project.code",
          "label": "프로젝트 코드",
          "description": "예: PRJ-2026-010",
          "defaultValue": "PRJ-2026-001",
          "layout": { "row": "row-1", "columns": 4 }
        },
        {
          "type": "select",
          "id": "select-4",
          "key": "project.priority",
          "label": "우선순위",
          "defaultValue": "high",
          "values": [
            { "label": "높음", "value": "high" },
            { "label": "보통", "value": "medium" },
            { "label": "낮음", "value": "low" }
          ],
          "layout": { "row": "row-1", "columns": 4 }
        },
        {
          "type": "select",
          "id": "select-5",
          "key": "project.owner",
          "label": "담당자",
          "defaultValue": "u-001",
          "searchable": true,
          "values": [
            { "label": "김민수", "value": "u-001" },
            { "label": "이지은", "value": "u-002" },
            { "label": "박상우", "value": "u-003" },
            { "label": "최유진", "value": "u-004" },
            { "label": "정현우", "value": "u-005" },
            { "label": "한가람", "value": "u-006" }
          ],
          "layout": { "row": "row-2", "columns": 6 }
        },
        {
          "type": "datetime",
          "id": "datetime-1",
          "key": "project.startDate",
          "label": "시작일",
          "subtype": "date",
          "defaultValue": "2026-04-01",
          "layout": { "row": "row-2", "columns": 5 }
        },
        {
          "type": "datetime",
          "id": "datetime-2",
          "key": "project.dueDate",
          "label": "마감일",
          "subtype": "date",
          "defaultValue": "2026-06-30",
          "layout": { "row": "row-2", "columns": 5 }
        },
        {
          "type": "textarea",
          "id": "textarea-1",
          "key": "project.description",
          "label": "프로젝트 설명",
          "description": "범위, 목표, 핵심 산출물을 한두 문단으로 기재",
          "defaultValue": "사내 결제 시스템을 PG사와 연동하여 신규 결제 플랫폼을 구축한다. 온라인 결제, 정기 결제, 환불 프로세스 자동화를 포함하며 핵심 산출물은 결제 API, UI 모듈, 운영 매뉴얼이다.",
          "layout": { "row": "row-3", "columns": 16, "height": 140 }
        },
        {
          "type": "number",
          "id": "number-1",
          "key": "project.progress",
          "label": "진행률 (%)",
          "defaultValue": 68,
          "decimalDigits": 0,
          "layout": { "row": "row-4", "columns": 4 }
        },
        {
          "type": "select",
          "id": "select-6",
          "key": "project.status",
          "label": "상태",
          "defaultValue": "active",
          "values": [
            { "label": "대기", "value": "pending" },
            { "label": "진행중", "value": "active" },
            { "label": "완료", "value": "completed" },
            { "label": "지연", "value": "overdue" }
          ],
          "layout": { "row": "row-4", "columns": 4 }
        },
        {
          "type": "checkbox",
          "id": "checkbox-1",
          "key": "project.notify",
          "label": "마감 임박 시 알림 받기",
          "defaultValue": true,
          "layout": { "row": "row-4", "columns": 8 }
        },
        {
          "type": "button",
          "id": "button-2",
          "label": "취소",
          "action": "reset",
          "layout": { "row": "row-5", "columns": 4 }
        },
        {
          "type": "button",
          "id": "button-3",
          "label": "저장",
          "action": "submit",
          "layout": { "row": "row-5", "columns": 4 }
        }
      ]
    }
  ]
}
```

---

## 2. 프로젝트 상세 — project-detail.form-js

### 목적

단일 프로젝트(PRJ-2026-001 "신규 결제 시스템 도입")의 전체 정보를 조회·편집하는 화면이다. 프로젝트 정보(담당자·부서·일정·예산)와 진행 현황(진행률·상태·다음 마일스톤)이 좌우로 분할 배치되며, 하단에 태스크 목록, 마일스톤 표, 첨부 파일 테이블이 연속 배치된다. 모든 입력 필드에 PRJ-2026-001 실제 데이터가 defaultValue로 채워져 있다.

### 주요 섹션

- **헤더 (row-1)**: 프로젝트명 제목 텍스트 + 편집·완료 처리 버튼
- **좌측 정보 카드 (row-2, 6col)**: 담당자(select), 부서(select), 시작일·마감일(datetime), 우선순위(select), 예산(number) — 모두 defaultValue 설정
- **우측 현황 카드 (row-2, 10col)**: 진행률(number), 상태(select), 다음 마일스톤(textfield) — 모두 defaultValue 설정
- **태스크 목록 테이블 (row-3)**: 8건 태스크 인라인 데이터
- **마일스톤 표 + 첨부 파일 (row-4)**: 각 8col 분할

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "## 신규 결제 시스템 도입 (PRJ-2026-001)" | 현재 조회 중인 프로젝트명 및 코드 타이틀 |
| button-1 | button | "편집" | 프로젝트 정보 편집 모드 진입 (일반 액션) |
| button-2 | button | "완료 처리" | 프로젝트를 완료 상태로 변경 제출 (submit) |
| card-1 | card | header "프로젝트 정보" | 좌측 6col — 담당자·부서·일정·예산 정보 컨테이너 |
| select-1 | select | project.manager | 담당자 선택 (검색 가능) — defaultValue "u-001" (김민수) |
| select-dept | select | project.department | 부서 선택 — defaultValue "dev" (개발팀) |
| datetime-1 | datetime | project.startDate | 프로젝트 시작일 (date) — defaultValue "2026-04-01" |
| datetime-2 | datetime | project.dueDate | 프로젝트 마감일 (date) — defaultValue "2026-06-30" |
| select-priority | select | project.priority | 우선순위 선택 — defaultValue "high" |
| number-1 | number | project.budget | 프로젝트 예산(원) 숫자 입력 — defaultValue 350000000 |
| card-2 | card | header "진행 현황" | 우측 10col — 진행률·상태·다음 마일스톤 컨테이너 |
| text-2 | text | "### 현재 진행률: 68% …" | 현재 진행률 및 마일스톤 D-day 안내 텍스트 |
| number-2 | number | project.progressRate | 진행률(%) 숫자 입력 — defaultValue 68 |
| select-2 | select | project.status | 프로젝트 상태 선택 — defaultValue "active" |
| textfield-3 | textfield | project.nextMilestone | 다음 마일스톤명 입력 — defaultValue "결제 모듈 1차 개발 완료" |
| table-1 | table | "태스크 목록" | 해당 프로젝트의 태스크 8건 테이블, 행 클릭 시 보드 이동 |
| table-2 | table | "마일스톤" | 프로젝트 마일스톤 5건 테이블 — 마감일·상태·산출물 |
| card-3 | card | header "첨부 파일" | 첨부 파일 목록 컨테이너 |
| table-3 | table | "파일 목록" | 첨부 파일 5건 테이블 — 파일명·업로드자·크기·날짜 |
| button-3 | button | "히스토리 보기" | 변경 이력 조회 (일반 액션) |
| button-4 | button | "삭제" | 프로젝트 삭제 (일반 액션, 확인 필요) |
| button-5 | button | "저장" | 변경 사항 저장 (submit) |

### 스키마

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "text",
      "id": "text-1",
      "text": "## 신규 결제 시스템 도입 (PRJ-2026-001)",
      "layout": { "row": "row-1", "columns": 10 }
    },
    {
      "type": "button",
      "id": "button-1",
      "label": "편집",
      "layout": { "row": "row-1", "columns": 3 }
    },
    {
      "type": "button",
      "id": "button-2",
      "label": "완료 처리",
      "action": "submit",
      "layout": { "row": "row-1", "columns": 3 }
    },
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "프로젝트 정보",
      "headerTag": "h3",
      "layout": { "row": "row-2", "columns": 6, "height": 480 },
      "components": [
        {
          "type": "select",
          "id": "select-1",
          "key": "project.manager",
          "label": "담당자",
          "defaultValue": "u-001",
          "searchable": true,
          "values": [
            { "label": "김민수", "value": "u-001" },
            { "label": "이지은", "value": "u-002" },
            { "label": "박상우", "value": "u-003" },
            { "label": "최유진", "value": "u-004" },
            { "label": "정현우", "value": "u-005" },
            { "label": "한가람", "value": "u-006" }
          ]
        },
        {
          "type": "select",
          "id": "select-dept",
          "key": "project.department",
          "label": "부서",
          "defaultValue": "dev",
          "values": [
            { "label": "개발팀", "value": "dev" },
            { "label": "디자인팀", "value": "design" },
            { "label": "마케팅팀", "value": "marketing" },
            { "label": "영업팀", "value": "sales" },
            { "label": "운영팀", "value": "ops" }
          ]
        },
        {
          "type": "datetime",
          "id": "datetime-1",
          "key": "project.startDate",
          "label": "시작일",
          "subtype": "date",
          "defaultValue": "2026-04-01"
        },
        {
          "type": "datetime",
          "id": "datetime-2",
          "key": "project.dueDate",
          "label": "마감일",
          "subtype": "date",
          "defaultValue": "2026-06-30"
        },
        {
          "type": "select",
          "id": "select-priority",
          "key": "project.priority",
          "label": "우선순위",
          "defaultValue": "high",
          "values": [
            { "label": "긴급", "value": "critical" },
            { "label": "높음", "value": "high" },
            { "label": "보통", "value": "medium" },
            { "label": "낮음", "value": "low" }
          ]
        },
        {
          "type": "number",
          "id": "number-1",
          "key": "project.budget",
          "label": "예산 (원)",
          "defaultValue": 350000000
        }
      ]
    },
    {
      "type": "card",
      "id": "card-2",
      "padding": "md",
      "elevation": 1,
      "header": "진행 현황",
      "headerTag": "h3",
      "layout": { "row": "row-2", "columns": 10, "height": 480 },
      "components": [
        {
          "type": "text",
          "id": "text-2",
          "text": "### 현재 진행률: **68%** — 목표 마일스톤까지 D-18"
        },
        {
          "type": "number",
          "id": "number-2",
          "key": "project.progressRate",
          "label": "진행률 (%)",
          "defaultValue": 68
        },
        {
          "type": "select",
          "id": "select-2",
          "key": "project.status",
          "label": "상태",
          "defaultValue": "active",
          "values": [
            { "label": "진행중", "value": "active" },
            { "label": "지연", "value": "delayed" },
            { "label": "완료", "value": "completed" },
            { "label": "보류", "value": "on_hold" },
            { "label": "취소", "value": "cancelled" }
          ]
        },
        {
          "type": "textfield",
          "id": "textfield-3",
          "key": "project.nextMilestone",
          "label": "다음 마일스톤",
          "defaultValue": "결제 모듈 1차 개발 완료"
        }
      ]
    },
    {
      "type": "table",
      "id": "table-1",
      "label": "태스크 목록",
      "rowCount": 8,
      "columns": [
        { "label": "태스크명", "key": "taskName" },
        { "label": "담당자", "key": "assignee" },
        { "label": "상태", "key": "status" },
        { "label": "우선순위", "key": "priority" },
        { "label": "마감일", "key": "dueDate" },
        { "label": "진행률", "key": "progress" }
      ],
      "dataSource": "= [{taskName:\"결제 API 설계\",assignee:\"박민준\",status:\"완료\",priority:\"긴급\",dueDate:\"2026-02-10\",progress:\"100%\"},{taskName:\"PG사 연동 개발\",assignee:\"이서연\",status:\"진행 중\",priority:\"높음\",dueDate:\"2026-03-15\",progress:\"75%\"},{taskName:\"결제 UI 구현\",assignee:\"최지훈\",status:\"진행 중\",priority:\"높음\",dueDate:\"2026-03-20\",progress:\"60%\"},{taskName:\"보안 취약점 점검\",assignee:\"김태양\",status:\"대기\",priority:\"긴급\",dueDate:\"2026-04-01\",progress:\"0%\"},{taskName:\"테스트 시나리오 작성\",assignee:\"정유나\",status:\"진행 중\",priority:\"보통\",dueDate:\"2026-03-25\",progress:\"40%\"},{taskName:\"DB 스키마 설계\",assignee:\"박민준\",status:\"완료\",priority:\"높음\",dueDate:\"2026-02-05\",progress:\"100%\"},{taskName:\"운영 배포 계획 수립\",assignee:\"이서연\",status:\"대기\",priority:\"보통\",dueDate:\"2026-04-10\",progress:\"0%\"},{taskName:\"사용자 교육 자료 준비\",assignee:\"최지훈\",status:\"대기\",priority:\"낮음\",dueDate:\"2026-04-15\",progress:\"0%\"}]",
      "layout": { "row": "row-3", "columns": 16, "height": 360 }
    },
    {
      "type": "table",
      "id": "table-2",
      "label": "마일스톤",
      "rowCount": 5,
      "columns": [
        { "label": "마일스톤", "key": "milestone" },
        { "label": "마감일", "key": "dueDate" },
        { "label": "상태", "key": "status" },
        { "label": "산출물", "key": "deliverable" }
      ],
      "dataSource": "= [{milestone:\"요구사항 분석 완료\",dueDate:\"2026-01-31\",status:\"완료\",deliverable:\"요구사항 정의서\"},{milestone:\"시스템 설계 완료\",dueDate:\"2026-02-15\",status:\"완료\",deliverable:\"설계 명세서\"},{milestone:\"1차 개발 완료\",dueDate:\"2026-03-31\",status:\"진행 중\",deliverable:\"개발 소스 및 단위테스트 결과\"},{milestone:\"통합 테스트 완료\",dueDate:\"2026-04-15\",status:\"대기\",deliverable:\"테스트 결과 보고서\"},{milestone:\"운영 배포\",dueDate:\"2026-05-01\",status:\"대기\",deliverable:\"배포 완료 확인서\"}]",
      "layout": { "row": "row-4", "columns": 8, "height": 280 }
    },
    {
      "type": "card",
      "id": "card-3",
      "padding": "md",
      "elevation": 1,
      "header": "첨부 파일",
      "headerTag": "h3",
      "layout": { "row": "row-4", "columns": 8, "height": 280 },
      "components": [
        {
          "type": "table",
          "id": "table-3",
          "label": "파일 목록",
          "rowCount": 5,
          "columns": [
            { "label": "파일명", "key": "fileName" },
            { "label": "업로드자", "key": "uploader" },
            { "label": "크기", "key": "fileSize" },
            { "label": "업로드 일자", "key": "uploadDate" }
          ],
          "dataSource": "= [{fileName:\"PRJ-2026-001_요구사항정의서.docx\",uploader:\"김지수\",fileSize:\"1.2 MB\",uploadDate:\"2026-01-20\"},{fileName:\"시스템_설계명세서_v2.pdf\",uploader:\"박민준\",fileSize:\"3.8 MB\",uploadDate:\"2026-02-14\"},{fileName:\"결제API_연동가이드.pdf\",uploader:\"이서연\",fileSize:\"2.1 MB\",uploadDate:\"2026-02-28\"},{fileName:\"DB_스키마_ERD.png\",uploader:\"박민준\",fileSize:\"540 KB\",uploadDate:\"2026-02-05\"},{fileName:\"보안검토_체크리스트.xlsx\",uploader:\"김태양\",fileSize:\"88 KB\",uploadDate:\"2026-03-10\"}]"
        }
      ]
    },
    {
      "type": "button",
      "id": "button-3",
      "label": "히스토리 보기",
      "layout": { "row": "row-5", "columns": 4 }
    },
    {
      "type": "button",
      "id": "button-4",
      "label": "삭제",
      "layout": { "row": "row-5", "columns": 4 }
    },
    {
      "type": "button",
      "id": "button-5",
      "label": "저장",
      "action": "submit",
      "layout": { "row": "row-5", "columns": 4 }
    }
  ]
}
```

---

## 3. 신규 프로젝트 등록 — project-create.form-js

### 목적

새 프로젝트를 등록하는 전용 폼이다. 기본 정보(이름·코드·카테고리·우선순위·설명), 일정(시작일·마감일·예상 공수), 팀·예산(매니저·부서·예산), 알림 설정(마감 임박·진행률 정체·멤버 변경) 4개 카드로 구성된다. 신규 입력이 의도이므로 모든 입력 필드에 defaultValue를 설정하지 않는다.

### 주요 섹션

- **기본 정보 카드 (row-2)**: 프로젝트명(required), 코드, 카테고리 select, 우선순위 radio, 설명 textarea
- **일정 + 팀·예산 카드 (row-3, 각 8col)**: 날짜·공수 / 매니저·부서·예산 분할 배치
- **알림 카드 (row-4)**: 체크박스 3개 (마감 임박·진행률 정체·멤버 변경)
- **버튼 (row-5)**: 취소·임시 저장·등록

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 신규 프로젝트 등록" | 페이지 최상단 타이틀 |
| card-1 | card | header "기본 정보" | 프로젝트 기본 정보 입력 컨테이너 (전폭) |
| textfield-1 | textfield | project.name | 프로젝트명 입력 — 필수(required) |
| textfield-2 | textfield | project.code | 프로젝트 코드 입력 — 예: PRJ-2026-010 형식 안내 |
| select-1 | select | project.category | 카테고리 선택 (개발/디자인/마케팅/운영/연구) |
| radio-1 | radio | project.priority | 우선순위 라디오 선택 (높음/보통/낮음) |
| textarea-1 | textarea | project.description | 프로젝트 설명 멀티라인 입력 — 목표·범위·산출물 기재 |
| card-2 | card | header "일정" | 일정 입력 컨테이너 (좌측 8col) |
| datetime-1 | datetime | project.startDate | 프로젝트 시작일 입력 (date) |
| datetime-2 | datetime | project.dueDate | 프로젝트 마감일 입력 (date) |
| number-1 | number | project.estimateDays | 예상 공수(일) 숫자 입력 |
| card-3 | card | header "팀 · 예산" | 팀 구성 및 예산 입력 컨테이너 (우측 8col) |
| select-2 | select | project.manager | 프로젝트 매니저 선택 (검색 가능, 6명) |
| select-3 | select | project.department | 담당 부서 선택 (5개 부서) |
| number-2 | number | project.budget | 프로젝트 예산(원) 숫자 입력 |
| card-4 | card | header "알림" | 알림 설정 체크박스 컨테이너 (전폭) |
| checkbox-1 | checkbox | project.notify.deadline | 마감 임박 알림 수신 여부 체크 |
| checkbox-2 | checkbox | project.notify.stalled | 진행률 정체 알림 수신 여부 체크 |
| checkbox-3 | checkbox | project.notify.member | 멤버 변경 알림 수신 여부 체크 |
| button-1 | button | "취소" | 등록 취소 및 입력 초기화 (reset) |
| button-2 | button | "임시 저장" | 현재 입력값 임시 저장 (일반 액션) |
| button-3 | button | "등록" | 신규 프로젝트 최종 등록 제출 (submit) |

### 스키마

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "text",
      "id": "text-1",
      "text": "# 신규 프로젝트 등록",
      "layout": { "row": "row-1", "columns": 16 }
    },
    {
      "type": "card",
      "id": "card-1",
      "header": "기본 정보",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-2", "columns": 16 },
      "components": [
        {
          "type": "textfield",
          "id": "textfield-1",
          "key": "project.name",
          "label": "프로젝트명",
          "validate": { "required": true },
          "layout": { "row": "row-1", "columns": 10 }
        },
        {
          "type": "textfield",
          "id": "textfield-2",
          "key": "project.code",
          "label": "프로젝트 코드",
          "description": "예: PRJ-2026-010",
          "layout": { "row": "row-1", "columns": 6 }
        },
        {
          "type": "select",
          "id": "select-1",
          "key": "project.category",
          "label": "카테고리",
          "values": [
            { "label": "개발", "value": "dev" },
            { "label": "디자인", "value": "design" },
            { "label": "마케팅", "value": "marketing" },
            { "label": "운영", "value": "ops" },
            { "label": "연구", "value": "research" }
          ],
          "layout": { "row": "row-2", "columns": 6 }
        },
        {
          "type": "radio",
          "id": "radio-1",
          "key": "project.priority",
          "label": "우선순위",
          "values": [
            { "label": "높음", "value": "high" },
            { "label": "보통", "value": "medium" },
            { "label": "낮음", "value": "low" }
          ],
          "layout": { "row": "row-2", "columns": 10 }
        },
        {
          "type": "textarea",
          "id": "textarea-1",
          "key": "project.description",
          "label": "설명",
          "layout": { "row": "row-3", "columns": 16, "height": 140 }
        }
      ]
    },
    {
      "type": "card",
      "id": "card-2",
      "header": "일정",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-3", "columns": 8 },
      "components": [
        {
          "type": "datetime",
          "id": "datetime-1",
          "key": "project.startDate",
          "label": "시작일",
          "subtype": "date"
        },
        {
          "type": "datetime",
          "id": "datetime-2",
          "key": "project.dueDate",
          "label": "마감일",
          "subtype": "date"
        },
        {
          "type": "number",
          "id": "number-1",
          "key": "project.estimateDays",
          "label": "예상 공수(일)"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-3",
      "header": "팀 · 예산",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-3", "columns": 8 },
      "components": [
        {
          "type": "select",
          "id": "select-2",
          "key": "project.manager",
          "label": "프로젝트 매니저",
          "searchable": true,
          "values": [
            { "label": "김민수", "value": "kim-minsu" },
            { "label": "이지은", "value": "lee-jieun" },
            { "label": "박상우", "value": "park-sangwoo" },
            { "label": "최유진", "value": "choi-yujin" },
            { "label": "정현우", "value": "jung-hyunwoo" },
            { "label": "한가람", "value": "han-garam" }
          ]
        },
        {
          "type": "select",
          "id": "select-3",
          "key": "project.department",
          "label": "부서",
          "values": [
            { "label": "개발팀", "value": "dev" },
            { "label": "디자인팀", "value": "design" },
            { "label": "마케팅팀", "value": "marketing" },
            { "label": "영업팀", "value": "sales" },
            { "label": "운영팀", "value": "ops" }
          ]
        },
        {
          "type": "number",
          "id": "number-2",
          "key": "project.budget",
          "label": "예산(원)"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-4",
      "header": "알림",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-4", "columns": 16 },
      "components": [
        {
          "type": "checkbox",
          "id": "checkbox-1",
          "key": "project.notify.deadline",
          "label": "마감 임박 알림"
        },
        {
          "type": "checkbox",
          "id": "checkbox-2",
          "key": "project.notify.stalled",
          "label": "진행률 정체 알림"
        },
        {
          "type": "checkbox",
          "id": "checkbox-3",
          "key": "project.notify.member",
          "label": "멤버 변경 알림"
        }
      ]
    },
    {
      "type": "button",
      "id": "button-1",
      "label": "취소",
      "action": "reset",
      "layout": { "row": "row-5", "columns": 4 }
    },
    {
      "type": "button",
      "id": "button-2",
      "label": "임시 저장",
      "layout": { "row": "row-5", "columns": 4 }
    },
    {
      "type": "button",
      "id": "button-3",
      "label": "등록",
      "action": "submit",
      "layout": { "row": "row-5", "columns": 4 }
    }
  ]
}
```

---

## 4. 태스크 보드 (칸반) — task-board.form-js

### 목적

프로젝트 태스크를 칸반 방식(할 일·진행중·검토·완료)으로 시각적으로 관리하는 화면이다. 상단에는 운영 시그널 KPI 4개(이번 주 신규·이번 주 완료·지연·내 담당), 중앙에는 4열 칸반 컬럼이 배치되며 각 컬럼 헤더에 태스크 수가 표시된다. 하단 태스크 상세 카드는 현재 선택된 태스크(PG 연동 API 명세서 작성)의 상세 정보와 편집 필드를 보여준다.

### 주요 섹션

- **헤더/필터 (row-1·row-2)**: 페이지 타이틀 + `+ 새 태스크`/`보드 설정`, 검색·프로젝트·담당자·라벨 필터
- **운영 KPI 4-up (row-3)**: 이번 주 신규(4) · 이번 주 완료(7) · 지연(2) · 내 담당(6)
- **칸반 4열 (row-4)**: 📋 할 일(12) · ⚙️ 진행중(5) · 👁 검토(3) · ✅ 완료(28) 각 4col, 높이 560px, 내부 태스크 텍스트 + `+ 태스크 추가` 버튼
- **태스크 상세 (row-5, 16col)**: 제목·설명·담당자·우선순위·상태·마감일·라벨·진행률·댓글 + defaultValue 채워짐

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 태스크 보드" | 페이지 최상단 타이틀 |
| button-1 | button | "+ 새 태스크" | 신규 태스크 등록 트리거 (submit) |
| button-2 | button | "보드 설정" | 보드 설정 초기화 (reset) |
| textfield-1 | textfield | filter.search | 태스크 제목·담당자로 칸반 필터 검색 |
| select-1 | select | filter.project | 프로젝트별 태스크 필터 (전체/플랫폼 개발/디자인 시스템/API 고도화) |
| select-2 | select | filter.assignee | 담당자별 필터 (검색 가능, 4명) |
| select-3 | select | filter.label | 라벨별 필터 (버그/기능/개선/문서) |
| card-1 | card | header "이번 주 신규" | KPI — 이번 주 새로 생성된 태스크 수 |
| text-2 | text | "# 4건 / 전주 대비 +1" | 신규 태스크 카운트와 전주 비교 |
| card-2 | card | header "이번 주 완료" | KPI — 이번 주 완료 처리된 태스크 수 |
| text-3 | text | "# 7건 / 목표 대비 117%" | 완료 카운트와 목표 달성률 |
| card-3 | card | header "지연" | KPI — 마감을 넘긴 태스크 수, 즉시 검토 시그널 |
| text-4 | text | "# 2건 / 즉시 검토 필요" | 지연 카운트 |
| card-4 | card | header "내 담당" | KPI — 로그인 사용자가 담당하는 태스크 수 |
| text-5 | text | "# 6건 / 진행중 3 · 검토 2" | 내 담당 카운트와 상태 분포 |
| card-5 | card | header "📋 할 일 (12)" | 칸반 "할 일" 컬럼 컨테이너 (4col, 560px) |
| text-6 | text | PG 연동 API 명세서 작성 | 김민수 · D-3 · 높음 — 할 일 태스크 1 |
| text-7 | text | 로그인 페이지 반응형 처리 | 이지은 · D-7 · 중간 — 할 일 태스크 2 |
| text-8 | text | 알림 배치 스케줄러 구현 | 박철수 · D-10 · 낮음 — 할 일 태스크 3 |
| text-9 | text | 검색 필터 UX 개선 | 정유진 · D-14 · 중간 — 할 일 태스크 4 |
| button-3 | button | "+ 태스크 추가" | 할 일 컬럼에 신규 태스크 추가 (submit) |
| card-6 | card | header "⚙️ 진행중 (5)" | 칸반 "진행중" 컬럼 컨테이너 (4col, 560px) |
| text-10 | text | 사용자 권한 모듈 리팩터링 | 김민수 · D-1 · 높음 — 진행중 태스크 1 |
| text-11 | text | 대시보드 차트 컴포넌트 개발 | 이지은 · D-2 · 중간 — 진행중 태스크 2 |
| text-12 | text | DB 인덱스 최적화 | 박철수 · D-3 · 높음 — 진행중 태스크 3 |
| text-13 | text | 웹소켓 실시간 알림 구현 | 정유진 · D-5 · 중간 — 진행중 태스크 4 |
| text-14 | text | 파일 업로드 S3 연동 | 김민수 · D-6 · 낮음 — 진행중 태스크 5 |
| button-4 | button | "+ 태스크 추가" | 진행중 컬럼에 신규 태스크 추가 (submit) |
| card-7 | card | header "👁 검토 (3)" | 칸반 "검토" 컬럼 컨테이너 (4col, 560px) |
| text-15 | text | OAuth2 소셜 로그인 통합 | 이지은 · D-0 · 높음 — 검토 태스크 1 |
| text-16 | text | 정산 보고서 PDF 출력 | 박철수 · D-1 · 중간 — 검토 태스크 2 |
| text-17 | text | API 응답 캐싱 전략 적용 | 정유진 · D-2 · 높음 — 검토 태스크 3 |
| text-18 | text | 접근성 개선 (ARIA 레이블) | 이지은 · D-3 · 낮음 — 검토 태스크 4 |
| button-5 | button | "+ 태스크 추가" | 검토 컬럼에 신규 태스크 추가 (submit) |
| card-8 | card | header "✅ 완료 (28)" | 칸반 "완료" 컬럼 컨테이너 (4col, 560px) |
| text-19 | text | 회원가입 이메일 인증 구현 | 김민수 · 완료 · 높음 — 완료 태스크 1 |
| text-20 | text | 공통 에러 핸들러 구성 | 박철수 · 완료 · 중간 — 완료 태스크 2 |
| text-21 | text | Swagger 문서 자동화 설정 | 정유진 · 완료 · 낮음 — 완료 태스크 3 |
| text-22 | text | CI/CD 파이프라인 구성 | 이지은 · 완료 · 높음 — 완료 태스크 4 |
| button-6 | button | "+ 태스크 추가" | 완료 컬럼에 신규 태스크 추가 (submit) |
| card-9 | card | header "태스크 상세" | 현재 선택 태스크 편집 컨테이너 (전폭 540px) |
| textfield-2 | textfield | task.title | 태스크 제목 — defaultValue "PG 연동 API 명세서 작성" |
| textarea-1 | textarea | task.description | 태스크 설명 — defaultValue: API 명세서 작성 의도 설명 |
| select-4 | select | task.assignee | 담당자 선택 — defaultValue "minsu" (김민수) |
| select-5 | select | task.priority | 우선순위 (높음/중간/낮음) — defaultValue "high" |
| select-6 | select | task.status | 상태 (할 일/진행중/검토/완료) — defaultValue "in_progress" |
| datetime-1 | datetime | task.dueDate | 마감일 (date) — defaultValue "2026-05-02" |
| select-7 | select | task.label | 라벨 (버그/기능/개선/문서) — defaultValue "docs" |
| number-1 | number | task.progress | 진행률(%) — defaultValue 35 |
| textarea-2 | textarea | task.comment | 댓글 입력 (defaultValue 없음) |
| button-7 | button | "취소" | 편집 취소 (reset) |
| button-8 | button | "저장" | 변경 사항 저장 (submit) |

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "text",
      "id": "text-1",
      "text": "# 태스크 보드",
      "layout": { "row": "row-1", "columns": 10 }
    },
    {
      "type": "button",
      "id": "button-1",
      "label": "+ 새 태스크",
      "action": "submit",
      "layout": { "row": "row-1", "columns": 3 }
    },
    {
      "type": "button",
      "id": "button-2",
      "label": "보드 설정",
      "action": "reset",
      "layout": { "row": "row-1", "columns": 3 }
    },
    {
      "type": "textfield",
      "id": "textfield-1",
      "key": "filter.search",
      "label": "검색",
      "description": "태스크 제목, 담당자 등으로 검색",
      "layout": { "row": "row-2", "columns": 6 }
    },
    {
      "type": "select",
      "id": "select-1",
      "key": "filter.project",
      "label": "프로젝트",
      "values": [
        { "label": "전체 프로젝트", "value": "all" },
        { "label": "플랫폼 개발", "value": "platform" },
        { "label": "디자인 시스템", "value": "design" },
        { "label": "API 고도화", "value": "api" }
      ],
      "layout": { "row": "row-2", "columns": 4 }
    },
    {
      "type": "select",
      "id": "select-2",
      "key": "filter.assignee",
      "label": "담당자",
      "searchable": true,
      "values": [
        { "label": "전체 담당자", "value": "all" },
        { "label": "김민수", "value": "minsu" },
        { "label": "이지은", "value": "jieun" },
        { "label": "박철수", "value": "cheolsu" },
        { "label": "정유진", "value": "yujin" }
      ],
      "layout": { "row": "row-2", "columns": 3 }
    },
    {
      "type": "select",
      "id": "select-3",
      "key": "filter.label",
      "label": "라벨",
      "values": [
        { "label": "전체 라벨", "value": "all" },
        { "label": "버그", "value": "bug" },
        { "label": "기능", "value": "feature" },
        { "label": "개선", "value": "improvement" },
        { "label": "문서", "value": "docs" }
      ],
      "layout": { "row": "row-2", "columns": 3 }
    },
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "이번 주 신규",
      "headerTag": "h4",
      "layout": { "row": "row-3", "columns": 4, "height": 120 },
      "components": [
        { "type": "text", "id": "text-2", "text": "# 4건\n\n전주 대비 +1", "layout": { "row": "card-1-r1", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-2",
      "padding": "md",
      "elevation": 1,
      "header": "이번 주 완료",
      "headerTag": "h4",
      "layout": { "row": "row-3", "columns": 4, "height": 120 },
      "components": [
        { "type": "text", "id": "text-3", "text": "# 7건\n\n목표 대비 117%", "layout": { "row": "card-2-r1", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-3",
      "padding": "md",
      "elevation": 1,
      "header": "지연",
      "headerTag": "h4",
      "layout": { "row": "row-3", "columns": 4, "height": 120 },
      "components": [
        { "type": "text", "id": "text-4", "text": "# 2건\n\n즉시 검토 필요", "layout": { "row": "card-3-r1", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-4",
      "padding": "md",
      "elevation": 1,
      "header": "내 담당",
      "headerTag": "h4",
      "layout": { "row": "row-3", "columns": 4, "height": 120 },
      "components": [
        { "type": "text", "id": "text-5", "text": "# 6건\n\n진행중 3 · 검토 2", "layout": { "row": "card-4-r1", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-5",
      "padding": "md",
      "elevation": 1,
      "header": "📋 할 일 (12)",
      "headerTag": "h4",
      "layout": { "row": "row-4", "columns": 4, "height": 560 },
      "components": [
        { "type": "text", "id": "text-6", "text": "**PG 연동 API 명세서 작성**\n\n김민수 · D-3 · 높음", "layout": { "row": "card-5-r1", "columns": 16 } },
        { "type": "text", "id": "text-7", "text": "**로그인 페이지 반응형 처리**\n\n이지은 · D-7 · 중간", "layout": { "row": "card-5-r2", "columns": 16 } },
        { "type": "text", "id": "text-8", "text": "**알림 배치 스케줄러 구현**\n\n박철수 · D-10 · 낮음", "layout": { "row": "card-5-r3", "columns": 16 } },
        { "type": "text", "id": "text-9", "text": "**검색 필터 UX 개선**\n\n정유진 · D-14 · 중간", "layout": { "row": "card-5-r4", "columns": 16 } },
        { "type": "button", "id": "button-3", "label": "+ 태스크 추가", "action": "submit", "layout": { "row": "card-5-r5", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-6",
      "padding": "md",
      "elevation": 1,
      "header": "⚙️ 진행중 (5)",
      "headerTag": "h4",
      "layout": { "row": "row-4", "columns": 4, "height": 560 },
      "components": [
        { "type": "text", "id": "text-10", "text": "**사용자 권한 모듈 리팩터링**\n\n김민수 · D-1 · 높음", "layout": { "row": "card-6-r1", "columns": 16 } },
        { "type": "text", "id": "text-11", "text": "**대시보드 차트 컴포넌트 개발**\n\n이지은 · D-2 · 중간", "layout": { "row": "card-6-r2", "columns": 16 } },
        { "type": "text", "id": "text-12", "text": "**DB 인덱스 최적화**\n\n박철수 · D-3 · 높음", "layout": { "row": "card-6-r3", "columns": 16 } },
        { "type": "text", "id": "text-13", "text": "**웹소켓 실시간 알림 구현**\n\n정유진 · D-5 · 중간", "layout": { "row": "card-6-r4", "columns": 16 } },
        { "type": "text", "id": "text-14", "text": "**파일 업로드 S3 연동**\n\n김민수 · D-6 · 낮음", "layout": { "row": "card-6-r5", "columns": 16 } },
        { "type": "button", "id": "button-4", "label": "+ 태스크 추가", "action": "submit", "layout": { "row": "card-6-r6", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-7",
      "padding": "md",
      "elevation": 1,
      "header": "👁 검토 (3)",
      "headerTag": "h4",
      "layout": { "row": "row-4", "columns": 4, "height": 560 },
      "components": [
        { "type": "text", "id": "text-15", "text": "**OAuth2 소셜 로그인 통합**\n\n이지은 · D-0 · 높음", "layout": { "row": "card-7-r1", "columns": 16 } },
        { "type": "text", "id": "text-16", "text": "**정산 보고서 PDF 출력**\n\n박철수 · D-1 · 중간", "layout": { "row": "card-7-r2", "columns": 16 } },
        { "type": "text", "id": "text-17", "text": "**API 응답 캐싱 전략 적용**\n\n정유진 · D-2 · 높음", "layout": { "row": "card-7-r3", "columns": 16 } },
        { "type": "text", "id": "text-18", "text": "**접근성 개선 (ARIA 레이블)**\n\n이지은 · D-3 · 낮음", "layout": { "row": "card-7-r4", "columns": 16 } },
        { "type": "button", "id": "button-5", "label": "+ 태스크 추가", "action": "submit", "layout": { "row": "card-7-r5", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-8",
      "padding": "md",
      "elevation": 1,
      "header": "✅ 완료 (28)",
      "headerTag": "h4",
      "layout": { "row": "row-4", "columns": 4, "height": 560 },
      "components": [
        { "type": "text", "id": "text-19", "text": "**회원가입 이메일 인증 구현**\n\n김민수 · 완료 · 높음", "layout": { "row": "card-8-r1", "columns": 16 } },
        { "type": "text", "id": "text-20", "text": "**공통 에러 핸들러 구성**\n\n박철수 · 완료 · 중간", "layout": { "row": "card-8-r2", "columns": 16 } },
        { "type": "text", "id": "text-21", "text": "**Swagger 문서 자동화 설정**\n\n정유진 · 완료 · 낮음", "layout": { "row": "card-8-r3", "columns": 16 } },
        { "type": "text", "id": "text-22", "text": "**CI/CD 파이프라인 구성**\n\n이지은 · 완료 · 높음", "layout": { "row": "card-8-r4", "columns": 16 } },
        { "type": "button", "id": "button-6", "label": "+ 태스크 추가", "action": "submit", "layout": { "row": "card-8-r5", "columns": 16 } }
      ]
    },
    {
      "type": "card",
      "id": "card-9",
      "padding": "md",
      "elevation": 2,
      "header": "태스크 상세",
      "headerTag": "h3",
      "layout": { "row": "row-5", "columns": 16, "height": 540 },
      "components": [
        {
          "type": "textfield",
          "id": "textfield-2",
          "key": "task.title",
          "label": "제목",
          "defaultValue": "PG 연동 API 명세서 작성",
          "layout": { "row": "card-9-r1", "columns": 16 }
        },
        {
          "type": "textarea",
          "id": "textarea-1",
          "key": "task.description",
          "label": "설명",
          "defaultValue": "결제 게이트웨이 연동을 위한 REST API 명세서를 작성한다. 요청/응답 스키마, 에러 코드, 인증 방식을 포함한다.",
          "layout": { "row": "card-9-r2", "columns": 16 }
        },
        {
          "type": "select",
          "id": "select-4",
          "key": "task.assignee",
          "label": "담당자",
          "defaultValue": "minsu",
          "values": [
            { "label": "김민수", "value": "minsu" },
            { "label": "이지은", "value": "jieun" },
            { "label": "박철수", "value": "cheolsu" },
            { "label": "정유진", "value": "yujin" }
          ],
          "layout": { "row": "card-9-r3", "columns": 8 }
        },
        {
          "type": "select",
          "id": "select-5",
          "key": "task.priority",
          "label": "우선순위",
          "defaultValue": "high",
          "values": [
            { "label": "높음", "value": "high" },
            { "label": "중간", "value": "medium" },
            { "label": "낮음", "value": "low" }
          ],
          "layout": { "row": "card-9-r3", "columns": 8 }
        },
        {
          "type": "select",
          "id": "select-6",
          "key": "task.status",
          "label": "상태",
          "defaultValue": "in_progress",
          "values": [
            { "label": "할 일", "value": "todo" },
            { "label": "진행중", "value": "in_progress" },
            { "label": "검토", "value": "review" },
            { "label": "완료", "value": "done" }
          ],
          "layout": { "row": "card-9-r4", "columns": 8 }
        },
        {
          "type": "datetime",
          "id": "datetime-1",
          "key": "task.dueDate",
          "label": "마감일",
          "subtype": "date",
          "defaultValue": "2026-05-02",
          "layout": { "row": "card-9-r4", "columns": 8 }
        },
        {
          "type": "select",
          "id": "select-7",
          "key": "task.label",
          "label": "라벨",
          "defaultValue": "docs",
          "values": [
            { "label": "버그", "value": "bug" },
            { "label": "기능", "value": "feature" },
            { "label": "개선", "value": "improvement" },
            { "label": "문서", "value": "docs" }
          ],
          "layout": { "row": "card-9-r5", "columns": 8 }
        },
        {
          "type": "number",
          "id": "number-1",
          "key": "task.progress",
          "label": "진행률 (%)",
          "defaultValue": 35,
          "layout": { "row": "card-9-r5", "columns": 8 }
        },
        {
          "type": "textarea",
          "id": "textarea-2",
          "key": "task.comment",
          "label": "댓글",
          "layout": { "row": "card-9-r6", "columns": 16 }
        },
        {
          "type": "button",
          "id": "button-7",
          "label": "취소",
          "action": "reset",
          "layout": { "row": "card-9-r7", "columns": 4 }
        },
        {
          "type": "button",
          "id": "button-8",
          "label": "저장",
          "action": "submit",
          "layout": { "row": "card-9-r7", "columns": 4 }
        }
      ]
    }
  ]
}
```

---

## 5. 마일스톤 · 일정 — milestone-timeline.form-js

### 목적

전체 마일스톤의 진행 상태와 일정을 관리하는 화면이다. 전체·완료·D-7이내·지연 요약 카드 4개로 현황을 파악하고, 마일스톤 목록 테이블(8건 인라인 데이터)로 상세를 조회한다. 하단에는 이번 달 마감 임박 목록과 지연 마일스톤 목록이 나란히, 그 아래에 신규 마일스톤 등록 카드가 배치된다. 등록 카드 입력들은 신규 입력 의도이므로 defaultValue 설정 없음.

### 주요 섹션

- **요약 카드 4-up (row-2)**: 전체(24)·완료(18)·D-7이내(5)·지연(1)
- **마일스톤 목록 테이블 (row-4)**: 8건 인라인 데이터, 마일스톤명·프로젝트·담당자·시작일·마감일·상태·산출물
- **이번 달 마감 + 지연 (row-5)**: 각 8col, 테이블 인라인 데이터 포함
- **등록 카드 (row-6)**: 마일스톤명·프로젝트·담당자·일정·상태·진행률·산출물 입력 (defaultValue 없음)

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 마일스톤 · 일정" | 페이지 최상단 타이틀 |
| button-1 | button | "+ 새 마일스톤" | 신규 마일스톤 등록 폼 열기 (일반 액션) |
| card-1 | card | header "전체" | 전체 마일스톤 수 KPI 카드 |
| text-2 | text | "24" | 전체 마일스톤 수 수치 표시 |
| text-3 | text | "마일스톤" | 수치 단위 레이블 |
| card-2 | card | header "완료" | 완료된 마일스톤 수 KPI 카드 |
| text-4 | text | "18" | 완료 마일스톤 수 수치 표시 |
| text-5 | text | "완료" | 수치 상태 레이블 |
| card-3 | card | header "D-7 이내" | D-7 이내 마감 예정 마일스톤 수 KPI 카드 |
| text-6 | text | "5" | D-7 이내 마일스톤 수 수치 표시 |
| text-7 | text | "예정" | 수치 상태 레이블 |
| card-4 | card | header "지연" | 지연 중인 마일스톤 수 KPI 카드 |
| text-8 | text | "1" | 지연 마일스톤 수 수치 표시 |
| text-9 | text | "지연 중" | 수치 상태 레이블 |
| textfield-1 | textfield | filters.search | 마일스톤명·프로젝트·담당자 검색 입력 |
| select-1 | select | filters.project | 프로젝트별 필터 (전체/PRJ-2026-001~003) |
| select-2 | select | filters.status | 상태별 필터 (전체/대기/진행중/완료/지연) |
| select-3 | select | filters.owner | 담당자별 필터 (검색 가능, 4명) |
| table-1 | table | "마일스톤 목록" | 마일스톤 목록 테이블, 8건 인라인 데이터 |
| card-5 | card | header "이번 달 마감" | 이번 달 마감 임박 마일스톤 요약 컨테이너 (8col) |
| table-2 | table | "다가오는 마일스톤" | 마감 임박 마일스톤 5건 테이블 — 마감일·남은 일수 |
| card-6 | card | header "지연 마일스톤" | 지연 중인 마일스톤 요약 컨테이너 (8col) |
| table-3 | table | "지연 중인 마일스톤" | 지연 마일스톤 목록 테이블 — 원래 마감·경과일수 |
| card-7 | card | header "마일스톤 등록" | 신규 마일스톤 등록 폼 컨테이너 (전폭) |
| textfield-2 | textfield | milestone.name | 마일스톤명 텍스트 입력 (defaultValue 없음 — 신규 입력) |
| select-4 | select | milestone.project | 연결할 프로젝트 선택 (PRJ-2026-001~005) |
| select-5 | select | milestone.owner | 마일스톤 담당자 선택 (검색 가능) |
| datetime-1 | datetime | milestone.startDate | 마일스톤 시작일 입력 (date) |
| datetime-2 | datetime | milestone.dueDate | 마일스톤 마감일 입력 (date) |
| select-6 | select | milestone.status | 마일스톤 상태 선택 (대기/진행중/완료/지연) |
| number-1 | number | milestone.progress | 마일스톤 진행률(%) 숫자 입력 |
| textarea-1 | textarea | milestone.deliverables | 산출물 목록 멀티라인 입력 |
| button-2 | button | "취소" | 마일스톤 등록 취소 (reset) |
| button-3 | button | "저장" | 마일스톤 신규 등록 저장 (submit) |

### 스키마

```form-js
{
  "components": [
    {
      "text": "# 마일스톤 · 일정",
      "type": "text",
      "id": "text-1",
      "layout": {
        "row": "row-1",
        "columns": 12
      }
    },
    {
      "label": "+ 새 마일스톤",
      "action": "submit",
      "type": "button",
      "id": "button-1",
      "layout": {
        "row": "row-1",
        "columns": 4
      }
    },
    {
      "label": "전체",
      "components": [
        {
          "text": "24",
          "type": "text",
          "id": "text-2",
          "layout": {
            "row": "row-1",
            "columns": 16
          }
        },
        {
          "text": "마일스톤",
          "type": "text",
          "id": "text-3",
          "layout": {
            "row": "row-2",
            "columns": 16
          }
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-1",
      "layout": {
        "row": "row-2",
        "columns": 4,
        "height": 130
      }
    },
    {
      "label": "완료",
      "components": [
        {
          "text": "18",
          "type": "text",
          "id": "text-4",
          "layout": {
            "row": "row-1",
            "columns": 16
          }
        },
        {
          "text": "완료",
          "type": "text",
          "id": "text-5",
          "layout": {
            "row": "row-2",
            "columns": 16
          }
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-2",
      "layout": {
        "row": "row-2",
        "columns": 4,
        "height": 130
      }
    },
    {
      "label": "D-7 이내",
      "components": [
        {
          "text": "5",
          "type": "text",
          "id": "text-6",
          "layout": {
            "row": "row-1",
            "columns": 16
          }
        },
        {
          "text": "예정",
          "type": "text",
          "id": "text-7",
          "layout": {
            "row": "row-2",
            "columns": 16
          }
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-3",
      "layout": {
        "row": "row-2",
        "columns": 4,
        "height": 130
      }
    },
    {
      "label": "지연",
      "components": [
        {
          "text": "1",
          "type": "text",
          "id": "text-8",
          "layout": {
            "row": "row-1",
            "columns": 16
          }
        },
        {
          "text": "지연 중",
          "type": "text",
          "id": "text-9",
          "layout": {
            "row": "row-2",
            "columns": 16
          }
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-4",
      "layout": {
        "row": "row-2",
        "columns": 4,
        "height": 130
      }
    },
    {
      "label": "검색",
      "type": "textfield",
      "id": "textfield-1",
      "key": "filters.search",
      "description": "마일스톤명, 프로젝트, 담당자로 검색",
      "layout": {
        "row": "row-3",
        "columns": 6
      }
    },
    {
      "label": "프로젝트",
      "values": [
        {
          "label": "전체",
          "value": "all"
        },
        {
          "label": "PRJ-2026-001",
          "value": "proj1"
        },
        {
          "label": "PRJ-2026-002",
          "value": "proj2"
        },
        {
          "label": "PRJ-2026-003",
          "value": "proj3"
        }
      ],
      "type": "select",
      "id": "select-1",
      "key": "filters.project",
      "layout": {
        "row": "row-3",
        "columns": 4
      }
    },
    {
      "label": "상태",
      "values": [
        {
          "label": "전체",
          "value": "all"
        },
        {
          "label": "대기",
          "value": "pending"
        },
        {
          "label": "진행중",
          "value": "inProgress"
        },
        {
          "label": "완료",
          "value": "completed"
        },
        {
          "label": "지연",
          "value": "delayed"
        }
      ],
      "type": "select",
      "id": "select-2",
      "key": "filters.status",
      "layout": {
        "row": "row-3",
        "columns": 3
      }
    },
    {
      "label": "담당자",
      "values": [
        {
          "label": "전체",
          "value": "all"
        },
        {
          "label": "김민수",
          "value": "minsu"
        },
        {
          "label": "이영희",
          "value": "younghee"
        },
        {
          "label": "박준호",
          "value": "junho"
        },
        {
          "label": "최지은",
          "value": "jieun"
        }
      ],
      "type": "select",
      "id": "select-3",
      "key": "filters.owner",
      "searchable": true,
      "layout": {
        "row": "row-3",
        "columns": 3
      }
    },
    {
      "type": "table",
      "label": "마일스톤 목록",
      "dataSource": "= [{name:\"1차 PG 연동 완료\",project:\"PRJ-2026-001\",owner:\"김민수\",startDate:\"2026-04-01\",dueDate:\"2026-04-30\",status:\"진행중\",deliverables:\"연동 명세서·테스트 리포트\"},{name:\"API 명세 작성\",project:\"PRJ-2026-001\",owner:\"이영희\",startDate:\"2026-04-05\",dueDate:\"2026-04-20\",status:\"완료\",deliverables:\"API 문서·Swagger\"},{name:\"UI 프로토타입\",project:\"PRJ-2026-002\",owner:\"박준호\",startDate:\"2026-04-10\",dueDate:\"2026-05-10\",status:\"진행중\",deliverables:\"피그마 파일·스펙\"},{name:\"데이터베이스 설계\",project:\"PRJ-2026-002\",owner:\"최지은\",startDate:\"2026-04-08\",dueDate:\"2026-04-25\",status:\"완료\",deliverables:\"ERD·DDL 스크립트\"},{name:\"보안 검토\",project:\"PRJ-2026-003\",owner:\"김민수\",startDate:\"2026-04-15\",dueDate:\"2026-05-05\",status:\"대기\",deliverables:\"보안 감사 보고서\"},{name:\"성능 테스트\",project:\"PRJ-2026-001\",owner:\"이영희\",startDate:\"2026-04-12\",dueDate:\"2026-04-28\",status:\"진행중\",deliverables:\"성능 측정 결과·최적화 계획\"},{name:\"배포 준비\",project:\"PRJ-2026-003\",owner:\"박준호\",startDate:\"2026-04-20\",dueDate:\"2026-05-01\",status:\"대기\",deliverables:\"배포 체크리스트·환경 구성\"},{name:\"사용자 교육\",project:\"PRJ-2026-002\",owner:\"최지은\",startDate:\"2026-05-05\",dueDate:\"2026-05-20\",status:\"지연\",deliverables:\"교육 자료·영상 튜토리얼\"}]",
      "layout": {
        "row": "row-4",
        "columns": 16,
        "height": 480
      },
      "rowCount": 10,
      "id": "table-1",
      "columns": [
        {
          "label": "마일스톤명",
          "key": "name"
        },
        {
          "label": "프로젝트",
          "key": "project"
        },
        {
          "label": "담당자",
          "key": "owner"
        },
        {
          "label": "시작일",
          "key": "startDate"
        },
        {
          "label": "마감일",
          "key": "dueDate"
        },
        {
          "label": "상태",
          "key": "status"
        },
        {
          "label": "산출물",
          "key": "deliverables"
        }
      ]
    },
    {
      "label": "이번 달 마감",
      "components": [
        {
          "type": "table",
          "label": "다가오는 마일스톤",
          "dataSource": "= [{milestone:\"API 명세 작성\",dueDate:\"2026-04-20\",daysLeft:\"3\",owner:\"이영희\"},{milestone:\"1차 PG 연동 완료\",dueDate:\"2026-04-30\",daysLeft:\"13\",owner:\"김민수\"},{milestone:\"데이터베이스 설계\",dueDate:\"2026-04-25\",daysLeft:\"8\",owner:\"최지은\"},{milestone:\"성능 테스트\",dueDate:\"2026-04-28\",daysLeft:\"11\",owner:\"이영희\"},{milestone:\"배포 준비\",dueDate:\"2026-05-01\",daysLeft:\"14\",owner:\"박준호\"}]",
          "rowCount": 5,
          "id": "table-2",
          "columns": [
            {
              "label": "마일스톤",
              "key": "milestone"
            },
            {
              "label": "마감일",
              "key": "dueDate"
            },
            {
              "label": "남은일수",
              "key": "daysLeft"
            },
            {
              "label": "담당자",
              "key": "owner"
            }
          ]
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-5",
      "layout": {
        "row": "row-5",
        "columns": 8,
        "height": 320
      }
    },
    {
      "label": "지연 마일스톤",
      "components": [
        {
          "type": "table",
          "label": "지연 중인 마일스톤",
          "dataSource": "= [{milestone:\"사용자 교육\",originalDue:\"2026-05-20\",daysOverdue:\"9\",owner:\"최지은\"}]",
          "rowCount": 4,
          "id": "table-3",
          "columns": [
            {
              "label": "마일스톤",
              "key": "milestone"
            },
            {
              "label": "원래 마감",
              "key": "originalDue"
            },
            {
              "label": "경과일수",
              "key": "daysOverdue"
            },
            {
              "label": "담당자",
              "key": "owner"
            }
          ]
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-6",
      "layout": {
        "row": "row-5",
        "columns": 8,
        "height": 320
      }
    },
    {
      "label": "마일스톤 등록",
      "components": [
        {
          "label": "마일스톤명",
          "type": "textfield",
          "id": "textfield-2",
          "key": "milestone.name",
          "layout": {
            "row": "row-1",
            "columns": 8
          }
        },
        {
          "label": "프로젝트",
          "values": [
            {
              "label": "PRJ-2026-001",
              "value": "proj1"
            },
            {
              "label": "PRJ-2026-002",
              "value": "proj2"
            },
            {
              "label": "PRJ-2026-003",
              "value": "proj3"
            },
            {
              "label": "PRJ-2026-004",
              "value": "proj4"
            },
            {
              "label": "PRJ-2026-005",
              "value": "proj5"
            }
          ],
          "type": "select",
          "id": "select-4",
          "key": "milestone.project",
          "layout": {
            "row": "row-1",
            "columns": 4
          }
        },
        {
          "label": "담당자",
          "values": [
            {
              "label": "김민수",
              "value": "minsu"
            },
            {
              "label": "이영희",
              "value": "younghee"
            },
            {
              "label": "박준호",
              "value": "junho"
            },
            {
              "label": "최지은",
              "value": "jieun"
            }
          ],
          "type": "select",
          "id": "select-5",
          "key": "milestone.owner",
          "searchable": true,
          "layout": {
            "row": "row-1",
            "columns": 4
          }
        },
        {
          "subtype": "date",
          "type": "datetime",
          "id": "datetime-1",
          "key": "milestone.startDate",
          "label": "시작일",
          "layout": {
            "row": "row-2",
            "columns": 4
          }
        },
        {
          "subtype": "date",
          "type": "datetime",
          "id": "datetime-2",
          "key": "milestone.dueDate",
          "label": "마감일",
          "layout": {
            "row": "row-2",
            "columns": 4
          }
        },
        {
          "label": "상태",
          "values": [
            {
              "label": "대기",
              "value": "pending"
            },
            {
              "label": "진행중",
              "value": "inProgress"
            },
            {
              "label": "완료",
              "value": "completed"
            },
            {
              "label": "지연",
              "value": "delayed"
            }
          ],
          "type": "select",
          "id": "select-6",
          "key": "milestone.status",
          "layout": {
            "row": "row-2",
            "columns": 4
          }
        },
        {
          "label": "진행률 (%)",
          "type": "number",
          "id": "number-1",
          "key": "milestone.progress",
          "layout": {
            "row": "row-2",
            "columns": 4
          }
        },
        {
          "label": "산출물",
          "type": "textarea",
          "id": "textarea-1",
          "key": "milestone.deliverables",
          "layout": {
            "row": "row-3",
            "columns": 16,
            "height": 120
          }
        },
        {
          "label": "취소",
          "action": "reset",
          "type": "button",
          "id": "button-2",
          "layout": {
            "row": "row-4",
            "columns": 8
          }
        },
        {
          "label": "저장",
          "action": "submit",
          "type": "button",
          "id": "button-3",
          "layout": {
            "row": "row-4",
            "columns": 8
          }
        }
      ],
      "showOutline": true,
      "type": "group",
      "id": "group-7",
      "layout": {
        "row": "row-6",
        "columns": 16
      }
    }
  ],
  "schemaVersion": 19,
  "type": "default",
  "id": "Form_0xbqihs"
}
```

---


## 6. 팀원 관리 — team-members.form-js

### 목적

팀원 인적 정보와 프로젝트 가동 현황을 통합 관리하는 화면이다. 전체 인원·가용 인원·평균 가동률·신규 입사 요약 카드 4개, 팀원 목록 테이블(10명 인라인 데이터), 부서별·역할별 통계 테이블, 그리고 선택된 팀원(김민수)의 상세 정보 카드로 구성된다. 정보 카드의 모든 입력에는 김민수 샘플 데이터가 채워져 있다.

### 주요 섹션

- **요약 카드 4-up (row-2)**: 전체·가용·평균 가동률·신규 입사
- **팀원 목록 테이블 (row-4)**: 10명 이름·역할·부서·가동률·이메일·연락처·상태 인라인 데이터
- **부서별 + 역할별 통계 (row-5)**: 각 8col, 테이블 인라인
- **팀원 정보 카드 (row-6)**: 이름·사번·부서·역할·직급·입사일·가동률·이메일·연락처·메모 — 김민수 defaultValue 설정

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 팀원 관리" | 페이지 최상단 타이틀 |
| button-1 | button | "+ 팀원 추가" | 신규 팀원 등록 폼 열기 (일반 액션) |
| card-1 | card | header "전체 인원" | 전체 팀원 수 KPI 카드 |
| card-2 | card | header "가용 인원" | 현재 가용 상태 팀원 수 KPI 카드 |
| card-3 | card | header "평균 가동률" | 팀 전체 평균 가동률 KPI 카드 |
| card-4 | card | header "신규 입사" | 이번 분기 신규 입사 수 KPI 카드 |
| textfield-1 | textfield | filters.search | 이름·이메일로 팀원 검색 입력 |
| select-1 | select | filters.department | 부서별 필터 (개발/디자인/마케팅/영업/운영/인사) |
| select-2 | select | filters.role | 역할별 필터 (PM/개발자/디자이너/QA/마케터/영업) |
| select-3 | select | filters.status | 상태별 필터 (가용/바쁨/휴가/외근) |
| table-1 | table | "팀원 목록" | 팀원 목록 테이블, 10명 인라인 데이터 — 행 클릭 시 정보 카드 표시 |
| card-5 | card | header "부서별 인원" | 부서별 인원·가동률·매니저 통계 컨테이너 (8col) |
| table-2 | table | (부서별 통계) | 6개 부서별 인원·평균 가동률·매니저 테이블 |
| card-6 | card | header "역할별 분포" | 역할별 인원·경력·가동률 통계 컨테이너 (8col) |
| table-3 | table | (역할별 통계) | 6개 역할별 인원·평균 경력·가동률 테이블 |
| card-7 | card | header "팀원 정보" | 선택된 팀원(김민수) 상세 편집 컨테이너 (전폭) |
| textfield-2 | textfield | member.name | 팀원 이름 입력 — defaultValue "김민수" (required) |
| textfield-3 | textfield | member.empId | 사번 입력 — defaultValue "E-2018-042" |
| select-4 | select | member.department | 소속 부서 선택 — defaultValue "dev" (개발팀) |
| select-5 | select | member.role | 직무 역할 선택 — defaultValue "pm" |
| select-6 | select | member.position | 직급 선택 — defaultValue "manager" (과장) |
| datetime-1 | datetime | member.joinDate | 입사일 입력 (date) — defaultValue "2018-03-02" |
| number-1 | number | member.utilization | 현재 가동률(%) 숫자 입력 — defaultValue 85 |
| textfield-4 | textfield | member.email | 이메일 입력 — defaultValue "minsu.kim@acme.co.kr" |
| textfield-5 | textfield | member.phone | 연락처 입력 — defaultValue "010-1234-5678" |
| textarea-1 | textarea | member.note | 팀원 메모 멀티라인 입력 |
| button-2 | button | "삭제" | 팀원 정보 삭제 (일반 액션, 확인 필요) |
| button-3 | button | "취소" | 팀원 정보 편집 취소 (reset) |
| button-4 | button | "저장" | 팀원 정보 변경 저장 (submit) |

### 스키마

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "text",
      "id": "text-1",
      "text": "# 팀원 관리",
      "layout": { "row": "row-1", "columns": 12 }
    },
    {
      "type": "button",
      "id": "button-1",
      "label": "+ 팀원 추가",
      "layout": { "row": "row-1", "columns": 4 }
    },
    {
      "type": "card",
      "id": "card-1",
      "header": "전체 인원",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-2", "columns": 4, "height": 120 },
      "components": []
    },
    {
      "type": "card",
      "id": "card-2",
      "header": "가용 인원",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-2", "columns": 4, "height": 120 },
      "components": []
    },
    {
      "type": "card",
      "id": "card-3",
      "header": "평균 가동률",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-2", "columns": 4, "height": 120 },
      "components": []
    },
    {
      "type": "card",
      "id": "card-4",
      "header": "신규 입사",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-2", "columns": 4, "height": 120 },
      "components": []
    },
    {
      "type": "textfield",
      "id": "textfield-1",
      "key": "filters.search",
      "label": "이름·이메일 검색",
      "layout": { "row": "row-3", "columns": 6 }
    },
    {
      "type": "select",
      "id": "select-1",
      "key": "filters.department",
      "label": "부서",
      "values": [
        { "label": "개발팀", "value": "dev" },
        { "label": "디자인팀", "value": "design" },
        { "label": "마케팅팀", "value": "marketing" },
        { "label": "영업팀", "value": "sales" },
        { "label": "운영팀", "value": "operations" },
        { "label": "인사팀", "value": "hr" }
      ],
      "layout": { "row": "row-3", "columns": 4 }
    },
    {
      "type": "select",
      "id": "select-2",
      "key": "filters.role",
      "label": "역할",
      "values": [
        { "label": "PM", "value": "pm" },
        { "label": "개발자", "value": "developer" },
        { "label": "디자이너", "value": "designer" },
        { "label": "QA", "value": "qa" },
        { "label": "마케터", "value": "marketer" },
        { "label": "영업", "value": "sales" }
      ],
      "layout": { "row": "row-3", "columns": 3 }
    },
    {
      "type": "select",
      "id": "select-3",
      "key": "filters.status",
      "label": "상태",
      "values": [
        { "label": "가용", "value": "available" },
        { "label": "바쁨", "value": "busy" },
        { "label": "휴가", "value": "vacation" },
        { "label": "외근", "value": "offsite" }
      ],
      "layout": { "row": "row-3", "columns": 3 }
    },
    {
      "type": "table",
      "id": "table-1",
      "label": "팀원 목록",
      "rowCount": 10,
      "columns": [
        { "label": "이름", "key": "name" },
        { "label": "역할", "key": "role" },
        { "label": "부서", "key": "department" },
        { "label": "담당 프로젝트 수", "key": "projectCount" },
        { "label": "가동률", "key": "utilization" },
        { "label": "이메일", "key": "email" },
        { "label": "연락처", "key": "phone" },
        { "label": "상태", "key": "status" }
      ],
      "dataSource": "= [{name:\"김민수\",role:\"PM\",department:\"개발팀\",projectCount:4,utilization:\"85%\",email:\"minsu.kim@acme.co.kr\",phone:\"010-1234-5678\",status:\"가용\"}, {name:\"이지은\",role:\"개발자\",department:\"개발팀\",projectCount:3,utilization:\"92%\",email:\"jieun.lee@acme.co.kr\",phone:\"010-2345-6789\",status:\"바쁨\"}, {name:\"박준호\",role:\"디자이너\",department:\"디자인팀\",projectCount:2,utilization:\"78%\",email:\"junho.park@acme.co.kr\",phone:\"010-3456-7890\",status:\"가용\"}, {name:\"최수진\",role:\"QA\",department:\"개발팀\",projectCount:5,utilization:\"88%\",email:\"sujin.choi@acme.co.kr\",phone:\"010-4567-8901\",status:\"가용\"}, {name:\"정준영\",role:\"마케터\",department:\"마케팅팀\",projectCount:3,utilization:\"80%\",email:\"junyoung.jung@acme.co.kr\",phone:\"010-5678-9012\",status:\"휴가\"}, {name:\"허지훈\",role:\"개발자\",department:\"개발팀\",projectCount:4,utilization:\"90%\",email:\"jihun.heo@acme.co.kr\",phone:\"010-6789-0123\",status:\"가용\"}, {name:\"나유경\",role:\"PM\",department:\"마케팅팀\",projectCount:2,utilization:\"75%\",email:\"yukyung.na@acme.co.kr\",phone:\"010-7890-1234\",status:\"가용\"}, {name:\"손영준\",role:\"영업\",department:\"영업팀\",projectCount:6,utilization:\"95%\",email:\"youngjun.son@acme.co.kr\",phone:\"010-8901-2345\",status:\"외근\"}, {name:\"오은별\",role:\"디자이너\",department:\"디자인팀\",projectCount:2,utilization:\"82%\",email:\"eunbyeol.oh@acme.co.kr\",phone:\"010-9012-3456\",status:\"가용\"}, {name:\"강민철\",role:\"개발자\",department:\"개발팀\",projectCount:3,utilization:\"87%\",email:\"minchul.kang@acme.co.kr\",phone:\"010-1111-2222\",status:\"바쁨\"}]",
      "layout": { "row": "row-4", "columns": 16, "height": 520 }
    },
    {
      "type": "card",
      "id": "card-5",
      "header": "부서별 인원",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-5", "columns": 8, "height": 320 },
      "components": [
        {
          "type": "table",
          "id": "table-2",
          "rowCount": 6,
          "columns": [
            { "label": "부서", "key": "dept" },
            { "label": "인원", "key": "count" },
            { "label": "평균 가동률", "key": "avgUtil" },
            { "label": "매니저", "key": "manager" }
          ],
          "dataSource": "= [{dept:\"개발팀\",count:4,avgUtil:\"88%\",manager:\"김민수\"}, {dept:\"디자인팀\",count:2,avgUtil:\"80%\",manager:\"박준호\"}, {dept:\"마케팅팀\",count:2,avgUtil:\"78%\",manager:\"나유경\"}, {dept:\"영업팀\",count:1,avgUtil:\"95%\",manager:\"손영준\"}, {dept:\"운영팀\",count:0,avgUtil:\"-\",manager:\"-\"}, {dept:\"인사팀\",count:0,avgUtil:\"-\",manager:\"-\"}]"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-6",
      "header": "역할별 분포",
      "headerTag": "h3",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-5", "columns": 8, "height": 320 },
      "components": [
        {
          "type": "table",
          "id": "table-3",
          "rowCount": 6,
          "columns": [
            { "label": "역할", "key": "role" },
            { "label": "인원", "key": "count" },
            { "label": "평균 경력", "key": "avgCareer" },
            { "label": "평균 가동률", "key": "avgUtil" }
          ],
          "dataSource": "= [{role:\"PM\",count:2,avgCareer:\"6.5년\",avgUtil:\"80%\"}, {role:\"개발자\",count:4,avgCareer:\"4.2년\",avgUtil:\"88%\"}, {role:\"디자이너\",count:2,avgCareer:\"3.5년\",avgUtil:\"80%\"}, {role:\"QA\",count:1,avgCareer:\"5.0년\",avgUtil:\"88%\"}, {role:\"마케터\",count:1,avgCareer:\"4.0년\",avgUtil:\"80%\"}, {role:\"영업\",count:1,avgCareer:\"7.0년\",avgUtil:\"95%\"}]"
        }
      ]
    },
    {
      "type": "card",
      "id": "card-7",
      "header": "팀원 정보",
      "headerTag": "h2",
      "padding": "md",
      "elevation": 1,
      "layout": { "row": "row-6", "columns": 16 },
      "components": [
        {
          "type": "textfield",
          "id": "textfield-2",
          "key": "member.name",
          "label": "이름",
          "defaultValue": "김민수",
          "validate": { "required": true },
          "layout": { "row": "row-1", "columns": 6 }
        },
        {
          "type": "textfield",
          "id": "textfield-3",
          "key": "member.empId",
          "label": "사번",
          "defaultValue": "E-2018-042",
          "layout": { "row": "row-1", "columns": 4 }
        },
        {
          "type": "select",
          "id": "select-4",
          "key": "member.department",
          "label": "부서",
          "defaultValue": "dev",
          "values": [
            { "label": "개발팀", "value": "dev" },
            { "label": "디자인팀", "value": "design" },
            { "label": "마케팅팀", "value": "marketing" },
            { "label": "영업팀", "value": "sales" },
            { "label": "운영팀", "value": "operations" },
            { "label": "인사팀", "value": "hr" }
          ],
          "layout": { "row": "row-1", "columns": 6 }
        },
        {
          "type": "select",
          "id": "select-5",
          "key": "member.role",
          "label": "역할",
          "defaultValue": "pm",
          "values": [
            { "label": "PM", "value": "pm" },
            { "label": "개발자", "value": "developer" },
            { "label": "디자이너", "value": "designer" },
            { "label": "QA", "value": "qa" },
            { "label": "마케터", "value": "marketer" },
            { "label": "영업", "value": "sales" }
          ],
          "layout": { "row": "row-2", "columns": 4 }
        },
        {
          "type": "select",
          "id": "select-6",
          "key": "member.position",
          "label": "직급",
          "defaultValue": "manager",
          "values": [
            { "label": "사원", "value": "staff" },
            { "label": "대리", "value": "assistant" },
            { "label": "과장", "value": "manager" },
            { "label": "차장", "value": "senior" },
            { "label": "부장", "value": "director" }
          ],
          "layout": { "row": "row-2", "columns": 4 }
        },
        {
          "type": "datetime",
          "id": "datetime-1",
          "key": "member.joinDate",
          "label": "입사일",
          "subtype": "date",
          "defaultValue": "2018-03-02",
          "layout": { "row": "row-2", "columns": 4 }
        },
        {
          "type": "number",
          "id": "number-1",
          "key": "member.utilization",
          "label": "가동률(%)",
          "defaultValue": 85,
          "layout": { "row": "row-2", "columns": 4 }
        },
        {
          "type": "textfield",
          "id": "textfield-4",
          "key": "member.email",
          "label": "이메일",
          "defaultValue": "minsu.kim@acme.co.kr",
          "layout": { "row": "row-3", "columns": 8 }
        },
        {
          "type": "textfield",
          "id": "textfield-5",
          "key": "member.phone",
          "label": "연락처",
          "defaultValue": "010-1234-5678",
          "layout": { "row": "row-3", "columns": 8 }
        },
        {
          "type": "textarea",
          "id": "textarea-1",
          "key": "member.note",
          "label": "메모",
          "layout": { "row": "row-4", "columns": 16, "height": 120 }
        },
        {
          "type": "button",
          "id": "button-2",
          "label": "삭제",
          "layout": { "row": "row-5", "columns": 4 }
        },
        {
          "type": "button",
          "id": "button-3",
          "label": "취소",
          "action": "reset",
          "layout": { "row": "row-5", "columns": 4 }
        },
        {
          "type": "button",
          "id": "button-4",
          "label": "저장",
          "action": "submit",
          "layout": { "row": "row-5", "columns": 4 }
        }
      ]
    }
  ]
}
```

---

## 7. 프로젝트 리포트 — project-reports.form-js

### 목적

프로젝트 완료율, 예산 집행, 부서별·월별 현황을 종합 분석하는 리포트 화면이다. 날짜 범위·부서·카테고리 필터로 조회 범위를 설정하고, 완료율·평균 진행률·지연 비율·총 예산 집행 KPI 카드 4개로 핵심 지표를 확인한다. 부서별 진행률 테이블과 월별 완료 추이 테이블이 좌우로, 하단에 프로젝트별 비용 분석 테이블이 전폭으로 배치된다. 엑셀 내보내기·PDF 출력 버튼 제공.

### 주요 섹션

- **필터 (row-2)**: 시작일·종료일(datetime), 부서·카테고리(select)
- **KPI 카드 4-up (row-3)**: 완료율 78.4% / 평균 진행률 62.1% / 지연 비율 14.7% / 총 예산 집행 84억
- **부서별 + 월별 현황 (row-4)**: 각 8col, 인라인 테이블 데이터
- **비용 분석 테이블 (row-5)**: 8건 프로젝트 예산 집행 현황
- **분석 메모 + 저장 (row-6)**: textarea + submit 버튼

### 컴포넌트 명세

| ID | type | key / label | 설명 |
|----|------|-------------|------|
| text-1 | text | "# 프로젝트 리포트" | 페이지 최상단 타이틀 |
| button-1 | button | "엑셀 내보내기" | 현재 리포트 데이터를 엑셀로 내보내기 (submit) |
| button-2 | button | "PDF 출력" | 현재 리포트를 PDF로 출력 (submit) |
| datetime-1 | datetime | filters.startDate | 리포트 조회 시작일 필터 (date) |
| datetime-2 | datetime | filters.endDate | 리포트 조회 종료일 필터 (date) |
| select-1 | select | filters.department | 부서별 리포트 필터 (전체/7개 부서) |
| select-2 | select | filters.category | 프로젝트 카테고리 필터 (전체/신규 개발/유지보수/인프라/마케팅/연구개발) |
| card-1 | card | header "완료율" | 프로젝트 완료율 KPI 카드 — 78.4% |
| text-2 | text | "## 78.4% / 완료된 프로젝트 비율" | 완료율 수치 및 설명 텍스트 |
| card-2 | card | header "평균 진행률" | 전체 평균 진행률 KPI 카드 — 62.1% |
| text-3 | text | "## 62.1% / 전체 프로젝트 평균" | 평균 진행률 수치 및 설명 텍스트 |
| card-3 | card | header "지연 비율" | 일정 지연 프로젝트 비율 KPI 카드 — 14.7% |
| text-4 | text | "## 14.7% / 일정 지연 프로젝트" | 지연 비율 수치 및 설명 텍스트 |
| card-4 | card | header "총 예산 집행" | 연간 총 예산 집행 현황 KPI 카드 |
| text-5 | text | "## 84억 3,200만원 / 연간 예산 대비 집행" | 총 예산 집행 금액 및 설명 텍스트 |
| card-5 | card | header "부서별 현황" | 부서별 진행률·지연·완료율 통계 컨테이너 (8col) |
| table-1 | table | "부서별 진행률" | 7개 부서별 진행 프로젝트 수·진행률·지연·분기 완료율 테이블 |
| card-6 | card | header "월별 완료 추이" | 월별 신규·완료·지연 추이 컨테이너 (8col) |
| text-6 | text | (아스키 바 차트) | 월별 완료 건수 텍스트 바 차트 시각화 |
| table-2 | table | "월별 현황" | 1~6월 신규·완료·지연 건수 테이블 |
| table-3 | table | "프로젝트별 비용 분석" | 8개 프로젝트 책정 예산·집행·잔여·집행률·상태 테이블 |
| textarea-1 | textarea | reports.notes | 리포트 분석 메모 멀티라인 입력 |
| button-3 | button | "저장" | 분석 메모 저장 (submit) |

### 스키마

```form-js
{
  "components": [
    {
      "text": "# 프로젝트 리포트",
      "type": "text",
      "id": "text-1",
      "layout": {
        "row": "row-1",
        "columns": 10
      }
    },
    {
      "label": "엑셀 내보내기",
      "action": "submit",
      "type": "button",
      "id": "button-1",
      "layout": {
        "row": "row-1",
        "columns": 3
      }
    },
    {
      "label": "PDF 출력",
      "action": "submit",
      "type": "button",
      "id": "button-2",
      "layout": {
        "row": "row-1",
        "columns": 3
      }
    },
    {
      "subtype": "date",
      "type": "datetime",
      "id": "datetime-1",
      "key": "filters.startDate",
      "layout": {
        "row": "row-2",
        "columns": 4
      },
      "dateLabel": "시작일"
    },
    {
      "subtype": "date",
      "type": "datetime",
      "id": "datetime-2",
      "key": "filters.endDate",
      "layout": {
        "row": "row-2",
        "columns": 4
      },
      "dateLabel": "종료일"
    },
    {
      "label": "부서",
      "values": [
        {
          "label": "전체 부서",
          "value": "all"
        },
        {
          "label": "개발팀",
          "value": "dev"
        },
        {
          "label": "디자인팀",
          "value": "design"
        },
        {
          "label": "마케팅팀",
          "value": "marketing"
        },
        {
          "label": "영업팀",
          "value": "sales"
        },
        {
          "label": "운영팀",
          "value": "ops"
        },
        {
          "label": "인사팀",
          "value": "hr"
        },
        {
          "label": "재무팀",
          "value": "finance"
        }
      ],
      "type": "select",
      "id": "select-1",
      "key": "filters.department",
      "layout": {
        "row": "row-2",
        "columns": 4
      }
    },
    {
      "label": "프로젝트 카테고리",
      "values": [
        {
          "label": "전체 카테고리",
          "value": "all"
        },
        {
          "label": "신규 개발",
          "value": "new"
        },
        {
          "label": "유지보수",
          "value": "maintenance"
        },
        {
          "label": "인프라",
          "value": "infra"
        },
        {
          "label": "마케팅",
          "value": "marketing"
        },
        {
          "label": "연구개발",
          "value": "rnd"
        }
      ],
      "type": "select",
      "id": "select-2",
      "key": "filters.category",
      "layout": {
        "row": "row-2",
        "columns": 4
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "text": "## 78.4%\n완료된 프로젝트 비율",
          "type": "text",
          "id": "text-2"
        }
      ],
      "id": "card-1",
      "header": "완료율",
      "headerTag": "h3",
      "layout": {
        "row": "row-3",
        "columns": 4,
        "height": 130
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "text": "## 62.1%\n전체 프로젝트 평균",
          "type": "text",
          "id": "text-3"
        }
      ],
      "id": "card-2",
      "header": "평균 진행률",
      "headerTag": "h3",
      "layout": {
        "row": "row-3",
        "columns": 4,
        "height": 130
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "text": "## 14.7%\n일정 지연 프로젝트",
          "type": "text",
          "id": "text-4"
        }
      ],
      "id": "card-3",
      "header": "지연 비율",
      "headerTag": "h3",
      "layout": {
        "row": "row-3",
        "columns": 4,
        "height": 130
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "text": "## 84억 3,200만원\n연간 예산 대비 집행",
          "type": "text",
          "id": "text-5"
        }
      ],
      "id": "card-4",
      "header": "총 예산 집행",
      "headerTag": "h3",
      "layout": {
        "row": "row-3",
        "columns": 4,
        "height": 130
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "type": "table",
          "label": "부서별 진행률",
          "dataSource": "= [{dept:\"개발팀\",activeCount:12,avgProgress:\"68.3%\",delayCount:2,quarterlyCompletion:\"83.3%\"},{dept:\"디자인팀\",activeCount:7,avgProgress:\"74.1%\",delayCount:1,quarterlyCompletion:\"85.7%\"},{dept:\"마케팅팀\",activeCount:9,avgProgress:\"55.8%\",delayCount:3,quarterlyCompletion:\"66.7%\"},{dept:\"영업팀\",activeCount:11,avgProgress:\"61.4%\",delayCount:2,quarterlyCompletion:\"72.7%\"},{dept:\"운영팀\",activeCount:6,avgProgress:\"79.2%\",delayCount:0,quarterlyCompletion:\"100.0%\"},{dept:\"인사팀\",activeCount:4,avgProgress:\"88.5%\",delayCount:0,quarterlyCompletion:\"100.0%\"},{dept:\"재무팀\",activeCount:5,avgProgress:\"52.3%\",delayCount:1,quarterlyCompletion:\"80.0%\"}]",
          "rowCount": 7,
          "id": "table-1",
          "columns": [
            {
              "label": "부서",
              "key": "dept"
            },
            {
              "label": "진행 프로젝트 수",
              "key": "activeCount"
            },
            {
              "label": "평균 진행률",
              "key": "avgProgress"
            },
            {
              "label": "지연 건수",
              "key": "delayCount"
            },
            {
              "label": "분기 완료율",
              "key": "quarterlyCompletion"
            }
          ]
        }
      ],
      "id": "card-5",
      "header": "부서별 현황",
      "headerTag": "h3",
      "layout": {
        "row": "row-4",
        "columns": 8,
        "height": 360
      }
    },
    {
      "type": "card",
      "padding": "md",
      "elevation": 1,
      "components": [
        {
          "text": "```\n1월  ████░░░░  5\n2월  ██████░░  8\n3월  ████████  11\n4월  ██████░░  9\n5월  ██████░░  9\n6월  ████████  12\n7월  ██████░░  8\n8월  █████░░░  7\n9월  ████████  13\n10월 ██████░░  10\n11월 █████░░░  7\n12월 ████░░░░  6\n```",
          "type": "text",
          "id": "text-6"
        },
        {
          "type": "table",
          "label": "월별 현황",
          "dataSource": "= [{month:\"1월\",newCount:7,doneCount:5,delayCount:1},{month:\"2월\",newCount:10,doneCount:8,delayCount:2},{month:\"3월\",newCount:13,doneCount:11,delayCount:1},{month:\"4월\",newCount:11,doneCount:9,delayCount:2},{month:\"5월\",newCount:12,doneCount:9,delayCount:3},{month:\"6월\",newCount:14,doneCount:12,delayCount:1}]",
          "rowCount": 6,
          "id": "table-2",
          "columns": [
            {
              "label": "월",
              "key": "month"
            },
            {
              "label": "신규",
              "key": "newCount"
            },
            {
              "label": "완료",
              "key": "doneCount"
            },
            {
              "label": "지연",
              "key": "delayCount"
            }
          ]
        }
      ],
      "id": "card-6",
      "header": "월별 완료 추이",
      "headerTag": "h3",
      "layout": {
        "row": "row-4",
        "columns": 8,
        "height": 360
      }
    },
    {
      "type": "table",
      "label": "프로젝트별 비용 분석",
      "dataSource": "= [{projectName:\"차세대 ERP 구축\",budget:\"12억 5,000만원\",spent:\"9억 8,400만원\",remaining:\"2억 6,600만원\",spentRate:\"78.7%\",status:\"진행중\"},{projectName:\"모바일 앱 리뉴얼\",budget:\"3억 2,000만원\",spent:\"3억 1,500만원\",remaining:\"500만원\",spentRate:\"98.4%\",status:\"완료\"},{projectName:\"클라우드 인프라 전환\",budget:\"8억 7,000만원\",spent:\"5억 2,000만원\",remaining:\"3억 5,000만원\",spentRate:\"59.8%\",status:\"진행중\"},{projectName:\"디지털 마케팅 플랫폼\",budget:\"2억 1,000만원\",spent:\"2억 3,400만원\",remaining:\"-2,400만원\",spentRate:\"111.4%\",status:\"초과\"},{projectName:\"CRM 고도화\",budget:\"4억 5,000만원\",spent:\"4억 500만원\",remaining:\"4,500만원\",spentRate:\"90.0%\",status:\"완료\"},{projectName:\"데이터 분석 플랫폼\",budget:\"6억 8,000만원\",spent:\"2억 1,000만원\",remaining:\"4억 7,000만원\",spentRate:\"30.9%\",status:\"초기\"},{projectName:\"HR 시스템 개편\",budget:\"1억 9,000만원\",spent:\"1억 7,600만원\",remaining:\"1,400만원\",spentRate:\"92.6%\",status:\"진행중\"},{projectName:\"보안 인프라 강화\",budget:\"3억 4,000만원\",spent:\"3억 4,000만원\",remaining:\"0원\",spentRate:\"100.0%\",status:\"완료\"}]",
      "layout": {
        "row": "row-5",
        "columns": 16,
        "height": 420
      },
      "rowCount": 8,
      "id": "table-3",
      "columns": [
        {
          "label": "프로젝트명",
          "key": "projectName"
        },
        {
          "label": "책정 예산",
          "key": "budget"
        },
        {
          "label": "집행",
          "key": "spent"
        },
        {
          "label": "잔여",
          "key": "remaining"
        },
        {
          "label": "집행률",
          "key": "spentRate"
        },
        {
          "label": "상태",
          "key": "status"
        }
      ]
    },
    {
      "label": "분석 메모",
      "type": "textarea",
      "id": "textarea-1",
      "key": "reports.notes",
      "layout": {
        "row": "row-6",
        "columns": 12
      }
    },
    {
      "label": "저장",
      "action": "submit",
      "type": "button",
      "id": "button-3",
      "layout": {
        "row": "row-6",
        "columns": 4
      }
    }
  ],
  "schemaVersion": 19,
  "type": "default",
  "id": "Form_1tsrb1t"
}
```
## 추가 — 프로젝트 로드맵 (Gantt)

전체 프로젝트의 일정을 월 단위로 시각화한 Gantt 차트. form-js `table` 컴포넌트의 월별 컬럼에 바 블록(`▓` active · `░` 완료/미시작 · `▒` 지연)을 채워 시간 흐름을 표현했다. 행은 PRJ-2026-001 ~ 009 + PRJ-2025-098(완료)로 구성하고 진행률·상태를 함께 보여준다.

### 컴포넌트 명세
| ID | type | key / label | 설명 |
|----|------|-------------|------|
| card-1 | card | header "프로젝트 로드맵 (2026 3월~11월)" | Gantt 컨테이너 |
| text-1 | text | (범례) | 바 블록 의미 안내 (▓ 진행 · ░ 미진행 · ▒ 지연) |
| table-1 | table | "프로젝트 일정" | 행=프로젝트, 컬럼=프로젝트명·담당자·기간·진행률 + 3월~11월 9개 월 컬럼 |

### 스키마

```form-js
{
  "schemaVersion": 19,
  "type": "default",
  "components": [
    {
      "type": "card",
      "id": "card-1",
      "padding": "md",
      "elevation": 1,
      "header": "프로젝트 로드맵 (2026 3월~11월)",
      "headerTag": "h3",
      "components": [
        {
          "type": "text",
          "id": "text-1",
          "text": "**범례** ▓ 진행 · ░ 미진행/완료 · ▒ 지연  ·  *행 클릭 시 해당 프로젝트 상세로 이동*",
          "layout": { "row": "card-1-r1", "columns": 16 }
        },
        {
          "type": "table",
          "id": "table-1",
          "label": "프로젝트 일정",
          "rowCount": 10,
          "columns": [
            { "label": "프로젝트", "key": "name" },
            { "label": "담당자", "key": "owner" },
            { "label": "기간", "key": "period" },
            { "label": "진행", "key": "progress" },
            { "label": "3월", "key": "m03" },
            { "label": "4월", "key": "m04" },
            { "label": "5월", "key": "m05" },
            { "label": "6월", "key": "m06" },
            { "label": "7월", "key": "m07" },
            { "label": "8월", "key": "m08" },
            { "label": "9월", "key": "m09" },
            { "label": "10월", "key": "m10" },
            { "label": "11월", "key": "m11" }
          ],
          "dataSource": "= [{name:\"PRJ-2026-001 결제 시스템\",owner:\"김민수\",period:\"04/01~06/30\",progress:\"68%\",m03:\"\",m04:\"▓▓▓▓\",m05:\"▓▓▓▓\",m06:\"▓▓▓▓\",m07:\"\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-002 모바일 리뉴얼\",owner:\"이지은\",period:\"04/15~07/15\",progress:\"45%\",m03:\"\",m04:\"░░▓▓\",m05:\"▓▓▓▓\",m06:\"▓▓▓▓\",m07:\"▓▓░░\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-003 고객 챗봇\",owner:\"박상우\",period:\"05/15~08/01\",progress:\"0%\",m03:\"\",m04:\"\",m05:\"░░▓▓\",m06:\"▓▓▓▓\",m07:\"▓▓▓▓\",m08:\"▓░░░\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-004 DW 마이그레이션\",owner:\"최유진\",period:\"03/01~05/20\",progress:\"82%\",m03:\"▓▓▓▓\",m04:\"▓▓▓▓\",m05:\"▓▓░░\",m06:\"\",m07:\"\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-005 보안 감사\",owner:\"한가람\",period:\"02/15~04/10\",progress:\"55%\",m03:\"▓▓▓▓\",m04:\"▒▒░░\",m05:\"\",m06:\"\",m07:\"\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-006 브랜드 리프레시\",owner:\"송지원\",period:\"04/01~09/30\",progress:\"30%\",m03:\"\",m04:\"▓▓▓▓\",m05:\"▓▓▓▓\",m06:\"▓▓▓▓\",m07:\"▓▓▓▓\",m08:\"▓▓▓▓\",m09:\"▓▓▓▓\",m10:\"\",m11:\"\"}, {name:\"PRJ-2026-007 온보딩 자동화\",owner:\"윤재호\",period:\"07/01~10/15\",progress:\"0%\",m03:\"\",m04:\"\",m05:\"\",m06:\"\",m07:\"▓▓▓▓\",m08:\"▓▓▓▓\",m09:\"▓▓▓▓\",m10:\"▓▓░░\",m11:\"\"}, {name:\"PRJ-2026-008 ERP 업그레이드\",owner:\"김민수\",period:\"09/01~11/30\",progress:\"22%\",m03:\"\",m04:\"\",m05:\"\",m06:\"\",m07:\"\",m08:\"\",m09:\"▓▓▓▓\",m10:\"▓▓▓▓\",m11:\"▓▓▓▓\"}, {name:\"PRJ-2026-009 만족도 대시보드\",owner:\"이지은\",period:\"04/01~05/31\",progress:\"74%\",m03:\"\",m04:\"▓▓▓▓\",m05:\"▓▓▓▓\",m06:\"\",m07:\"\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}, {name:\"PRJ-2025-098 위키 개편\",owner:\"정현우\",period:\"01/15~04/15\",progress:\"100%\",m03:\"░░░░\",m04:\"░░░░\",m05:\"\",m06:\"\",m07:\"\",m08:\"\",m09:\"\",m10:\"\",m11:\"\"}]",
          "layout": { "row": "card-1-r2", "columns": 16, "height": 520 }
        }
      ]
    }
  ]
}
```

### 읽는 법
- 가로축: 2026년 3월부터 11월까지 9개월
- 세로축: 9개 진행 프로젝트 + 완료된 PRJ-2025-098 1개
- 각 셀의 4-블록 폭(`▓▓▓▓`)은 한 달을 4분면으로 나눈 것 — 시작/마감일이 월 중간이면 시작 측 `░░▓▓` 또는 마감 측 `▓▓░░`로 표현
- PRJ-2026-005는 4월 셀에 `▒▒░░`로 지연 표시 (마감 04/10 경과)
- PRJ-2025-098은 4월 15일 완료 후 셀을 `░░░░`로 비활성 표시


---

## 화면 간 흐름

- **대시보드 → 행 클릭 → 프로젝트 상세**: 목록 테이블 행 선택 시 project-detail 화면으로 이동
- **대시보드 → "+ 새 프로젝트" → 신규 등록**: 헤더 버튼 클릭 시 project-create 화면으로 이동
- **대시보드 → 하단 인라인 카드**: 동일 화면 내 간편 조회·편집 (project-manager card-7)
- **프로젝트 상세 → 태스크 행 → 태스크 보드**: 태스크 목록 행 클릭 시 task-board로 이동
- **프로젝트 상세 → 마일스톤 행 → 마일스톤 화면**: 마일스톤 테이블 행 클릭 시 milestone-timeline으로 이동
- **태스크 보드 → 태스크 카드 클릭 → 태스크 상세**: 동일 화면 하단 card-9에 태스크 상세 편집
- **팀원 관리 → 팀원 행 클릭 → 팀원 정보 카드**: 목록 행 선택 시 동일 화면 하단 card-7에 상세 표시
- **리포트 → 엑셀 내보내기 / PDF 출력**: 필터 설정 후 출력 액션 버튼 트리거

---

## 검증 결과

| 화면 | 파일 | 컴포넌트 수 | 검증 결과 |
|------|------|:-----------:|:---------:|
| 프로젝트 매니저 (대시보드) | `project-manager.form-js` | 33 | Validation passed |
| 프로젝트 상세 | `project-detail.form-js` | 23 | Validation passed |
| 신규 등록 | `project-create.form-js` | 23 | Validation passed |
| 태스크 보드 | `task-board.form-js` | 70 | Validation passed |
| 마일스톤 · 일정 | `milestone-timeline.form-js` | 35 | Validation passed |
| 팀원 관리 | `team-members.form-js` | 30 | Validation passed |
| 프로젝트 리포트 | `project-reports.form-js` | 24 | Validation passed |
| **합계** | | **238** | **전 화면 통과** |


```form-js
```