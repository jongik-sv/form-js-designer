# schemas/drafts — AI 산출 JSON 컨벤션

이 디렉토리는 `/design-page`, `/design-add`, `/design-modify` 명령으로 AI가 생성하는 form-js 스키마 JSON의 착지 디렉토리다.

## 파일명 규칙

- 형식: `<kebab-case-page-name>.form-js`
- 예시: `login-page.form-js`, `dashboard.form-js`, `user-profile.form-js`

## 필수 구조

```json
{
  "schemaVersion": 19,
  "type": "default",
  "components": [...]
}
```

- `schemaVersion`: 반드시 **19** (변경 금지)
- `type`: 반드시 **"default"**
- 컴포넌트 `id` 패턴: `<type>-<6자리-timestamp>` (예: `card-1716700001`)

## 검증 의무

이 디렉토리의 모든 `.form-js` 파일은 저장 전 검증을 통과해야 한다:

```bash
/design-validate schemas/drafts/<파일명>.form-js
```

또는:

```bash
npm --prefix packages/designer-cli run test:skill
```

## 직접 편집 금지

이 디렉토리의 JSON 파일은 직접 편집하지 않는다. 반드시 AI command를 통해 수정한다:

- 컴포넌트 추가: `/design-add`
- 컴포넌트 수정: `/design-modify`
- 검증: `/design-validate`

## 프로젝트 이관 절차

초안 스키마를 실제 프로젝트에 적용하려면:

```bash
# (TSK-08-01 완료 후) designer-cli import 명령 사용
node packages/designer-cli/src/cli.js import schemas/drafts/<파일>.form-js --to <project-path>
```

import 명령은 중복 컴포넌트 id 방지 및 경로 정규화를 처리한다.
