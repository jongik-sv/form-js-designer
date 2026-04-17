import { createNormalizer } from '@zag-js/types';
import type { PropTypes } from '@zag-js/types';

// Preact 10+ accepts className/htmlFor/onClick identically to React.
// Event handlers, data-* attributes, and style objects all pass through.
// → identity normalizer is sufficient; no per-prop rename needed.
export const normalizeProps = createNormalizer<PropTypes>((v) => v);
