import { h, render } from 'preact';
import { OutlinePanel } from './OutlinePanel';
import { schemaToOutline } from './schemaToOutline';
import { deepCloneWithNewIds, generateId, collectKeys } from './outlineUtils';
import type { OutlineNode, DropPosition } from './outlineTypes';
import type { FieldSchema } from './outlineUtils';

export interface FormJsEventBus {
  on(event: string, callback: (event?: unknown) => void): void;
  off(event: string, callback: (event?: unknown) => void): void;
}

export interface FormJsFormEditor {
  getSchema(): unknown;
}

export interface FormJsSelection {
  get(): { id?: string } | null;
  set(element: unknown): void;
  toggle(element: unknown): void;
}

export interface FormJsFormFieldRegistry {
  get(id: string): unknown;
}

/** form-js modeling 서비스 인터페이스 (필요한 메서드만 선언) */
export interface FormJsModeling {
  /**
   * formField를 이동한다.
   * 시그니처: moveFormField(formField, sourceFormField, targetFormField, sourceIndex, targetIndex, sourceRow, targetRow)
   * sourceRow: 드래그 필드의 현재 row 객체 (formLayouter.getRowForField)
   * targetRow: null → 새 row(단일 컬럼) 정책
   */
  moveFormField(
    formField: unknown,
    sourceFormField: unknown,
    targetFormField: unknown,
    sourceIndex: number,
    targetIndex: number,
    sourceRow: unknown,
    targetRow: null,
  ): void;
  /**
   * formField를 추가한다.
   * 시그니처: addFormField(attrs, targetFormField, targetIndex)
   */
  addFormField(attrs: unknown, targetFormField: unknown, targetIndex: number): void;
}

/** form-js formLayouter 서비스 인터페이스 */
export interface FormJsFormLayouter {
  /** 필드가 속한 row 객체를 반환. row가 없으면 undefined/null */
  getRowForField(formField: unknown): unknown;
}

/** form-js formField 내부 구조
 * form-js v1+: `_parent`는 부모 ID 문자열. `parent`는 테스트 mock용 객체 참조.
 * 실제 부모 객체는 formFieldRegistry.get(_parent)로 조회해야 함.
 */
interface InternalFormField {
  id: string;
  type: string;
  /** form-js 런타임: 부모 ID 문자열 */
  _parent?: string;
  /** 테스트 mock: 부모 객체 직접 참조 */
  parent?: InternalFormField;
  components?: InternalFormField[];
  [key: string]: unknown;
}

/** 컨테이너 타입 (inside 드롭 허용 대상 — tabs 제외) */
const CONTAINER_TYPES = new Set(['card', 'stack', 'modal', 'tabPanel']);

/** inside 드롭이 비활성화된 컨테이너 타입 (tabs: 2단계 구조 특수 케이스) */
const DISABLED_INSIDE_TYPES = new Set(['tabs']);

class OutlinePanelService {
  _container: HTMLElement | null = null;
  _nodes: OutlineNode[] = [];
  _selectedIds: string[] = [];
  /** import.done 시에만 증가. OutlinePanel key prop으로 전달하여 state 리셋. */
  _schemaVersion: number = 0;
  /** in-memory 클립보드: 복사된 FieldSchema 스냅샷 (deep clone with new ids) */
  _clipboard: FieldSchema | null = null;

  _eventBus: FormJsEventBus;
  _formEditor: FormJsFormEditor;
  _formFieldRegistry: FormJsFormFieldRegistry;
  _selection: FormJsSelection;
  _modeling: FormJsModeling;
  _formLayouter: FormJsFormLayouter;

  private _boundOnImportDone: () => void;
  private _boundOnChanged: () => void;
  private _boundOnSelectionChanged: (event: unknown) => void;
  /** form-js context-pad(삭제 버튼 영역) 감시 — 복제 버튼 주입용 */
  private _contextPadObserver: MutationObserver | null = null;

  static inject = ['eventBus', 'formEditor', 'formFieldRegistry', 'selection', 'modeling', 'formLayouter'];

  constructor(
    eventBus: FormJsEventBus,
    formEditor: FormJsFormEditor,
    formFieldRegistry: FormJsFormFieldRegistry,
    selection: FormJsSelection,
    modeling: FormJsModeling,
    formLayouter: FormJsFormLayouter,
  ) {
    this._eventBus = eventBus;
    this._formEditor = formEditor;
    this._formFieldRegistry = formFieldRegistry;
    this._selection = selection;
    this._modeling = modeling;
    this._formLayouter = formLayouter;

    this._boundOnImportDone = () => this._onImportDone();
    this._boundOnChanged = () => this._onChanged();
    this._boundOnSelectionChanged = (event: unknown) => this._onSelectionChanged(event);

    eventBus.on('import.done', this._boundOnImportDone);
    eventBus.on('commandStack.changed', this._boundOnChanged);
    eventBus.on('selection.changed', this._boundOnSelectionChanged);

    this._startContextPadObserver();
  }

  private _render() {
    if (!this._container) return;
    render(
      h(OutlinePanel, {
        key: this._schemaVersion,
        nodes: this._nodes,
        selectedIds: this._selectedIds,
        onSelect: (id: string) => this._handleSelect(id),
        onDrop: (dragId: string, targetId: string, position: DropPosition) =>
          this._handleDrop(dragId, targetId, position),
        onCopy: (id: string) => this._handleCopy(id),
        onPaste: () => this._handlePaste(),
      }),
      this._container,
    );
  }

  /**
   * formField의 부모 InternalFormField를 가져오는 헬퍼.
   * - 런타임: field._parent는 부모 ID 문자열 → formFieldRegistry.get()으로 조회
   * - 테스트 mock: field.parent는 부모 객체 직접 참조
   */
  private _getParent(field: InternalFormField): InternalFormField | undefined {
    // 런타임 form-js: _parent는 string ID
    if (typeof field._parent === 'string') {
      return this._formFieldRegistry.get(field._parent) as InternalFormField | undefined;
    }
    // 테스트 mock: parent는 객체
    return field.parent;
  }

  _handleSelect(id: string) {
    // id가 스키마에 없는 엣지 케이스는 no-op
    const formField = this._formFieldRegistry.get(id);
    if (!formField) return;
    this._selection.set(formField);
  }

  /**
   * DnD 드롭 핸들러.
   * dragId → targetId 위치(position)로 form-js modeling.moveFormField 호출.
   * - sourceIndex: dragField의 부모 components 내 실제 인덱스
   * - sourceRow: formLayouter.getRowForField(dragField) — row 레이아웃 복원용
   * - targetRow: null → form-js가 새 row(단일 컬럼)로 배정
   * - tabs 타입 inside 드롭은 비활성화 (HIGH 리스크 §2: 2단계 구조 특수 케이스)
   * - self-drop(dragId === targetId)는 no-op
   */
  _handleDrop(dragId: string, targetId: string, position: DropPosition) {
    if (dragId === targetId) return;

    const dragField = this._formFieldRegistry.get(dragId) as InternalFormField | undefined;
    const targetField = this._formFieldRegistry.get(targetId) as InternalFormField | undefined;
    if (!dragField || !targetField) return;

    if (position === 'inside' && DISABLED_INSIDE_TYPES.has(targetField.type)) return;

    const dragParent = this._getParent(dragField);
    if (!dragParent) return;

    const sourceIndex = this._findIndexInParent(dragParent, dragField.id);
    if (sourceIndex === -1) return;

    const sourceRow = this._formLayouter.getRowForField(dragField);

    if (position === 'inside') {
      this._moveInside(dragField, dragParent, targetField, sourceIndex, sourceRow);
    } else {
      this._moveBeforeOrAfter(dragField, dragParent, targetField, sourceIndex, sourceRow, position);
    }
  }

  /** inside 드롭: 대상 컨테이너의 마지막 위치로 이동 */
  private _moveInside(
    dragField: InternalFormField,
    dragParent: InternalFormField,
    targetContainer: InternalFormField,
    sourceIndex: number,
    sourceRow: unknown,
  ) {
    const targetIndex = Array.isArray(targetContainer.components)
      ? targetContainer.components.length
      : 0;

    this._modeling.moveFormField(
      dragField,
      dragParent,
      targetContainer,
      sourceIndex,
      targetIndex,
      sourceRow,
      null,
    );
  }

  /** before / after 드롭: 대상 노드 부모에서 삽입 인덱스 계산 후 이동 */
  private _moveBeforeOrAfter(
    dragField: InternalFormField,
    dragParent: InternalFormField,
    targetField: InternalFormField,
    sourceIndex: number,
    sourceRow: unknown,
    position: 'before' | 'after',
  ) {
    const targetParent = this._getParent(targetField);
    if (!targetParent) return;

    const targetIdx = this._findIndexInParent(targetParent, targetField.id);
    if (targetIdx === -1) return;

    const insertIndex = position === 'before' ? targetIdx : targetIdx + 1;

    this._modeling.moveFormField(
      dragField,
      dragParent,
      targetParent,
      sourceIndex,
      insertIndex,
      sourceRow,
      null,
    );
  }

  /** 부모 components 배열에서 id로 인덱스를 찾는 헬퍼 */
  private _findIndexInParent(parent: InternalFormField, childId: string): number {
    const siblings = Array.isArray(parent.components) ? parent.components : [];
    return siblings.findIndex((c) => c.id === childId);
  }

  /**
   * 복사 핸들러: formField를 deep clone(새 ID 포함)하여 in-memory 클립보드에 저장.
   */
  _handleCopy(id: string) {
    if (!id) return;
    const formField = this._formFieldRegistry.get(id) as FieldSchema | undefined;
    if (!formField) return;

    this._clipboard = deepCloneWithNewIds(formField);
  }

  /**
   * 붙여넣기 핸들러: 클립보드 내용을 현재 선택 노드의 부모 또는 루트에 삽입.
   * 매 paste마다 클립보드를 deep clone → 새 id로 삽입(여러 번 paste 가능).
   */
  _handlePaste() {
    if (!this._clipboard) return;

    // 현재 스키마의 모든 key를 수집해 paste 시 바인딩 경로 충돌 방지
    // form-js data field의 key는 유일해야 함 (그렇지 않으면 addFormField가 'already claimed'로 reject)
    const schema = this._formEditor.getSchema() as FieldSchema | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    // 매 paste마다 새 id · 새 key 재생성
    const attrs = deepCloneWithNewIds(this._clipboard, existingKeys);

    // 현재 선택된 노드의 부모를 target으로 사용
    let targetParent: InternalFormField | null = null;
    let targetIndex = 0;

    if (this._selectedIds.length > 0) {
      const selectedId = this._selectedIds[0]!;
      const selectedField = this._formFieldRegistry.get(selectedId) as InternalFormField | undefined;
      const selectedParent = selectedField ? this._getParent(selectedField) : undefined;
      if (selectedParent) {
        targetParent = selectedParent;
        const siblings = Array.isArray(targetParent.components) ? targetParent.components : [];
        const selIdx = siblings.findIndex((c) => c.id === selectedId);
        targetIndex = selIdx !== -1 ? selIdx + 1 : siblings.length;
      }
    }

    // targetParent가 없으면 스키마 루트(type=default)를 target으로 사용
    // getSchema()는 raw JSON이므로 formFieldRegistry에서 internal formField를 가져와야 함
    if (!targetParent) {
      const schema = this._formEditor.getSchema() as { id?: string; components?: unknown[] } | null | undefined;
      if (!schema?.id) return;
      const rootField = this._formFieldRegistry.get(schema.id) as InternalFormField | undefined;
      if (!rootField) return;
      targetParent = rootField;
      targetIndex = Array.isArray(rootField.components) ? rootField.components.length : 0;
    }

    this._modeling.addFormField(attrs, targetParent, targetIndex);
  }

  /**
   * 방향 복제 공통 준비 헬퍼.
   * - formFieldRegistry에서 field 조회 → 부모 조회 → existingKeys 수집 → deep clone 생성 → insertIdx 계산
   * - null 반환 시 호출자는 no-op으로 처리한다.
   */
  private _prepareDuplicateAttrs(
    id: string,
  ): { attrs: Record<string, unknown>; parent: InternalFormField; insertIdx: number; field: InternalFormField } | null {
    if (!id) return null;
    const field = this._formFieldRegistry.get(id) as InternalFormField | undefined;
    if (!field) return null;

    const parent = this._getParent(field);
    if (!parent) return null;

    const schema = this._formEditor.getSchema() as FieldSchema | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    const attrs = deepCloneWithNewIds(field as unknown as FieldSchema, existingKeys) as Record<string, unknown>;

    const siblings = Array.isArray(parent.components) ? parent.components : [];
    const idx = siblings.findIndex((c) => c.id === id);
    const insertIdx = idx === -1 ? siblings.length : idx + 1;

    return { attrs, parent, insertIdx, field };
  }

  /**
   * 필드 세로 복제: form-js context-pad "세로로 복사" 버튼에서 호출.
   * - 원본 필드의 바로 다음 형제 위치에 deep clone을 삽입 (새 row)
   * - 기존 _duplicateField와 동일 동작 (rename)
   * - key 충돌은 스키마 전체 key 수집 → baseKey_copy / _copy_2 … 패턴으로 회피
   */
  _duplicateFieldVertical(id: string) {
    const prepared = this._prepareDuplicateAttrs(id);
    if (!prepared) return;

    const { attrs, parent, insertIdx } = prepared;

    // 세로 복사: 새 row에 배치해야 하므로 clone된 layout.row를 제거
    // (deepCloneWithNewIds는 layout 속성을 그대로 복사하므로 원본 row ID가 유지됨)
    if (attrs.layout && typeof attrs.layout === 'object') {
      const layout = { ...(attrs.layout as Record<string, unknown>) };
      delete layout['row'];
      attrs.layout = layout;
    }

    this._modeling.addFormField(attrs, parent, insertIdx);
  }

  /**
   * 필드 가로 복제: form-js context-pad "행으로 복사" 버튼에서 호출.
   * - 원본 필드와 동일한 row에 복제본 삽입 (layout.row 주입)
   * - getRowForField가 null 반환 시 세로 복사로 fallback
   */
  _duplicateFieldHorizontal(id: string) {
    const prepared = this._prepareDuplicateAttrs(id);
    if (!prepared) return;

    const { attrs, parent, insertIdx, field } = prepared;
    const sourceRow = this._formLayouter.getRowForField(field) as { id?: string } | null | undefined;

    if (sourceRow?.id) {
      // layout.row를 원본과 동일하게 지정 → form-js가 동일 row에 배치
      attrs.layout = {
        ...((attrs.layout as Record<string, unknown>) ?? {}),
        row: sourceRow.id,
      };
    }
    // sourceRow 없으면 layout.row 없이 addFormField (새 row = vertical fallback)

    this._modeling.addFormField(attrs, parent, insertIdx);
  }

  /** context-pad "가로 복제" 버튼 SVG (columns 모양, 화살표 → 방향) */
  private static readonly _COPY_ROW_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M7 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /** context-pad "세로 복제" 버튼 SVG (rows 모양, 아래 화살표) */
  private static readonly _COPY_VERTICAL_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="10" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M8 7v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /**
   * form-js가 렌더링한 context-pad에 "가로 복사"·"세로 복사" 버튼 2개를 주입한다.
   * 기존 단일 _injectDuplicateButton 교체. guard: [data-outline-duplicate-h] 존재 시 skip.
   */
  _injectDuplicateButtons(pad: HTMLElement) {
    if (pad.querySelector('[data-outline-duplicate-h]')) return;

    // 부모 .fjs-element[data-id]에서 필드 id 추출
    const fieldEl = pad.closest('[data-id]') as HTMLElement | null;
    const fieldId = fieldEl?.dataset.id;
    if (!fieldId) return;

    // 로컬 버튼 생성 헬퍼: 반복되는 button 태그 생성·속성·이벤트 부착을 1회 정의
    const makeBtn = (dataAttr: string, title: string, svg: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fjs-context-pad-item';
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.setAttribute(dataAttr, 'true');
      btn.innerHTML = svg;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
      return btn;
    };

    const hBtn = makeBtn(
      'data-outline-duplicate-h',
      '행으로 복사',
      OutlinePanelService._COPY_ROW_ICON_SVG,
      () => this._duplicateFieldHorizontal(fieldId),
    );
    const vBtn = makeBtn(
      'data-outline-duplicate-v',
      '세로로 복사',
      OutlinePanelService._COPY_VERTICAL_ICON_SVG,
      () => this._duplicateFieldVertical(fieldId),
    );

    // 배치 순서: [가로 복사][세로 복사] → 기존 삭제 버튼 앞에 삽입
    // insertBefore(null) = appendChild이므로 firstChild로 순서 보장
    pad.insertBefore(vBtn, pad.firstChild);
    pad.insertBefore(hBtn, pad.firstChild);
  }

  /** 문서 전역 MutationObserver로 신규 context-pad를 감지해 복제 버튼 2개 주입 */
  private _startContextPadObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    const scan = (root: ParentNode) => {
      const pads = root.querySelectorAll?.('.fjs-context-pad') ?? [];
      pads.forEach((pad) => this._injectDuplicateButtons(pad as HTMLElement));
    };

    // 초기 스캔
    scan(document);

    this._contextPadObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList?.contains('fjs-context-pad')) {
            this._injectDuplicateButtons(node);
          } else {
            scan(node);
          }
        });
      }
    });

    this._contextPadObserver.observe(document.body, { childList: true, subtree: true });
  }

  private _refreshNodes() {
    this._nodes = schemaToOutline(this._formEditor.getSchema() as Parameters<typeof schemaToOutline>[0]);
  }

  private _onImportDone() {
    this._schemaVersion += 1;
    this._refreshNodes();
    this._render();
  }

  private _onChanged() {
    this._refreshNodes();
    this._render();
  }

  // payload: { selection: formFieldObject | null } — 단일 선택 모델
  private _onSelectionChanged(event: unknown) {
    const e = event as { selection?: { id?: string } | null } | undefined;
    const sel = e && 'selection' in e ? e.selection : null;
    this._selectedIds = sel?.id ? [sel.id] : [];
    this._render();
  }

  mount(container: HTMLElement) {
    this._container = container;
    this._render();
  }

  destroy() {
    this._eventBus.off('import.done', this._boundOnImportDone);
    this._eventBus.off('commandStack.changed', this._boundOnChanged);
    this._eventBus.off('selection.changed', this._boundOnSelectionChanged);

    if (this._contextPadObserver) {
      this._contextPadObserver.disconnect();
      this._contextPadObserver = null;
    }

    if (this._container) {
      render(null, this._container);
      this._container = null;
    }
  }
}

// generateId re-export는 outlineUtils에서 직접 쓰므로 여기서는 import만 함
void generateId; // suppress unused import warning

export const OutlineModule = {
  __init__: ['outlinePanel'],
  outlinePanel: ['type', OutlinePanelService as unknown as new (...args: unknown[]) => unknown],
};
