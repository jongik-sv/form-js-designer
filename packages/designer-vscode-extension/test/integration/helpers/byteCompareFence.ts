/**
 * byteCompareFence.ts — TSK-02-05
 *
 * fixture 파일 저장 전·후 전체 바이트를 비교하여
 * 펜스 범위 밖 바이트의 diff 수를 반환하는 순수 함수.
 *
 * 수용 기준: 저장 결과 diff에서 펜스 외 변경 0바이트.
 *
 * 설계 결정 (design.md §3):
 * - Node Buffer 단위 비교: 텍스트 diff보다 바이트 단위 비교가 명세("바이트 동일")를 더 정확히 충족.
 * - 펜스 범위 라인 경계: Buffer를 LF('\n') 단위로 분할하여 라인 인덱스를 계산한다.
 *   CRLF 파일은 각 라인 끝에 '\r'이 포함된 채로 비교되므로 CRLF 보존도 자연스럽게 검증된다.
 */

/**
 * 펜스 범위 파라미터.
 * startLine, endLine은 0-based 라인 인덱스이며,
 * ```form-js 여는 줄(startLine)과 ``` 닫는 줄(endLine)을 포함하는 범위다.
 */
export interface FenceRange {
  /** 펜스 여는 라인 인덱스 (0-based, ```form-js 줄) */
  startLine: number;
  /** 펜스 닫는 라인 인덱스 (0-based, ``` 닫는 줄) */
  endLine: number;
}

/**
 * Buffer를 LF('\n') 기준으로 라인별 바이트 배열로 분할한다.
 * 각 요소는 해당 라인의 바이트(LF 미포함)이며, LF 자체는 별도 1바이트로 처리한다.
 *
 * CRLF 파일: 각 라인 끝의 '\r'은 라인 바이트에 포함된다.
 */
function splitLines(buf: Buffer): Buffer[] {
  const lines: Buffer[] = [];
  let start = 0;

  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 0x0a /* LF */) {
      lines.push(Buffer.from(buf.subarray(start, i)));
      start = i + 1; // LF 다음부터 다음 라인
    }
  }

  return lines;
}

/**
 * 두 라인 배열에서 펜스 범위 밖 라인들만 추출하여 하나의 Buffer로 합친다.
 *
 * 펜스 범위 포함 정의: startLine <= lineIdx <= endLine
 * 즉 여는 ``` 줄과 닫는 ``` 줄 모두 포함하여 비교 제외.
 */
function extractOutsideFence(lines: Buffer[], fence: FenceRange): Buffer {
  const outside: Buffer[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i < fence.startLine || i > fence.endLine) {
      // lines[i] is always defined because i < lines.length
      outside.push(lines[i] as Buffer);
      // 마지막 요소가 아닌 경우 LF 구분자 추가
      if (i < lines.length - 1) {
        outside.push(Buffer.from([0x0a]));
      }
    }
  }

  return Buffer.concat(outside);
}

/**
 * 저장 전·후 Buffer의 펜스 범위 밖 바이트를 비교하여 diff 바이트 수를 반환한다.
 *
 * @param before 저장 전 파일 전체 바이트
 * @param after 저장 후 파일 전체 바이트
 * @param fenceRange 비교 제외할 펜스 범위 (startLine ~ endLine, 0-based, 양 끝 포함)
 * @returns 펜스 밖 바이트의 차이 수.
 *          0이면 펜스 외 영역이 바이트 동일 (수용 기준 통과).
 *          양수이면 바이트 길이 차이 또는 내용 차이가 있음.
 */
export function byteCompareFence(
  before: Buffer,
  after: Buffer,
  fenceRange: FenceRange
): number {
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);

  const beforeOutside = extractOutsideFence(beforeLines, fenceRange);
  const afterOutside = extractOutsideFence(afterLines, fenceRange);

  // 길이가 다르면 즉시 차이 반환
  if (beforeOutside.length !== afterOutside.length) {
    return Math.abs(beforeOutside.length - afterOutside.length);
  }

  // 동일 길이라면 바이트 단위 비교로 다른 바이트 수 계산
  let diffCount = 0;
  for (let i = 0; i < beforeOutside.length; i++) {
    if (beforeOutside[i] !== afterOutside[i]) {
      diffCount++;
    }
  }

  return diffCount;
}
