/**
 * Dev-only heuristic that scans a render function's source code for
 * designer-context patterns that must never appear in pure render functions.
 * Emits console.warn per match; never throws.
 */

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /useService\(\s*['"]selection['"]/, label: 'useService("selection")' },
  { regex: /\bediting\b/, label: 'editing' },
  { regex: /\bisPreview\b/, label: 'isPreview' },
  { regex: /\bisDesigner\b/, label: 'isDesigner' },
  { regex: /document\.body\.appendChild/, label: 'document.body.appendChild' },
];

export function assertPureRender(fn: (...args: unknown[]) => unknown): void {
  const source = fn.toString();
  for (const { regex, label } of FORBIDDEN_PATTERNS) {
    if (regex.test(source)) {
      console.warn(
        `[designer-core] assertPureRender: render function contains forbidden pattern "${label}". ` +
          'Pure render functions must not access designer-only context (editing, selection, isPreview, isDesigner) ' +
          'or perform DOM side-effects like document.body.appendChild.',
      );
    }
  }
}
