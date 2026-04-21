/**
 * TSK-01-01: formJsMarkdownPlugin 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 */
import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { formJsMarkdownPlugin } from '../../src/markdown/plugin';
import { extendMarkdownIt } from '../../src/extension';

// ──────────────────────────────────────────────────────
// Helper: md 인스턴스를 생성하고 플러그인 적용
// ──────────────────────────────────────────────────────
function createMd(): MarkdownIt {
  return new MarkdownIt().use(formJsMarkdownPlugin);
}

const VALID_JSON = JSON.stringify({ components: [], id: 'form1' });
const VALID_JSON_2 = JSON.stringify({ components: [], id: 'form2' });

function fence(lang: string, content: string): string {
  // markdown-it 펜스 블록을 직접 렌더하기 위해 md.render 사용
  return `\`\`\`${lang}\n${content}\n\`\`\``;
}

// ──────────────────────────────────────────────────────
// 1. 유효한 form-js JSON 펜스 → .form-js-block 생성
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: 유효 JSON 블록', () => {
  it('유효한 form-js 펜스가 .form-js-block div를 포함한 HTML을 생성한다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON));
    expect(html).toContain('class="form-js-block"');
  });

  it('유효한 form-js 펜스에 hidden <pre class="form-js-source"> 가 포함된다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON));
    expect(html).toContain('class="form-js-source"');
    expect(html).toContain('hidden');
  });

  it('data-schema-id가 12자 16진수 문자열이다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON));
    const match = html.match(/data-schema-id="([0-9a-f]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toHaveLength(12);
  });

  it('data-md-start, data-md-end 속성이 존재한다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON));
    expect(html).toMatch(/data-md-start="\d+"/);
    expect(html).toMatch(/data-md-end="\d+"/);
  });
});

// ──────────────────────────────────────────────────────
// 2. form-js가 아닌 언어 펜스 → 기본 렌더에 위임
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: 비-form-js 언어 펜스', () => {
  it('javascript 펜스는 기본 markdown-it 코드블록으로 렌더된다', () => {
    const md = createMd();
    const html = md.render(fence('javascript', 'const x = 1;'));
    expect(html).not.toContain('form-js-block');
    // 기본 코드블록 마크업 확인
    expect(html).toContain('<code');
  });

  it('언어가 없는 펜스는 기본 렌더에 위임된다', () => {
    const md = createMd();
    const html = md.render(fence('', 'plain text'));
    expect(html).not.toContain('form-js-block');
  });
});

// ──────────────────────────────────────────────────────
// 3. 같은 JSON → 동일 data-schema-id, 다른 JSON → 다른 ID
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: schema-id 일관성', () => {
  it('동일 JSON 스키마 두 블록은 data-schema-id가 동일하다', () => {
    const md = createMd();
    const src = fence('form-js', VALID_JSON) + '\n\n' + fence('form-js', VALID_JSON);
    const html = md.render(src);
    const matches = [...html.matchAll(/data-schema-id="([0-9a-f]+)"/g)];
    expect(matches).toHaveLength(2);
    expect(matches[0]![1]).toBe(matches[1]![1]);
  });

  it('서로 다른 JSON 스키마 두 블록은 data-schema-id가 다르다', () => {
    const md = createMd();
    const src = fence('form-js', VALID_JSON) + '\n\n' + fence('form-js', VALID_JSON_2);
    const html = md.render(src);
    const matches = [...html.matchAll(/data-schema-id="([0-9a-f]+)"/g)];
    expect(matches).toHaveLength(2);
    expect(matches[0]![1]).not.toBe(matches[1]![1]);
  });
});

// ──────────────────────────────────────────────────────
// 4. token.map null 방어
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: token.map null 방어', () => {
  it('token.map이 null이면 data-md-start="0" data-md-end="0"으로 안전 처리', () => {
    // markdown-it을 직접 조작하여 map=null 토큰 시뮬레이션
    const md = new MarkdownIt();
    md.use(formJsMarkdownPlugin);

    // 플러그인의 렌더러를 통해 map=null 토큰을 직접 테스트
    const token = {
      type: 'fence',
      tag: 'code',
      info: 'form-js',
      content: VALID_JSON + '\n',
      map: null,
      level: 0,
      children: null,
      markup: '```',
      meta: null,
      block: true,
      hidden: false,
      attrIndex: () => -1,
      attrPush: () => {},
      attrSet: () => {},
      attrGet: () => null,
      attrJoin: () => '',
      attrs: null,
    };
    // 렌더러 직접 호출
    const rule = md.renderer.rules.fence;
    if (rule) {
      let html: string = '';
      expect(() => {
        html = rule([token as any], 0, md.options, md.options, md.renderer);
      }).not.toThrow();
      expect(html).toContain('data-md-start="0"');
      expect(html).toContain('data-md-end="0"');
    }
  });
});

// ──────────────────────────────────────────────────────
// 5. 잘못된 JSON 블록 → 오류 배너만 출력
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: 잘못된 JSON 블록', () => {
  it('잘못된 JSON 펜스는 .form-js-block--error 배너를 출력한다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', '{ invalid json }'));
    expect(html).toContain('form-js-block--error');
  });

  it('잘못된 JSON 블록은 .form-js-block div를 생성하지 않는다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', '{ invalid json }'));
    // error 클래스가 없는 순수 form-js-block은 없어야 함
    // form-js-block--error는 있어도 됨
    const withoutError = html.replace(/class="form-js-block--error[^"]*"/g, '');
    expect(withoutError).not.toContain('class="form-js-block"');
  });

  it('잘못된 JSON 블록은 role="alert"를 포함한다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', '{ invalid json }'));
    expect(html).toContain('role="alert"');
  });

  it('잘못된 JSON 1개 + 유효 JSON 1개 혼재 시 각각 독립적으로 렌더된다', () => {
    const md = createMd();
    const src = fence('form-js', '{ bad }') + '\n\n' + fence('form-js', VALID_JSON);
    const html = md.render(src);
    expect(html).toContain('form-js-block--error');
    expect(html).toContain('class="form-js-block"');
    expect(html).toContain('class="form-js-source"');
  });
});

// ──────────────────────────────────────────────────────
// 6. XSS 방지
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: XSS 방지', () => {
  it('XSS 공격 문자열이 hidden <pre> 안에서 이스케이프된 상태로 삽입된다', () => {
    const md = createMd();
    const xssJson = JSON.stringify({ name: '<script>alert(1)</script>' });
    const html = md.render(fence('form-js', xssJson));
    // 원본 태그가 그대로 있으면 안 됨
    expect(html).not.toContain('<script>alert(1)</script>');
    // 이스케이프된 형태여야 함
    expect(html).toContain('&lt;script&gt;');
  });
});

// ──────────────────────────────────────────────────────
// 6b. ✏️ 펜슬 command URI 링크 (env.currentDocument 기반)
// ──────────────────────────────────────────────────────
describe('formJsMarkdownPlugin: 펜슬 command URI 링크', () => {
  it('env.currentDocument가 제공되면 <a href="command:formJs.openBlockEditor?..."> 링크를 포함한다', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON), {
      currentDocument: { toString: () => 'file:///workspace/doc.md' },
    });
    expect(html).toContain('class="fjs-edit-btn"');
    expect(html).toContain('href="command:formJs.openBlockEditor?');
    // args에 uri가 포함돼야 함
    expect(decodeURIComponent(html)).toContain('file:///workspace/doc.md');
  });

  it('command URI args는 schema를 포함하지 않는다 (URL 길이 제한 회피)', () => {
    const md = createMd();
    const hugeSchema = JSON.stringify({
      components: Array.from({ length: 50 }, (_, i) => ({ type: 'textfield', key: `f${i}` })),
    });
    const html = md.render(fence('form-js', hugeSchema), {
      currentDocument: { toString: () => 'file:///workspace/doc.md' },
    });
    const match = html.match(/href="command:formJs\.openBlockEditor\?([^"]+)"/);
    expect(match).not.toBeNull();
    const decoded = decodeURIComponent(match![1]!);
    const parsed = JSON.parse(decoded) as Array<{ uri: string; schema?: string }>;
    expect(parsed[0]!.uri).toBe('file:///workspace/doc.md');
    expect(parsed[0]!.schema).toBeUndefined();
  });

  it('env.currentDocument가 없으면 펜슬 링크를 생략한다 (블록 렌더는 유지)', () => {
    const md = createMd();
    const html = md.render(fence('form-js', VALID_JSON));
    expect(html).toContain('class="form-js-block"');
    expect(html).not.toContain('href="command:formJs.openBlockEditor');
  });
});

// ──────────────────────────────────────────────────────
// 7. extendMarkdownIt — VSCode 진입점
// ──────────────────────────────────────────────────────
describe('extendMarkdownIt', () => {
  it('extendMarkdownIt(md) 호출 후 md로 form-js 펜스 렌더 시 .form-js-block 포함 HTML 반환', () => {
    const md = new MarkdownIt();
    const extended = extendMarkdownIt(md);
    const html = extended.render(fence('form-js', VALID_JSON));
    expect(html).toContain('class="form-js-block"');
  });

  it('extendMarkdownIt은 md 인스턴스를 반환한다', () => {
    const md = new MarkdownIt();
    const result = extendMarkdownIt(md);
    expect(result).toBe(md);
  });
});
