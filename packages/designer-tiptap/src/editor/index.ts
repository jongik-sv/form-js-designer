import { FormJsBlock } from '../node';

export { FormJsBlock };

/**
 * v0.2 — wraps FormJsBlock with double-click → designer modal.
 * In v0.1 this is a passthrough; consumers using ./editor get the same node as ./.
 */
export function withDesigner(node: typeof FormJsBlock): typeof FormJsBlock {
  return node;
}
