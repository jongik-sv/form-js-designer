# TSK-10-01 회귀 티켓 체크리스트

## 목적

RC1 태깅 전 회귀 티켓 0건 확인 (TSK-10-02의 선행 게이트)

## 체크리스트

모든 항목이 체크되어야 RC1 태깅 진행 가능.

- [ ] TSK-06-01 (드래그·드롭) 회귀 없음 — `editor.dragdrop.spec.ts` 6/6 PASS
- [ ] TSK-05-02 (Table FPS) 회귀 없음 — `table.virtualization.spec.ts` FPS ≥ 55
- [ ] TSK-07-02 (i18n check) 회귀 없음 — missing = 0
- [ ] TSK-09-03 (워터마크 4중 가드) 회귀 없음 — CI lint 3종 PASS
- [ ] ADR-0001 §3 D4 (no-css-modules) 회귀 없음
- [ ] axe-core critical+serious = 0 — `editor.a11y.spec.ts` 6/6 PASS
- [ ] AC 매트릭스 전수 통과 (≥120 케이스, failed=0)

## 신규 회귀 티켓

_없음 (최종 확인 후 서명 필요)_

| 날짜 | 티켓 ID | 설명 | 담당자 | 상태 |
|------|---------|------|--------|------|
| (없음) | - | - | - | - |

## RC1 승인

- [ ] 위 체크리스트 전원 체크
- [ ] 회귀 티켓 0건 확인
- [ ] RC1 태깅 승인 (리뷰어 서명 필요)

> 최종 업데이트: (TSK-10-02 dev-test 단계에서 갱신)
