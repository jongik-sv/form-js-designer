/**
 * designer-runtime/modules public exports — TSK-12-02 (컴포넌트 높이만 유지, row 높이는 제거됨)
 */

export { LayoutHeightModule, LayoutHeightService } from './LayoutHeightModule';
export { applyLayoutHeight, LAYOUT_HEIGHT_TARGET_TYPES } from './LayoutHeightApplier';
export type { ApplierField, LayoutHeightTargetType } from './LayoutHeightApplier';
