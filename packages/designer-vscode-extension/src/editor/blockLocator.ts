/**
 * blockLocator.ts — TextDocument에서 form-js 펜스 블록 Range 재탐지
 *
 * 펜스 형식:
 * ```form-js
 * { ...JSON 스키마 본문... }
 * ```
 *
 * `locateFenceBody`는 부수 효과 없는 순수 함수이며,
 * 힌트(`mdStart`/`mdEnd`)를 먼저 확인하고, 힌트가 틀리면 전체 문서를 선형 탐색한다.
 *
 * VSCode API 의존성: Position/Range 생성은 `vscode` 모듈에서 주입받아 사용한다.
 * 단위 테스트에서는 vitest의 vi.mock('vscode')으로 대체된다.
 */

import { Position, Range } from 'vscode';

const FENCE_OPEN = '```form-js';
const FENCE_CLOSE = '```';

/** TextDocument의 최소 인터페이스 (테스트 stub 호환) */
interface TextDocumentLike {
  lineCount: number;
  lineAt(line: number): { text: string };
}

/**
 * form-js 펜스 블록을 문서에서 찾을 수 없을 때 throw되는 에러.
 */
export class FenceNotFoundError extends Error {
  constructor(message = 'form-js fence block not found in document') {
    super(message);
    this.name = 'FenceNotFoundError';
  }
}

/**
 * 줄 텍스트가 form-js 펜스 여는 라인인지 확인한다.
 */
function isFenceOpen(text: string): boolean {
  return text.trimEnd() === FENCE_OPEN;
}

/**
 * 줄 텍스트가 펜스 닫는 라인인지 확인한다.
 */
function isFenceClose(text: string): boolean {
  return text.trimEnd() === FENCE_CLOSE;
}

/**
 * 주어진 `openLine`(여는 라인 인덱스)부터 닫는 라인을 탐색하여
 * 본문 Range(여는 줄 다음 ~ 닫는 줄 직전)를 반환한다.
 *
 * 닫는 줄을 찾지 못하면 `null`을 반환한다.
 */
function buildRangeFromOpen(doc: TextDocumentLike, openLine: number): Range | null {
  for (let i = openLine + 1; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    if (isFenceClose(text)) {
      const bodyStart = openLine + 1;
      const bodyEnd = i - 1;
      if (bodyStart > bodyEnd) {
        // 빈 펜스 — empty range (start == end at bodyStart)
        const pos = new Position(bodyStart, 0);
        return new Range(pos, pos);
      }
      const endLineText = doc.lineAt(bodyEnd).text;
      return new Range(
        new Position(bodyStart, 0),
        new Position(bodyEnd, endLineText.length)
      );
    }
  }
  return null;
}

/**
 * 전체 문서를 선형 탐색하여 첫 번째 `form-js` 펜스를 찾고 본문 Range를 반환한다.
 * 없으면 `null`을 반환한다.
 */
function scanFullDocument(doc: TextDocumentLike): Range | null {
  for (let i = 0; i < doc.lineCount; i++) {
    if (isFenceOpen(doc.lineAt(i).text)) {
      const range = buildRangeFromOpen(doc, i);
      if (range !== null) {
        return range;
      }
    }
  }
  return null;
}

/**
 * TextDocument에서 form-js 펜스 블록의 본문 `Range`를 반환한다.
 *
 * 탐색 순서:
 *   1. `mdStart` 힌트 위치를 먼저 확인한다.
 *   2. 힌트 위치에 form-js 펜스가 없으면 전체 문서를 선형 탐색(폴백)한다.
 *      (`mdEnd`는 힌트 검증 후 폴백으로 전환 시 더 이상 사용하지 않는다.)
 *   3. 어디서도 찾지 못하면 `FenceNotFoundError`를 throw한다.
 *
 * @param doc - 탐색 대상 TextDocument (또는 호환 stub).
 * @param mdStart - 펜스 여는 줄 번호 힌트 (0-based).
 * @param _mdEnd - 펜스 닫는 줄 번호 힌트 (0-based). 현재는 폴백 전환 시 미사용 (향후 확장 여지).
 * @returns 펜스 본문의 `Range` (여는 ``` 다음 줄 ~ 닫는 ``` 직전 줄).
 * @throws {FenceNotFoundError} form-js 펜스 블록을 찾을 수 없는 경우.
 */
export function locateFenceBody(doc: TextDocumentLike, mdStart: number, _mdEnd: number): Range {
  // 1. 힌트 위치 확인
  if (mdStart >= 0 && mdStart < doc.lineCount) {
    const hintLine = doc.lineAt(mdStart).text;
    if (isFenceOpen(hintLine)) {
      const range = buildRangeFromOpen(doc, mdStart);
      if (range !== null) {
        return range;
      }
    }
  }

  // 2. 힌트 위치에 펜스가 없으면 전체 문서 선형 탐색 (폴백)
  const fallback = scanFullDocument(doc);
  if (fallback !== null) {
    return fallback;
  }

  // 3. 못 찾으면 에러 throw
  throw new FenceNotFoundError();
}
