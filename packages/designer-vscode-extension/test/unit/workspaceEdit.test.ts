import { describe, it, expect, vi } from 'vitest';
import { detectIndent, formatJson, replaceFenceBody } from '../../src/editor/workspaceEdit';

/** 테스트용 TextDocument stub */
function makeDoc(lines: string[]) {
  return {
    lineCount: lines.length,
    lineAt: (lineOrPos: number | { line: number }) => {
      const lineNum = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line;
      return {
        text: lines[lineNum] ?? '',
      };
    },
  };
}

describe('detectIndent', () => {
  it('2-space 들여쓰기 문서에서 2를 반환한다', () => {
    const doc = makeDoc([
      '{',
      '  "a": 1,',
      '  "b": {',
      '    "c": 2',
      '  }',
      '}',
    ]);
    expect(detectIndent(doc as any)).toBe(2);
  });

  it('4-space 들여쓰기 문서에서 4를 반환한다', () => {
    const doc = makeDoc([
      '{',
      '    "a": 1,',
      '    "b": {',
      '        "c": 2',
      '    }',
      '}',
    ]);
    expect(detectIndent(doc as any)).toBe(4);
  });

  it('2/4-space가 혼재할 때 더 많이 등장하는 값을 반환한다', () => {
    const doc = makeDoc([
      '{',
      '  "a": 1,',   // 2-space
      '  "b": 2,',   // 2-space
      '  "c": 3,',   // 2-space
      '    "d": 4',  // 4-space
      '}',
    ]);
    expect(detectIndent(doc as any)).toBe(2);
  });

  it('4-space가 더 많을 때 4를 반환한다', () => {
    const doc = makeDoc([
      '{',
      '    "a": 1,',  // 4-space
      '    "b": 2,',  // 4-space
      '    "c": 3,',  // 4-space
      '  "d": 4',     // 2-space
      '}',
    ]);
    expect(detectIndent(doc as any)).toBe(4);
  });

  it('동점이면 2를 반환한다 (기본값)', () => {
    const doc = makeDoc([
      '  "a": 1,',  // 2-space (1개)
      '    "b": 2', // 4-space (1개)
    ]);
    expect(detectIndent(doc as any)).toBe(2);
  });

  it('들여쓰기가 없는 문서에서 기본값 2를 반환한다', () => {
    const doc = makeDoc([
      '{"a":1}',
      '{"b":2}',
    ]);
    expect(detectIndent(doc as any)).toBe(2);
  });
});

describe('formatJson', () => {
  it('indent=2로 호출되면 2-space 포맷 JSON 문자열을 반환한다', () => {
    const result = formatJson('{"b":2,"a":1}', 2);
    expect(result).toBe('{\n  "b": 2,\n  "a": 1\n}');
  });

  it('indent=4로 호출되면 4-space 포맷 JSON 문자열을 반환한다', () => {
    const result = formatJson('{"a":1}', 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it('유효하지 않은 JSON을 넣으면 원본 문자열을 반환한다 (크래시 없음)', () => {
    const invalid = 'not valid { json }';
    const result = formatJson(invalid, 2);
    expect(result).toBe(invalid);
  });

  it('빈 객체를 포맷한다', () => {
    const result = formatJson('{}', 2);
    expect(result).toBe('{}');
  });

  it('배열을 포맷한다', () => {
    const result = formatJson('[1,2,3]', 2);
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('detectIndent + formatJson 조합이 올바르게 연동된다', () => {
    const doc = makeDoc([
      '{',
      '  "type": "default",',
      '  "components": []',
      '}',
    ]);
    const indent = detectIndent(doc as any);
    const raw = '{"type":"default","components":[]}';
    const formatted = formatJson(raw, indent);
    expect(formatted).toContain('\n  ');
    expect(formatted).not.toContain('\n    ');
  });
});
