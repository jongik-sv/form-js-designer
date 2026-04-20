import { describe, it, expect } from 'vitest';
import { locateFenceBody, FenceNotFoundError } from '../../src/editor/blockLocator';

/** vscode mock: Position/Range는 test/setup/vscode-mock.ts에서 자동 주입됨 */
import type { Range } from 'vscode';

/**
 * 테스트용 TextDocument 팩토리.
 * VSCode의 TextDocument를 최소화한 stub.
 */
function makeDoc(lines: string[]) {
  return {
    lineCount: lines.length,
    lineAt: (lineOrPos: number | { line: number }) => {
      const lineNum = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line;
      return {
        text: lines[lineNum] ?? '',
        range: { start: { line: lineNum, character: 0 }, end: { line: lineNum, character: (lines[lineNum] ?? '').length } },
      };
    },
  };
}

describe('locateFenceBody', () => {
  it('힌트가 정확할 때 올바른 fence 본문 Range를 반환한다', () => {
    const doc = makeDoc([
      'some text',         // 0
      '```form-js',        // 1  ← fence 시작
      '{"type":"default"}',// 2  ← 본문 시작
      '```',               // 3  ← fence 끝
      'other text',        // 4
    ]);

    const range: Range = locateFenceBody(doc as any, 1, 3);
    expect(range.start.line).toBe(2);   // ``` 다음 줄
    expect(range.end.line).toBe(2);     // ``` 바로 전 줄
  });

  it('펜스 블록이 라인 이동 후에도 전체 문서 폴백으로 새 Range를 반환한다', () => {
    // 편집으로 앞에 줄이 추가되어 fence가 3→5번으로 이동된 경우
    const doc = makeDoc([
      'inserted line 1',   // 0
      'inserted line 2',   // 1
      'some text',         // 2
      '```form-js',        // 3  ← 실제 fence (힌트는 틀린 줄 번호를 가리킴)
      '{"type":"default"}',// 4
      '```',               // 5
    ]);

    // 힌트는 잘못된 위치(line 0, 2)를 가리킴
    const range: Range = locateFenceBody(doc as any, 0, 2);
    expect(range.start.line).toBe(4);
    expect(range.end.line).toBe(4);
  });

  it('같은 문서에 여러 fence 블록이 있을 때 힌트에 가장 가까운 블록을 반환한다', () => {
    const doc = makeDoc([
      '```form-js',         // 0  ← 첫 번째 fence
      '{"a":1}',            // 1
      '```',                // 2
      'middle text',        // 3
      '```form-js',         // 4  ← 두 번째 fence
      '{"b":2}',            // 5
      '```',                // 6
    ]);

    // 힌트가 두 번째 fence를 가리키는 경우
    const range: Range = locateFenceBody(doc as any, 4, 6);
    expect(range.start.line).toBe(5);
    expect(range.end.line).toBe(5);
  });

  it('fence 블록이 존재하지 않으면 FenceNotFoundError를 throw한다', () => {
    const doc = makeDoc([
      'just some text',
      'no fences here',
      '```typescript',     // form-js fence가 아닌 다른 언어
      'const x = 1;',
      '```',
    ]);

    expect(() => locateFenceBody(doc as any, 0, 4)).toThrow(FenceNotFoundError);
  });

  it('빈 fence 본문(바로 닫힘)의 경우 isEmpty인 Range를 반환한다', () => {
    const doc = makeDoc([
      '```form-js',  // 0
      '```',         // 1  ← 바로 닫힘 (본문 없음)
    ]);

    const range: Range = locateFenceBody(doc as any, 0, 1);
    // start == end (empty range) or start.line > end.line
    expect(range.isEmpty || range.start.line > range.end.line).toBe(true);
  });

  it('힌트 위치에 fence가 없으면 전체 문서를 스캔하여 첫 번째 form-js fence를 반환한다', () => {
    const doc = makeDoc([
      'text at top',       // 0  ← 힌트가 여기를 가리키지만 fence 없음
      '```form-js',        // 1
      '{"found":true}',    // 2
      '```',               // 3
    ]);

    // 힌트는 0번 줄인데 거기엔 fence가 없음
    const range: Range = locateFenceBody(doc as any, 0, 0);
    expect(range.start.line).toBe(2);
  });
});
