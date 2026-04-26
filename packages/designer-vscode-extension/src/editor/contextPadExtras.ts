/**
 * contextPadExtras — form-js editor context-pad 확장 (가로/세로 복사 버튼 주입).
 *
 * 웹 designer-editor-host의 OutlineModule이 수행하던 기능 중
 * "행으로 복사 / 세로로 복사" 2개의 버튼만 VSCode Custom Editor에서 재현한다.
 * (OutlinePanel UI · 멀티선택 · 단축키 기능은 제외)
 *
 * - MutationObserver로 `.fjs-context-pad`를 감시하여 form-js 기본 삭제 버튼 앞에 주입
 * - 가로 복사: 원본과 동일 row (layout.row 복사)
 * - 세로 복사: 새 row (layout.row 제거)
 * - didi 주입: formFieldRegistry, formEditor, modeling, formLayouter
 */

/** form-js formFieldRegistry DI */
interface FormFieldRegistry {
  get(id: string): unknown;
}

/** form-js formEditor DI */
interface FormEditor {
  getSchema(): unknown;
}

/** form-js modeling DI */
interface Modeling {
  addFormField(attrs: unknown, targetFormField: unknown, targetIndex: number): void;
}

/** form-js formLayouter DI */
interface FormLayouter {
  getRowForField(field: unknown): unknown;
}

/** 내부 field 표현 */
interface InternalField {
  id: string;
  type?: string;
  _parent?: string;
  parent?: InternalField;
  components?: InternalField[];
  key?: string;
  layout?: Record<string, unknown>;
  [key: string]: unknown;
}

/** form-js 내부 참조 키 — clone 시 제외 */
const INTERNAL_KEYS = new Set(['_parent', '_path']);

function generateId(prefix: string): string {
  const uuid = crypto.randomUUID();
  return `${prefix}-${uuid.slice(0, 8)}`;
}

function collectKeys(field: InternalField, set: Set<string> = new Set()): Set<string> {
  if (typeof field.key === 'string') set.add(field.key);
  if (Array.isArray(field.components)) {
    for (const child of field.components) collectKeys(child, set);
  }
  return set;
}

function generateUniqueKey(baseKey: string, existingKeys: Set<string>): string {
  if (!existingKeys.has(baseKey)) return baseKey;
  let candidate = `${baseKey}_copy`;
  let i = 1;
  while (existingKeys.has(candidate)) {
    i += 1;
    candidate = `${baseKey}_copy_${i}`;
  }
  return candidate;
}

function deepCloneWithNewIds(field: InternalField, existingKeys?: Set<string>): InternalField {
  const cloned: InternalField = Object.fromEntries(
    Object.entries(field).filter(([k]) => !INTERNAL_KEYS.has(k)),
  ) as InternalField;

  const prefix = field.type ?? 'field';
  cloned.id = generateId(prefix);

  if (existingKeys && typeof field.key === 'string') {
    const uniqueKey = generateUniqueKey(field.key, existingKeys);
    cloned.key = uniqueKey;
    existingKeys.add(uniqueKey);
  }

  if (Array.isArray(field.components)) {
    cloned.components = field.components.map((c) => deepCloneWithNewIds(c, existingKeys));
  }

  return cloned;
}

function stripLayoutRow(attrs: Record<string, unknown>): Record<string, unknown> {
  if (attrs.layout && typeof attrs.layout === 'object') {
    const layout = { ...(attrs.layout as Record<string, unknown>) };
    delete layout['row'];
    return { ...attrs, layout };
  }
  return attrs;
}

/** context-pad "가로 복제" 버튼 SVG (columns 모양) */
const COPY_ROW_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M7 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

/** context-pad "세로 복제" 버튼 SVG (rows 모양) */
const COPY_VERTICAL_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="10" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M8 7v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

class ContextPadExtrasService {
  static $inject = ['formFieldRegistry', 'formEditor', 'modeling', 'formLayouter'];

  private _observer: MutationObserver | null = null;

  constructor(
    private readonly _formFieldRegistry: FormFieldRegistry,
    private readonly _formEditor: FormEditor,
    private readonly _modeling: Modeling,
    private readonly _formLayouter: FormLayouter,
  ) {
    this._startObserver();
  }

  private _getParent(field: InternalField): InternalField | undefined {
    if (typeof field._parent === 'string') {
      return this._formFieldRegistry.get(field._parent) as InternalField | undefined;
    }
    return field.parent;
  }

  private _prepareDuplicate(
    id: string,
  ): { attrs: Record<string, unknown>; parent: InternalField; insertIdx: number; field: InternalField } | null {
    if (!id) return null;
    const field = this._formFieldRegistry.get(id) as InternalField | undefined;
    if (!field) return null;

    const parent = this._getParent(field);
    if (!parent) return null;

    const schema = this._formEditor.getSchema() as InternalField | null | undefined;
    const existingKeys = schema ? collectKeys(schema) : new Set<string>();

    const attrs = deepCloneWithNewIds(field, existingKeys) as unknown as Record<string, unknown>;

    const siblings = Array.isArray(parent.components) ? parent.components : [];
    const idx = siblings.findIndex((c) => c.id === id);
    const insertIdx = idx === -1 ? siblings.length : idx + 1;

    return { attrs, parent, insertIdx, field };
  }

  duplicateVertical(id: string): void {
    const prepared = this._prepareDuplicate(id);
    if (!prepared) return;
    const { attrs, parent, insertIdx } = prepared;
    this._modeling.addFormField(stripLayoutRow(attrs), parent, insertIdx);
  }

  duplicateHorizontal(id: string): void {
    const prepared = this._prepareDuplicate(id);
    if (!prepared) return;
    const { attrs, parent, insertIdx, field } = prepared;
    const sourceRow = this._formLayouter.getRowForField(field) as { id?: string } | null | undefined;
    if (sourceRow?.id) {
      attrs.layout = {
        ...((attrs.layout as Record<string, unknown>) ?? {}),
        row: sourceRow.id,
      };
    }
    this._modeling.addFormField(attrs, parent, insertIdx);
  }

  private _injectDuplicateButtons(pad: HTMLElement): void {
    if (pad.querySelector('[data-context-pad-duplicate-h]')) return;

    const fieldEl = pad.closest('[data-id]') as HTMLElement | null;
    const fieldId = fieldEl?.dataset.id;
    if (!fieldId) return;

    const makeBtn = (
      dataAttr: string,
      title: string,
      svg: string,
      onClick: () => void,
    ): HTMLButtonElement => {
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

    const hBtn = makeBtn('data-context-pad-duplicate-h', '행으로 복사', COPY_ROW_ICON_SVG, () =>
      this.duplicateHorizontal(fieldId),
    );
    const vBtn = makeBtn(
      'data-context-pad-duplicate-v',
      '세로로 복사',
      COPY_VERTICAL_ICON_SVG,
      () => this.duplicateVertical(fieldId),
    );

    pad.insertBefore(vBtn, pad.firstChild);
    pad.insertBefore(hBtn, pad.firstChild);
  }

  private _startObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    const scan = (root: ParentNode): void => {
      const pads = root.querySelectorAll?.('.fjs-context-pad') ?? [];
      pads.forEach((pad) => this._injectDuplicateButtons(pad as HTMLElement));
    };

    scan(document);

    this._observer = new MutationObserver((mutations) => {
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

    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }
}

export const ContextPadExtrasModule = {
  __init__: ['contextPadExtras'],
  contextPadExtras: [
    'type',
    ContextPadExtrasService as unknown as new (...args: unknown[]) => unknown,
  ] as ['type', typeof ContextPadExtrasService],
};

export { ContextPadExtrasService };
