/**
 * NestedFieldRegistrar — form-js CommandInterceptor.
 *
 * form-js의 기본 `AddFormFieldHandler`는 `modeling.addFormField(attrs, parent, index)`로
 * 추가된 field의 `components[]` 자식을 `formFieldRegistry`에 재귀적으로 등록하지
 * 않는다 (Importer만 재귀 등록). 이 때문에 Tabs.create()가 tabPanel 자식 2개를
 * 포함한 채 드롭되면:
 *
 *   formFieldRegistry: { Form, tabs }   ← tabPanel 누락
 *
 * 상태가 되어 form-js dragula drop routing이 drop target의 data-id로 tabPanel을
 * 역조회할 때 실패하고, 드롭된 field가 tabs.components[]에 sibling으로 붙는다.
 *
 * 본 인터셉터는 `commandStack.formField.add.postExecuted` hook에서 방금 추가된
 * field의 자식을 재귀적으로 registry에 등록한다. undo(revert) 시에도 재귀적으로
 * 등록 해제한다.
 *
 * 구현 참조: form-js-viewer Importer.importFormField (재귀 등록 패턴),
 *            form-js-editor RemoveFormFieldHandler (runRecursively 제거 패턴).
 */

interface AnyField {
  id: string;
  type: string;
  _parent?: string;
  components?: AnyField[];
}

interface EventBus {
  on: (event: string, handler: (e: unknown) => void) => void;
}

interface FormFieldRegistry {
  add: (field: AnyField) => void;
  remove: (field: AnyField) => void;
  get: (id: string) => AnyField | undefined;
  _ids: {
    claim: (id: string, field: AnyField) => void;
    unclaim: (id: string) => void;
    assigned: (id: string) => boolean;
  };
}

interface CommandContext {
  formField: AnyField;
}

interface CommandEvent {
  context: CommandContext;
}

export class NestedFieldRegistrar {
  private readonly _formFieldRegistry: FormFieldRegistry;

  constructor(eventBus: EventBus, formFieldRegistry: FormFieldRegistry) {
    this._formFieldRegistry = formFieldRegistry;

    eventBus.on('commandStack.formField.add.postExecuted', (e: unknown) => {
      const event = e as CommandEvent;
      this._registerRecursive(event.context.formField);
    });

    eventBus.on('commandStack.formField.add.reverted', (e: unknown) => {
      const event = e as CommandEvent;
      this._unregisterRecursive(event.context.formField);
    });
  }

  /** 추가된 field의 자식을 재귀적으로 registry에 등록. 최상위 field는 이미 등록됨. */
  private _registerRecursive(parent: AnyField): void {
    const children = parent.components;
    if (!Array.isArray(children) || children.length === 0) return;

    for (const child of children) {
      if (!child || typeof child.id !== 'string') continue;

      if (!this._formFieldRegistry.get(child.id)) {
        child._parent = parent.id;
        if (!this._formFieldRegistry._ids.assigned(child.id)) {
          this._formFieldRegistry._ids.claim(child.id, child);
        }
        this._formFieldRegistry.add(child);
      }

      this._registerRecursive(child);
    }
  }

  /** undo 시 자식을 재귀적으로 registry에서 제거. 최상위는 Handler.revert가 처리. */
  private _unregisterRecursive(parent: AnyField): void {
    const children = parent.components;
    if (!Array.isArray(children) || children.length === 0) return;

    for (const child of children) {
      if (!child || typeof child.id !== 'string') continue;
      this._unregisterRecursive(child);
      if (this._formFieldRegistry.get(child.id)) {
        this._formFieldRegistry.remove(child);
        if (this._formFieldRegistry._ids.assigned(child.id)) {
          this._formFieldRegistry._ids.unclaim(child.id);
        }
      }
    }
  }
}

(NestedFieldRegistrar as unknown as { $inject: string[] }).$inject = [
  'eventBus',
  'formFieldRegistry',
];
