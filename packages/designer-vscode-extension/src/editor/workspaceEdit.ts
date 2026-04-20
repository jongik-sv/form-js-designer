/**
 * workspaceEdit.ts — 들여쓰기 감지 및 JSON 포맷 유틸 + replaceFenceBody 진입점
 *
 * `detectIndent`와 `formatJson`은 순수 함수이며 외부 의존성이 없다.
 * `replaceFenceBody`는 VSCode WorkspaceEdit API를 사용하여 펜스 본문을 교체한다.
 */

/** TextDocument의 최소 인터페이스 (테스트 stub 및 vscode.TextDocument 모두 호환) */
interface TextDocumentLike {
  lineCount: number;
  lineAt(line: number): { text: string };
}

/**
 * TextDocument 전체의 들여쓰기 문자를 샘플링하여 2 또는 4 스페이스 중 우세값을 결정한다.
 *
 * 알고리즘:
 *   - 각 줄의 선행 공백 수를 측정한다.
 *   - 선행 공백이 2의 배수이면 2-space 카운터 증가, 4의 배수이면 4-space 카운터 증가.
 *   - 4의 배수는 동시에 2의 배수이므로, 4-space 여부를 먼저 판단한다.
 *   - 즉, 공백 수가 4의 배수이면 4-space로만 카운트하고 2-space로 중복 계산하지 않는다.
 *   - 동점이거나 들여쓰기가 없으면 2를 반환한다 (기본값).
 *
 * @param doc - 샘플링 대상 TextDocument (또는 호환 stub).
 * @returns `2` 또는 `4`.
 */
export function detectIndent(doc: TextDocumentLike): 2 | 4 {
  let count2 = 0;
  let count4 = 0;

  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i).text;
    const leadingSpaces = line.length - line.trimStart().length;

    if (leadingSpaces === 0) continue;

    if (leadingSpaces % 4 === 0) {
      count4++;
    } else if (leadingSpaces % 2 === 0) {
      count2++;
    }
  }

  return count4 > count2 ? 4 : 2;
}

/**
 * JSON 문자열을 지정된 들여쓰기로 재포맷하여 반환한다.
 *
 * 유효하지 않은 JSON이 입력되면 크래시 없이 원본 문자열을 반환한다.
 *
 * @param json - 재포맷할 JSON 문자열.
 * @param indent - 들여쓰기 공백 수 (2 또는 4).
 * @returns 포맷된 JSON 문자열. 파싱 실패 시 원본 문자열.
 */
export function formatJson(json: string, indent: 2 | 4): string {
  try {
    const parsed: unknown = JSON.parse(json);
    return JSON.stringify(parsed, null, indent);
  } catch {
    console.warn('[workspaceEdit] formatJson: 유효하지 않은 JSON, 원본 반환', json.slice(0, 80));
    return json;
  }
}

/**
 * 펜스 블록 본문을 VSCode WorkspaceEdit으로 교체한다.
 *
 * 들여쓰기를 보존하여 JSON을 재포맷한 뒤 해당 Range에 적용한다.
 *
 * @param doc - 대상 TextDocument.
 * @param schema - 삽입할 새 스키마 JSON 문자열.
 * @param range - 교체 대상 Range (locateFenceBody 반환값).
 * @returns 적용된 WorkspaceEdit 인스턴스 (호출자가 `workspace.applyEdit` 필요).
 */
export async function replaceFenceBody(
  doc: import('vscode').TextDocument,
  schema: string,
  range: import('vscode').Range
): Promise<import('vscode').WorkspaceEdit> {
  const vscode = await import('vscode');
  const indent = detectIndent(doc);
  const formatted = formatJson(schema, indent);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, range, formatted);
  return edit;
}
