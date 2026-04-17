/**
 * Host 모듈 타입 계약 — TSK-03-03
 *
 * ViewerHost, EditorHost, useViewportWidth에서 공유하는 타입.
 */

import type { Ref } from 'preact';
import type { LocaleT } from '../i18n/localeTypes';

// ---------------------------------------------------------------------------
// FormSchema — form-js viewer 스키마 (내부 최소 타입, runtime import 없음)
// ---------------------------------------------------------------------------
export interface FormSchema {
  components: unknown[];
  type: string;
  id?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export interface HostOnChangeEvent {
  data: Record<string, unknown>;
  schema: FormSchema;
  errors: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Viewport
// ---------------------------------------------------------------------------
export interface HostViewportInfo {
  width: number;
}

export type ViewportSize = 'sm' | 'md' | 'lg' | { width: number };

// ---------------------------------------------------------------------------
// FormRenderContextSlots (타입 surface만 — WP-06에서 실 구현)
// ---------------------------------------------------------------------------
export interface FormRenderContextSlots {
  [slotName: string]: unknown;
}

// ---------------------------------------------------------------------------
// ViewerHostProps
// ---------------------------------------------------------------------------
export interface ViewerHostProps {
  schema: FormSchema;
  data?: Record<string, unknown>;
  locale?: { lang: string; t: LocaleT };
  viewport?: ViewportSize;
  additionalModules?: unknown[];
  onChange?: (e: HostOnChangeEvent) => void;
  onImport?: (e: { warnings: unknown[] }) => void;
  onError?: (e: unknown) => void;
  containerRef?: Ref<HTMLDivElement>;
}

// ---------------------------------------------------------------------------
// EditorHostProps
// ---------------------------------------------------------------------------
export interface EditorHostProps extends ViewerHostProps {
  selectedIds: readonly string[];
  onSelect?: (id: string) => void;
  renderContextSlots?: Partial<FormRenderContextSlots>;
}
