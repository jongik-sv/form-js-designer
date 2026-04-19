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
import { applyRowHeight } from './RowLayoutHeightApplier';
import type { FormLayouterLike } from './RowLayoutHeightApplier';

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
}

interface FormFieldRegistryLike {
  getAll(): ApplierField[];
}

/**
 * LayoutHeightService — DI 서비스 클래스.
 * $inject: ['eventBus', 'formFieldRegistry', 'formLayouter']
 * formLayouter는 optional (viewer에 없을 수 있음)
 */
export class LayoutHeightService {
  static $inject = ['eventBus', 'formFieldRegistry', 'formLayouter'];

  private readonly eventBus: EventBusLike;
  private readonly formFieldRegistry: FormFieldRegistryLike;
  private readonly formLayouter: FormLayouterLike | undefined;
  // form-js config.container 또는 fallback
  private readonly root: ParentNode;

  constructor(
    eventBus: EventBusLike,
    formFieldRegistry: FormFieldRegistryLike,
    formLayouter?: FormLayouterLike,
  ) {
    this.eventBus = eventBus;
    this.formFieldRegistry = formFieldRegistry;
    this.formLayouter = formLayouter;

    // DOM root: .fjs-container 우선, 없으면 document fallback
    this.root = (
      typeof document !== 'undefined'
        ? (document.querySelector('.fjs-container') ?? document)
        : null
    ) as ParentNode;

    this._registerHooks();
  }

  private _registerHooks(): void {
    // 즉시 적용 이벤트
    for (const event of [
      'import.done',
      'elements.changed',
      'commandStack.formField.edit.postExecuted',
      'commandStack.formField.remove.postExecuted',
      'form.layoutCalculated',
    ]) {
      this.eventBus.on(event, () => this._applyAll());
    }

    // formField.add 는 DOM insert 전에 발화할 수 있으므로 rAF 지연
    this.eventBus.on('formField.add', () => {
      const schedule =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
      schedule(() => this._applyAll());
    });
  }

  private _applyAll(): void {
    const fields = this.formFieldRegistry.getAll();
    applyLayoutHeight(this.root, fields);
    applyRowHeight(this.root, fields, this.formLayouter);
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
