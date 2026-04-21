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
 *
 * @param docUri - 해당 Markdown 문서의 URI 문자열 (없으면 펜슬 링크 생략)
 */
export function renderFormJsBlock(
  content: string,
  id: string,
  start: number,
  end: number,
  docUri?: string
): string {
  const escaped = escapeHtml(content);
  const editLink = docUri
    ? `  ${renderEditLink(docUri, start, end, content)}\n`
    : '';
  return [
    `<div class="form-js-block" data-schema-id="${id}" data-md-start="${start}" data-md-end="${end}">`,
    `${editLink}  <pre class="form-js-source" hidden>${escaped}</pre>`,
    `</div>`,
  ].join('\n');
}

/**
 * ✏️ 편집 펜슬을 `command:formJs.openBlockEditor` 링크로 렌더한다.
 *
 * VSCode markdown preview가 command: URI를 허용하도록 trustedCommands 설정이 필요하지만,
 * 최초 클릭 시 VSCode가 trust dialog를 표시하여 사용자가 승인하면 이후 동작한다.
 */
export function renderEditLink(
  uri: string,
  mdStart: number,
  mdEnd: number,
  schema: string
): string {
  const args = encodeURIComponent(JSON.stringify([{ uri, mdStart, mdEnd, schema }]));
  return `<a class="fjs-edit-btn" role="button" aria-label="편집" title="Block Editor 열기" href="command:formJs.openBlockEditor?${args}">✏️</a>`;
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
    options: import('markdown-it').Options,
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

    // VSCode markdown-language-features는 env.currentDocument에 원본 Markdown 문서 URI(vscode.Uri)를 전달한다.
    // 이 URI를 펜슬 command:URI args에 포함하여 extension이 어떤 문서의 블록인지 식별하게 한다.
    const docUri = ((): string | undefined => {
      const e = env as { currentDocument?: { toString(): string } } | undefined;
      return e?.currentDocument?.toString();
    })();

    try {
      // JSON 파싱 시도 — 실패 시 catch로 진입
      JSON.parse(raw);

      // 성공: schemaHash로 ID 생성 후 플레이스홀더 HTML 반환
      const id = schemaHash(raw);
      return renderFormJsBlock(raw, id, start, end, docUri);
    } catch (err) {
      // 실패: 블록 단위 오류 배너만 반환, 전체 preview 미중단
      const message = err instanceof Error ? err.message : String(err);
      return renderErrorBanner(message);
    }
  };
}
