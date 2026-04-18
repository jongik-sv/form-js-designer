/**
 * cliRegistry — CLI 전용 정적 컴포넌트 타입 레지스트리
 *
 * form-js 기본 타입 + designer-components + designer-table 타입을 정적으로 등록.
 * 브라우저 의존(Preact, DOM shim) 없이 Node.js에서만 실행된다.
 *
 * SYNC with:
 *   - packages/designer-components/src/index.ts (card, stack, button, tabs, modal)
 *   - packages/designer-table/src/index.ts (table)
 *   - @bpmn-io/form-js-viewer built-in field types (textfield, number, ...)
 *
 * 위 패키지에 신규 타입이 추가되면 이 목록도 동기화해야 한다.
 */
import type { CLIRegistry } from './types.js';

// form-js @bpmn-io/form-js-viewer 기본 컴포넌트 타입
const FORM_JS_BASE_TYPES = new Set([
  'textfield',
  'number',
  'datetime',
  'checkbox',
  'select',
  'radio',
  'textarea',
  'group',
  'default',
  // Additional built-in types
  'image',
  'button',
  'text',
  'spacer',
  'separator',
  'expression-field',
  'iframe',
]);

// designer-components 패키지 타입 (SYNC with packages/designer-components/src/index.ts)
// Note: 'button'은 form-js 기본 타입에도 포함되므로 중복 등록 불필요
const DESIGNER_COMPONENTS_TYPES = new Set([
  'card',
  'stack',
  'tabs',
  'modal',
]);

// designer-table 패키지 타입 (SYNC with packages/designer-table/src/index.ts)
const DESIGNER_TABLE_TYPES = new Set([
  'table',
]);

const ALL_TYPES = new Set([
  ...FORM_JS_BASE_TYPES,
  ...DESIGNER_COMPONENTS_TYPES,
  ...DESIGNER_TABLE_TYPES,
]);

class StaticCLIRegistry implements CLIRegistry {
  has(type: string): boolean {
    return Boolean(type) && ALL_TYPES.has(type);
  }
}

let _registry: CLIRegistry | null = null;

/**
 * CLI 전용 정적 컴포넌트 레지스트리를 반환한다.
 * 싱글턴 패턴 — 모듈 내 1회만 생성.
 */
export function getCLIRegistry(): CLIRegistry {
  if (!_registry) {
    _registry = new StaticCLIRegistry();
  }
  return _registry;
}
