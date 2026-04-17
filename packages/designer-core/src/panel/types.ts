/**
 * Panel 모듈 전용 타입
 * propsSchemaToPanel, PanelWidgetRegistry, 위젯 8종의 공통 계약
 */
import type { JSX } from 'preact';

// ---------------------------------------------------------------------------
// Locale helper type
// ---------------------------------------------------------------------------
export type LocaleT = (key: string, params?: Record<string, unknown>) => string;

// ---------------------------------------------------------------------------
// Widget context — 위젯 render/edit 호출 시 전달되는 공통 컨텍스트
// ---------------------------------------------------------------------------
export interface PanelWidgetCtx {
  /** i18n 번역 함수 (WP-05 LocaleProvider 주입 전까지는 identity) */
  t: LocaleT;
  /** 접근성 domId (label for 연결 등) */
  domId: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 표시 레이블 */
  label?: string;
}

// ---------------------------------------------------------------------------
// Widget meta — propsSchema의 단일 property 메타 (validate 호출 시 전달)
// ---------------------------------------------------------------------------
export interface WidgetMeta {
  type: string;
  label?: string;
  default?: unknown;
  enum?: readonly string[];
  min?: number;
  max?: number;
  description?: string;
  group?: string;
  showIf?: string;
  collapsed?: boolean;
}

// ---------------------------------------------------------------------------
// Widget validation result
// ---------------------------------------------------------------------------
export interface WidgetValidationResult {
  ok: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// PanelWidget<TValue> — 위젯 3 계약 인터페이스
// ---------------------------------------------------------------------------
export interface PanelWidget<TValue = unknown> {
  /** 읽기 전용 미리보기 JSX */
  render(value: TValue, ctx: PanelWidgetCtx): JSX.Element;
  /** 편집 UI JSX */
  edit(value: TValue, onChange: (v: TValue) => void, ctx: PanelWidgetCtx, meta?: WidgetMeta): JSX.Element;
  /** 값 유효성 검증 */
  validate(value: unknown, meta: WidgetMeta): WidgetValidationResult;
}

// ---------------------------------------------------------------------------
// PanelEntry — 변환기 출력 단위
// ---------------------------------------------------------------------------
export interface PanelEntry {
  /** propsSchema의 property key */
  key: string;
  /** 위젯 타입 식별자 */
  widgetType: string;
  /** 위젯 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widget: PanelWidget<any>;
  /** 표시 레이블 */
  label?: string;
  /** 설명 */
  description?: string;
  /** 기본값 */
  defaultValue?: unknown;
  /** 그룹 이름 (패널 섹션 묶음) */
  group?: string;
  /** FEEL 표현식 기반 조건부 표시 */
  showIf?: string;
  /** 그룹 초기 접힘 상태 */
  collapsed?: boolean;
  /** 위젯 메타 (validate 호출용) */
  meta: WidgetMeta;
}

// ---------------------------------------------------------------------------
// PanelGroup — 그룹 중첩 (TRD §4.3 "group, collapsed")
// ---------------------------------------------------------------------------
export interface PanelGroup {
  group: string;
  collapsed?: boolean;
  entries: PanelEntry[];
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------
export class UnknownWidgetError extends Error {
  constructor(type: string) {
    super(`[PanelWidgetRegistry] Unknown widget type: "${type}". Register it before use.`);
    this.name = 'UnknownWidgetError';
  }
}

export class DuplicateWidgetError extends Error {
  constructor(type: string) {
    super(`[PanelWidgetRegistry] DuplicateWidget: type "${type}" is already registered. Use { overwrite: true } to replace.`);
    this.name = 'DuplicateWidgetError';
  }
}
