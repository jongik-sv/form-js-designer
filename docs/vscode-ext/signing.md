# VSCode Extension 서명 가이드

## 현재 상태: 미서명(Unsigned) 배포

현재 `.vsix` 패키지는 코드 서명 없이 배포됩니다.

### 미서명 배포 사유

- **배포 채널**: VS Code Marketplace가 아닌 사내 공유 저장소 직접 배포이므로, Marketplace 서명 요구사항이 적용되지 않습니다.
- **설치 방법**: 사내 사용자는 `code --install-extension designer-vscode-extension-x.y.z.vsix` 또는 VSCode UI의 "Install from VSIX..." 메뉴로 설치합니다. 이 경로는 서명을 요구하지 않습니다.
- **신뢰 경계**: 사내 저장소 접근 자격(`INTERNAL_REGISTRY_TOKEN`)이 배포 무결성을 보장합니다.

## 향후 서명 절차 (Marketplace 등록 시)

VS Code Marketplace 게시 또는 엔터프라이즈 정책상 서명이 요구될 경우 아래 절차를 따릅니다.

### 1. Azure DevOps PAT 발급

```
https://dev.azure.com/{organization}/_usersSettings/tokens
```

- Scopes: `Marketplace (Publish)` 선택
- 발급된 PAT를 GitHub Secrets에 `VSCE_PAT`로 등록

### 2. Publisher 등록

```bash
npx @vscode/vsce create-publisher <publisher-id>
```

### 3. CI 릴리즈 잡 수정

`ci-vscode-ext.yml`의 Package 단계를 다음으로 교체:

```yaml
- name: Publish to Marketplace
  env:
    VSCE_PAT: ${{ secrets.VSCE_PAT }}
  run: |
    npm -w @form-js-designer/designer-vscode-extension run build:prod
    npx @vscode/vsce publish --pat "$VSCE_PAT"
```

### 4. package.json publisher 필드 확인

```json
{
  "publisher": "form-js-designer"
}
```

`publisher` 필드가 Azure DevOps에 등록된 publisher ID와 일치해야 합니다.

## 참고

- [vsce 공식 문서](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code Extension Signing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#verify-a-published-extension)
