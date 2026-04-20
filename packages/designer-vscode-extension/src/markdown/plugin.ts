/**
 * TSK-01-01: markdown-it 플러그인 — form-js fence → placeholder
 *
 * ` ```form-js ` 코드펜스를 감지하여:
 *   - JSON 파싱 성공: .form-js-block div + hidden <pre class="form-js-source"> 반환
 *   - JSON 파싱 실패: .form-js-block--error 오류 배너 반환 (블록 단위 try/catch)
 *
 * XSS 방지: 본문은 반드시 escapeHtml을 통과한 뒤 hidden <pre>에 삽입.
 */
import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type Renderer from 'markdown-it/lib/renderer.mjs';
import { escapeHtml } from '../shared/escapeHtml';
import { schemaHash } from '../shared/schemaHash';

/**
 * 성공 경로 HTML 생성.
 * data-schema-id, data-md-start, data-md-end, hidden <pre class="form-js-source"> 포함.
 */
export function renderFormJsBlock(
  content: string,
  id: string,
  start: number,
  end: number
): string {
  const escaped = escapeHtml(content);
  return [
    `<div class="form-js-block" data-schema-id="${id}" data-md-start="${start}" data-md-end="${end}">`,
    `  <pre class="form-js-source" hidden>${escaped}</pre>`,
    `</div>`,
  ].join('\n');
}

/**
 * 실패 경로 HTML 생성.
 * .form-js-block--error div + role="alert" 오류 배너.
 */
export function renderErrorBanner(message: string): string {
  const escaped = escapeHtml(message);
  return [
    `<div class="form-js-block--error" role="alert">`,
    `  <span class="form-js-error-message">${escaped}</span>`,
    `</div>`,
  ].join('\n');
}

/**
 * formJsMarkdownPlugin — markdown-it 플러그인 진입점.
 * md.renderer.rules.fence를 래핑하여 form-js 펜스만 가로챈다.
 * 나머지는 기존 렌더러(defaultFence)에 위임한다.
 */
export function formJsMarkdownPlugin(md: MarkdownIt): void {
  // 기존 fence 렌더러를 저장 (없으면 기본 렌더러 fallback)
  const defaultFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (
    tokens: Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: unknown,
    self: Renderer
  ): string => {
    const token = tokens[idx]!;
    const info = token.info.trim();

    // form-js가 아니면 기존 렌더러에 위임
    if (info !== 'form-js') {
      if (defaultFence) {
        return defaultFence(tokens, idx, options, env, self);
      }
      return self.renderToken(tokens, idx, options);
    }

    // token.map null 방어: [start, end] = token.map ?? [0, 0]
    const [start, end] = token.map ?? [0, 0];

    // content 끝 개행 제거 (markdown-it 관례)
    const raw = token.content.endsWith('\n')
      ? token.content.slice(0, -1)
      : token.content;

    try {
      // JSON 파싱 시도 — 실패 시 catch로 진입
      JSON.parse(raw);

      // 성공: schemaHash로 ID 생성 후 플레이스홀더 HTML 반환
      const id = schemaHash(raw);
      return renderFormJsBlock(raw, id, start, end);
    } catch (err) {
      // 실패: 블록 단위 오류 배너만 반환, 전체 preview 미중단
      const message = err instanceof Error ? err.message : String(err);
      return renderErrorBanner(message);
    }
  };
}
