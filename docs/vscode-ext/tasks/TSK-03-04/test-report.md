# TSK-03-04: 테스트 결과

## 결과: PASS

모든 E2E 스모크 스펙 및 기존 viewer 스펙 총 7개가 통과하였습니다.

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A | N/A | N/A |
| E2E 테스트 | 7 | 0 | 7 |

## E2E 테스트 상세

### Playwright E2E (designer-notion-adapter)

**실행 명령:**
```bash
npm -w @form-js-designer/designer-notion-adapter run test:e2e:smoke
```

**스펙 상세:**

#### 1. TSK-03-04 Smoke E2E — viewer-mount
- ✅ **통과**: 샘플 페이지 접속 → "블록 삽입" 버튼 클릭 → .fjs-container 렌더 확인
- 스크린샷: `docs/vscode-ext/features/notion-adapter/brw-viewer-mount.png`
- 검증: 초기 자동 마운트 후 버튼 클릭으로 두 번째 form-js viewer 렌더 확인

#### 2. TSK-03-04 Smoke E2E — edit-save-rerender
- ✅ **통과**: viewer 렌더 후 "스키마 편집" → SchemaEditor 입력 → "저장" → 폼 재렌더 확인
- 스크린샷: `docs/vscode-ext/features/notion-adapter/brw-edit-save.png`
- 검증: 새로운 스키마("Smoke 테스트 필드") 적용 후 폼 필드 리렌더 확인

#### 3-7. form-js Notion Adapter — 기존 스펙 (TSK-03-03 유산)
- ✅ **5개 스펙 모두 통과**:
  - (클릭 경로) "블록 삽입" 버튼 클릭 후 .form-js-block 요소 추가
  - (화면 렌더링) .form-js-viewer-container 요소 표시 확인
  - (테마 라이트) theme-light 클래스 적용 확인
  - (테마 다크) theme-dark 클래스 적용 확인
  - (에러 없음) .form-js-error-banner 미발생 확인

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| typecheck | pass | `npm -w @form-js-designer/designer-notion-adapter run typecheck` — 0 errors |
| lint | N/A | dev-config에 lint 명령 미정의 |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (정상) `smoke.spec.ts 'viewer-mount'` — 샘플 페이지 접속 → "블록 삽입" 버튼 클릭 → `.fjs-container`가 DOM에 visible 상태로 렌더됨 → `brw-viewer-mount.png` 파일 생성 | pass |
| 2 | (정상) `smoke.spec.ts 'edit-save-rerender'` — viewer 렌더 후 "스키마 편집" 클릭 → textarea에 새 스키마 JSON 입력 → "저장" 클릭 → 새 스키마 기반 폼 필드가 DOM에 나타남 → `brw-edit-save.png` 파일 생성 | pass |
| 3 | (엣지) BASE_URL 환경변수 미설정 시 file:// fallback이 동작하여 로컬에서 spec이 실행됨 | pass |
| 4 | (엣지) viewer 마운트가 비동기로 지연될 때 `waitForSelector` 10초 timeout 안에 성공함 | pass |
| 5 | (에러) 잘못된 스키마 JSON을 SchemaEditor에 입력하고 저장 시도 시 에러 메시지가 표시되고 viewer는 이전 상태를 유지함| unverified |
| 6 | (통합) `npm run test:e2e:smoke` 명령으로 두 spec 모두 통과하고 exit code 0으로 종료됨 | pass |
| 7 | (통합) CI 환경에서 `NOTION_VIEWER_BASE_URL` secret 주입 후 동일 spec이 사내 뷰어 URL에서 통과함 (로컬 검증은 file:// fallback으로 대체) | unverified |

## 재시도 이력

### 1회차: 초기 실행 (실패 → 수정)
- **원인**: `sample/main.ts`를 TypeScript로 직접 로드하는 중 번들링 부재로 실패
  - 브라우저가 `.ts` 파일을 직접 해석할 수 없음
  - form-js viewer 초기화 단계에서 "form field of type not supported" 오류 발생

- **수정 사항**:
  1. `esbuild.config.mjs`에 샘플 페이지 빌드 스텝 추가
     - `sample/main.ts` → `sample/main.js` 컴파일
  2. `sample/index.html` 스크립트 경로 변경: `./main.ts` → `./main.js`
  3. `sample/main.ts`에 error handling 추가 (개발 편의성 개선)

### 2회차: 스키마 형식 오류 (실패 → 수정)
- **원인**: 초기 DEFAULT_SCHEMA에 `type: 'default'` 필드 부재
  - form-js 라이브러리가 스키마의 최상위 `type` 필드를 기대함
  - `button` 타입 포함으로 인한 복잡성 최소화 필요

- **수정 사항**:
  1. DEFAULT_SCHEMA에 `type: 'default'` 추가
  2. `button` 컴포넌트 제거 (불필요, 스모크 테스트 범위 외)
  3. smoke.spec.ts의 NEW_SCHEMA에도 `type: 'default'` 추가
  4. 재빌드 후 전체 테스트 재실행

### 최종 결과
- 2회차 수정 후 모든 7개 E2E 스펙 통과 (첫 빌드 이후 반복 실패 없음)
- Playwright 보고서: 모든 스펙 pass (11.1s 실행 시간)

## 비고

1. **스크린샷 아티팩트**: 생성된 파일
   - `docs/vscode-ext/features/notion-adapter/brw-viewer-mount.png` (21K)
   - `docs/vscode-ext/features/notion-adapter/brw-edit-save.png` (19K)

2. **중요한 발견사항**:
   - form-js 스키마는 최상위 `type: 'default'` 필드가 필수
   - 샘플 페이지는 esbuild로 번들링되어야 file:// 프로토콜 환경에서 동작
   - 브라우저 직접 로드 시 TypeScript 파일은 자동 해석되지 않음

3. **브라우저 테스트 완료**:
   - Playwright chromium으로 실제 렌더링 검증
   - file:// 프로토콜로 로컬 파일 기반 테스트 성공
   - CI 환경에서 NOTION_VIEWER_BASE_URL 주입 준비 완료
