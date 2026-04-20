# TSK-00-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `.github/workflows/ci-vscode-ext.yml` | `npm --prefix packages/designer-vscode-extension run <cmd>` → `npm -w designer-vscode-extension run <cmd>` (workspace 패턴으로 통일) | Rename (convention alignment) |

## 테스트 확인
- 결과: PASS (N/A)
- 실행 명령: N/A — infra domain, unit_test=null
- 근거: `domains.infra.unit_test`가 null이므로 단위 테스트 명령 없음. YAML syntax 검증(`python3 -c "import yaml; yaml.safe_load(...)"`)으로 구문 정합성 확인 완료.

## 비고
- 케이스 분류: A (성공 — 변경 적용 후 N/A 판정으로 통과)
- `npm --prefix <dir>` 패턴은 디렉토리를 직접 지정하여 workspace 인식 없이 실행됨. `npm -w <workspace-name>` 패턴은 npm workspaces 기능을 활용하여 monorepo 표준에 부합하고, dev-config의 `quality_commands`/`unit_test` 명령과 표기 방식이 일치함.
- `package.json`의 `lint` script(`echo 'lint: not yet configured'`)는 동작 변경에 해당하므로 리팩토링 범위에서 제외.
