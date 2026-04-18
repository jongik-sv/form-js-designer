/**
 * ShortcutModule — 전역 키보드 단축키
 *
 * - Delete / Del        : 현재 선택 필드 삭제 (modeling.removeFormField)
 * - Insert              : 현재 선택 필드를 세로로 복제 (outlinePanel.duplicateField)
 *
 * form-js 내장 keyboard 서비스는 editor canvas 에 focus 가 있을 때만 동작하고
 * 또 `removeSelection` action 은 form-js-editor 에서 등록되지 않는다
 * (rules 서비스 의존). 이 모듈은 document 레벨 listener 로 직접 modeling 을
 * 호출한다. INPUT/TEXTAREA/contentEditable 포커스 시엔 무시한다.
 */

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
}

interface SelectedField {
  id?: string;
  _parent?: string;
}

interface SelectionLike {
  get(): SelectedField | SelectedField[] | null;
}

interface FormFieldRegistryLike {
  get(id: string): unknown;
}

interface ModelingLike {
  removeFormField(formField: unknown, sourceFormField: unknown, sourceIndex: number): void;
}

interface OutlinePanelLike {
  /** OutlineModule 에 정의된 세로 복제 공개 메서드 */
  duplicateField(id: string): void;
}

interface InternalFormField {
  id: string;
  _parent?: string;
  components?: Array<{ id: string }>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

class ShortcutService {
  static inject = ['eventBus', 'selection', 'formFieldRegistry', 'modeling', 'outlinePanel'];

  private readonly _onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    eventBus: EventBusLike,
    selection: SelectionLike,
    formFieldRegistry: FormFieldRegistryLike,
    modeling: ModelingLike,
    outlinePanel: OutlinePanelLike | null,
  ) {
    this._onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key;
      const isDelete = key === 'Delete' || key === 'Del';
      const isInsert = key === 'Insert';
      if (!isDelete && !isInsert) return;

      const raw = selection.get?.();
      const selected = Array.isArray(raw) ? raw[0] : raw;
      if (!selected?.id) return;

      // 루트 form(type=default) 은 _parent 가 없으므로 삭제/복제 대상 제외
      if (!selected._parent) return;

      if (isDelete) {
        event.preventDefault();
        event.stopPropagation();
        const field = formFieldRegistry.get(selected.id) as InternalFormField | undefined;
        if (!field || !field._parent) return;
        const parent = formFieldRegistry.get(field._parent) as InternalFormField | undefined;
        if (!parent) return;
        const idx = Array.isArray(parent.components)
          ? parent.components.findIndex((c) => c.id === field.id)
          : -1;
        if (idx === -1) return;
        modeling.removeFormField(field, parent, idx);
        return;
      }

      if (isInsert && outlinePanel) {
        event.preventDefault();
        event.stopPropagation();
        outlinePanel.duplicateField(selected.id);
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    eventBus.on('diagram.destroy', () => {
      document.removeEventListener('keydown', this._onKeyDown);
    });
  }
}

export const ShortcutModule = {
  __init__: ['shortcutService'],
  shortcutService: ['type', ShortcutService as unknown as new (...args: unknown[]) => unknown],
};
