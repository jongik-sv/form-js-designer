/**
 * workspaceEdit.ts — 들여쓰기 감지 및 JSON 포맷 유틸 + replaceFenceBody 진입점
 *
 * `detectIndent`와 `formatJson`은 부수 효과 없는 순수 함수이며 외부 의존성이 없다.
 * `replaceFenceBody`는 VSCode WorkspaceEdit API를 사용하여 펜스 본문을 교체한다.
 *
 * CRLF 보존 정책: VSCode TextDocument API의 WorkspaceEdit.replace가 파일의 EOL 설정을
 * 유지하므로 formatJson 내부에서 별도 EOL 변환을 수행하지 않는다.
 */

/** TextDocument의 최소 인터페이스 (테스트 stub 및 vscode.TextDocument 모두 호환) */
interface TextDocumentLike {
  lineCount: number;
  lineAt(line: number): { text: string };
}

/** startPos 인터페이스 — vscode.Position mock 호환 ({ line: number }) */
interface LinePosition {
  line: number;
}

/** detectIndent 지역 샘플링 반경 (startPos ± SAMPLE_RADIUS 줄) */
const SAMPLE_RADIUS = 20;

/**
 * 지정 범위의 줄들에서 2-space / 4-space 선행 공백 카운트를 반환한다.
 *
 * 판정 규칙: 선행 공백이 4의 배수이면 4-space, 2의 배수(4 제외)이면 2-space.
 * 4의 배수를 먼저 체크하여 8칸 들여쓰기 같은 경우가 4-space로 올바르게 분류되도록 한다.
 */
function sampleLines(
  doc: TextDocumentLike,
  from: number,
  to: number
): { count2: number; count4: number } {
  let count2 = 0;
  let count4 = 0;
  for (let i = from; i <= to; i++) {
    const line = doc.lineAt(i).text;
    const leadingSpaces = line.length - line.trimStart().length;
    if (leadingSpaces === 0) continue;
    if (leadingSpaces % 4 === 0) {
      count4++;
    } else if (leadingSpaces % 2 === 0) {
      count2++;
    }
  }
  return { count2, count4 };
}

/**
 * TextDocument의 들여쓰기 문자를 샘플링하여 2 또는 4 스페이스 중 우세값을 결정한다.
 *
 * 알고리즘:
 *   - `startPos` 제공 시 `[startPos.line - SAMPLE_RADIUS, startPos.line + SAMPLE_RADIUS]`
 *     범위를 우선 샘플링한다. 판정 불가(카운터 모두 0)이면 전체 문서로 폴백한다.
 *   - `startPos` 미제공 시 전체 문서를 샘플링한다 (기존 동작 유지 — 하위 호환).
 *   - 각 줄의 선행 공백 수를 측정한다.
 *   - 선행 공백이 4의 배수이면 4-space로만 카운트, 2의 배수(4 제외)이면 2-space로 카운트.
 *   - 동점이거나 들여쓰기가 없으면 2를 반환한다 (기본값).
 *
 * @param doc - 샘플링 대상 TextDocument (또는 호환 stub).
 * @param startPos - 펜스 시작 위치 힌트 (optional). `{ line: number }` 인터페이스.
 * @returns `2` 또는 `4`.
 */
export function detectIndent(doc: TextDocumentLike, startPos?: LinePosition): 2 | 4 {
  if (startPos !== undefined) {
    const rangeStart = Math.max(0, startPos.line - SAMPLE_RADIUS);
    const rangeEnd = Math.min(doc.lineCount - 1, startPos.line + SAMPLE_RADIUS);
    const { count2, count4 } = sampleLines(doc, rangeStart, rangeEnd);
    if (count2 > 0 || count4 > 0) {
      return count4 > count2 ? 4 : 2;
    }
    // 지역 범위 판정 불가(들여쓰기 없음) — 전체 문서 폴백
  }

  const { count2, count4 } = sampleLines(doc, 0, doc.lineCount - 1);
  return count4 > count2 ? 4 : 2;
}

/** formatJson 옵션 */
export interface FormatJsonOpts {
  /** true이면 결과 끝에 `\n`을 추가한다. default: false */
  trailingNewline?: boolean;
}

/**
 * JSON 문자열 또는 객체/배열을 지정된 들여쓰기로 직렬화하여 반환한다.
 *
 * - `schema`가 `string`이면 JSON.parse 후 JSON.stringify로 재포맷한다.
 *   파싱 실패 시 원본 문자열을 반환한다 (크래시 없음).
 * - `schema`가 객체/배열이면 JSON.stringify를 직접 적용한다.
 * - `opts.trailingNewline`이 true이면 결과 끝에 `\n`을 추가한다 (default: false).
 *
 * CRLF 처리: 이 함수는 EOL을 변환하지 않는다. CRLF 보존은 VSCode WorkspaceEdit.replace
 * 호출 시 TextDocument API가 파일의 EOL 설정을 유지한다.
 *
 * @param schema - 재포맷할 JSON 문자열 또는 직렬화 가능한 객체/배열.
 * @param indent - 들여쓰기 공백 수 (2 또는 4).
 * @param opts - 옵션 (trailingNewline 등).
 * @returns 포맷된 JSON 문자열.
 */
export function formatJson(schema: unknown, indent: 2 | 4, opts?: FormatJsonOpts): string {
  let result: string;
  if (typeof schema === 'string') {
    try {
      const parsed: unknown = JSON.parse(schema);
      result = JSON.stringify(parsed, null, indent);
    } catch {
      // 유효하지 않은 JSON: 파싱 실패 시 원본 문자열을 그대로 반환 (크래시 없음).
      // console.warn 미사용 — 순수 함수 계약 유지 (부수 효과 없음).
      return schema;
    }
  } else {
    result = JSON.stringify(schema, null, indent);
  }

  if (opts?.trailingNewline) {
    result += '\n';
  }
  return result;
}

/**
 * 펜스 블록 본문을 VSCode WorkspaceEdit으로 교체한다.
 *
 * 들여쓰기를 보존하여 JSON을 재포맷한 뒤 해당 Range에 적용한다.
 * `detectIndent`에 `range.start`를 startPos로 전달하여 펜스 주변 들여쓰기를 우선 감지한다.
 *
 * @param doc - 대상 TextDocument.
 * @param schema - 삽입할 새 스키마 (JSON 문자열 또는 직렬화 가능한 객체).
 * @param range - 교체 대상 Range (locateFenceBody 반환값).
 * @returns 적용된 WorkspaceEdit 인스턴스 (호출자가 `workspace.applyEdit` 필요).
 */
export async function replaceFenceBody(
  doc: import('vscode').TextDocument,
  schema: unknown,
  range: import('vscode').Range
): Promise<import('vscode').WorkspaceEdit> {
  const vscode = await import('vscode');
  const indent = detectIndent(doc, range.start);
  const formatted = formatJson(schema, indent);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, range, formatted);
  return edit;
}
