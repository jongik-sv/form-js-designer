/**
 * TSK-03-02: 어댑터 설계 + 계약 정의 — 문서 산출물 검증
 *
 * QA 체크리스트 기반:
 * - adapter-design.md: viewer/편집/번들/CSS 섹션 4개 각 ≥100자
 * - contract.md: FormJsBlockHost / FormJsHandle / MountOpts 인터페이스 코드 블록 포함
 * - platform-matrix.md: 7개 플랫폼 행 + 5개 컬럼 채워짐
 * - MountOpts.cssIsolation 기본값 shadow 명시
 * - requestEdit viewer-only 동작 명시
 * - cross-link 일관성 (핵심 파일 참조)
 * - design.md 동작 호환 매핑 (preview.ts testBridge 발신 위치)
 *
 * 실행: vitest (vitest.config.ts include: test/unit/**\/*.{test,spec}.{ts,tsx})
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../../../');
const DOCS_NOTION = resolve(PROJECT_ROOT, 'docs/vscode-ext/features/notion-adapter');

function readDoc(filename: string): string {
  const filePath = resolve(DOCS_NOTION, filename);
  if (!existsSync(filePath)) {
    throw new Error(`산출물 누락: ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

/** 키워드 정규식에 매칭되는 줄을 이어붙인 문자열 길이를 반환 */
function matchedLength(content: string, pattern: RegExp): number {
  return content.split('\n').filter(line => pattern.test(line)).join('\n').length;
}

// ────────────────────────────────────────────────────────
// adapter-design.md 검증
// ────────────────────────────────────────────────────────
describe('adapter-design.md', () => {
  let content: string;

  beforeAll(() => {
    content = readDoc('adapter-design.md');
  });

  it('파일이 존재한다', () => {
    expect(existsSync(resolve(DOCS_NOTION, 'adapter-design.md'))).toBe(true);
  });

  it('viewer 흐름 관련 내용이 100자 이상이다', () => {
    expect(matchedLength(content, /[Vv]iewer|뷰어/)).toBeGreaterThanOrEqual(100);
  });

  it('편집 흐름 관련 내용이 100자 이상이다', () => {
    expect(matchedLength(content, /[Ee]dit|편집|에디터/i)).toBeGreaterThanOrEqual(100);
  });

  it('번들 전략 관련 내용이 100자 이상이다', () => {
    expect(matchedLength(content, /[Bb]undle|번들|esbuild|ESM|UMD/i)).toBeGreaterThanOrEqual(100);
  });

  it('CSS 격리 관련 내용이 100자 이상이다', () => {
    expect(matchedLength(content, /CSS|[Ss]hadow|[Ss]coped|격리/i)).toBeGreaterThanOrEqual(100);
  });

  it('testBridge 메시지(test-mount-complete) 발신 책임 위치가 기록되어 있다', () => {
    expect(content).toMatch(/testBridge|test-mount-complete/);
  });

  it('preview.ts 또는 customEditor.ts와의 호환 매핑이 포함된다', () => {
    expect(content).toMatch(/preview\.ts|customEditor\.ts/);
  });

  it('/form-js 슬래시 명령 클릭 시나리오가 기록되어 있다', () => {
    expect(content).toMatch(/\/form-js|슬래시|slash/i);
  });

  it('.form-js-block DOM 렌더 시나리오가 기록되어 있다', () => {
    expect(content).toMatch(/\.form-js-block|form-js-block/);
  });
});

// ────────────────────────────────────────────────────────
// contract.md 검증
// ────────────────────────────────────────────────────────
describe('contract.md', () => {
  let content: string;

  beforeAll(() => {
    content = readDoc('contract.md');
  });

  it('파일이 존재한다', () => {
    expect(existsSync(resolve(DOCS_NOTION, 'contract.md'))).toBe(true);
  });

  it('FormJsBlockHost 인터페이스 TypeScript 코드 블록이 포함된다', () => {
    expect(content).toMatch(/FormJsBlockHost/);
    expect(content).toMatch(/```ts[\s\S]*?FormJsBlockHost[\s\S]*?```/);
  });

  it('FormJsHandle 인터페이스 TypeScript 코드 블록이 포함된다', () => {
    expect(content).toMatch(/FormJsHandle/);
    expect(content).toMatch(/```ts[\s\S]*?FormJsHandle[\s\S]*?```/);
  });

  it('MountOpts 인터페이스 TypeScript 코드 블록이 포함된다', () => {
    expect(content).toMatch(/MountOpts/);
    expect(content).toMatch(/```ts[\s\S]*?MountOpts[\s\S]*?```/);
  });

  it('MountOpts.cssIsolation 기본값이 shadow임을 명시한다', () => {
    expect(content).toMatch(/cssIsolation/);
    expect(content).toMatch(/shadow/);
    expect(content).toMatch(/shadow.*기본|기본.*shadow|default.*shadow|shadow.*default/is);
  });

  it('scoped fallback 발동 조건이 1줄 이상 기술된다', () => {
    expect(content).toMatch(/scoped/);
    expect(content).toMatch(/fallback|조건|충돌/i);
  });

  it('requestEdit viewer-only 동작이 명시된다 (no-op + warn 또는 throw)', () => {
    expect(content).toMatch(/requestEdit/);
    expect(content).toMatch(/no-op|warn|throw|viewer.only|viewer-only/i);
  });

  it('mount 함수 시그니처가 명시된다', () => {
    expect(content).toMatch(/mount\s*\(/);
  });

  it('applySchemaUpdate 함수 시그니처가 명시된다', () => {
    expect(content).toMatch(/applySchemaUpdate/);
  });

  it('dispose 함수 시그니처가 명시된다', () => {
    expect(content).toMatch(/dispose\s*\(/);
  });

  it('FormJsBlockHost 인터페이스 파일 경로가 참조된다', () => {
    expect(content).toMatch(/FormJsBlockHost\.ts|adapters\/shared/);
  });
});

// ────────────────────────────────────────────────────────
// platform-matrix.md 검증
// ────────────────────────────────────────────────────────
describe('platform-matrix.md', () => {
  let content: string;

  beforeAll(() => {
    content = readDoc('platform-matrix.md');
  });

  it('파일이 존재한다', () => {
    expect(existsSync(resolve(DOCS_NOTION, 'platform-matrix.md'))).toBe(true);
  });

  it.each([
    'BlockNote', 'Tiptap', 'Plate', 'Lexical', 'Novel', 'AFFiNE', '자체',
  ])('%s 행이 포함된다', (platform) => {
    expect(content).toMatch(new RegExp(platform));
  });

  it.each([
    ['custom block API 컬럼', /custom\s*block\s*API/i],
    ['편집 지원 컬럼', /편집\s*지원/],
    ['CSS 격리 컬럼', /CSS\s*격리/],
    ['번들 형식 컬럼', /번들\s*형식/],
    ['위험도 컬럼', /위험도/],
  ])('%s이 포함된다', (_label, pattern) => {
    expect(content).toMatch(pattern);
  });

  it('BlockNote가 채택됨을 명시한다', () => {
    expect(content).toMatch(/BlockNote[\s\S]{0,300}채택|채택[\s\S]{0,300}BlockNote/);
  });

  it('platform-identification.md 또는 TSK-03-01을 입력으로 참조한다', () => {
    expect(content).toMatch(/platform-identification|TSK-03-01/);
  });
});

// ────────────────────────────────────────────────────────
// cross-link 일관성 — adapter-design.md가 핵심 파일 참조
// ────────────────────────────────────────────────────────
describe('cross-link 일관성', () => {
  const KEY_FILES = [
    'FormJsBlockHost',
    'mountViewer',
    'mountEditor',
    'notion-viewer',
    'blockMenu',
    'css-isolation',
    'esbuild.config',
    'preview.ts',
  ];

  it('adapter-design.md가 핵심 파일 이름을 5개 이상 참조한다', () => {
    const content = readDoc('adapter-design.md');
    const mentionedCount = KEY_FILES.filter(f => content.includes(f)).length;
    expect(mentionedCount).toBeGreaterThanOrEqual(5);
  });
});
