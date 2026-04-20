/**
 * LayoutHeightModule — form-js additionalModules 매니페스트 (TSK-12-02)
 *
 * designer/viewer 양쪽에 주입 가능한 단일 모듈.
 * import.done / formField.add / elements.changed / commandStack.formField.edit.postExecuted
 * 이벤트 훅에서 layout.height를 DOM inline style로 주입한다.
 *
 * editor-only 이벤트(commandStack.*)는 viewer에서 발화되지 않지만
 * 구독 자체는 무해하므로 단일 서비스로 양용한다.
 */

import { applyLayoutHeight } from './LayoutHeightApplier';
import type { ApplierField } from './LayoutHeightApplier';

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
}

interface FormFieldRegistryLike {
  getAll(): ApplierField[];
}

/**
 * LayoutHeightService — DI 서비스 클래스.
 * $inject: ['eventBus', 'formFieldRegistry']
 */
export class LayoutHeightService {
  static $inject = ['eventBus', 'formFieldRegistry'];

  private readonly eventBus: EventBusLike;
  private readonly formFieldRegistry: FormFieldRegistryLike;
  // form-js config.container 또는 fallback
  private readonly root: ParentNode;

  constructor(
    eventBus: EventBusLike,
    formFieldRegistry: FormFieldRegistryLike,
  ) {
    this.eventBus = eventBus;
    this.formFieldRegistry = formFieldRegistry;

    // DOM root: .fjs-container 우선, 없으면 document fallback
    this.root = (
      typeof document !== 'undefined'
        ? (document.querySelector('.fjs-container') ?? document)
        : null
    ) as ParentNode;

    this._registerHooks();
  }

  private _registerHooks(): void {
    const scheduleApply = () => {
      const schedule =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
      schedule(() => this._applyAll());
    };

    // 즉시 적용 이벤트 (DOM이 이미 업데이트된 이후 발화)
    for (const event of [
      'import.done',
      'elements.changed',
      'form.layoutCalculated',
    ]) {
      this.eventBus.on(event, () => this._applyAll());
    }

    // editor에서 edit.postExecuted 직후 Preact가 field DOM을 재렌더하며 inline style을 덮어쓸 수 있다.
    // 즉시 1회 적용(viewer / 테스트 호환) + rAF 1회 적용(rerender 이후 복원)으로 양쪽 모두 보장.
    this.eventBus.on('commandStack.formField.edit.postExecuted', () => {
      this._applyAll();
      scheduleApply();
    });

    // remove / add 는 DOM insert/remove 전에 발화할 수 있으므로 rAF 지연
    // remove.postExecuted: formLayouter._rows 갱신이 이벤트 이후에 완료될 수 있음
    for (const event of [
      'commandStack.formField.remove.postExecuted',
      'formField.add',
    ]) {
      this.eventBus.on(event, scheduleApply);
    }
  }

  private _applyAll(): void {
    const fields = this.formFieldRegistry.getAll();
    applyLayoutHeight(this.root, fields);
  }
}

/**
 * form-js additionalModules 규약 매니페스트
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LayoutHeightModule = {
  __init__: ['layoutHeightService'],
  layoutHeightService: ['type', LayoutHeightService as any],
};
