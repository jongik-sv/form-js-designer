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
 * form-js `Form` / `FormEditor` 인스턴스의 공통 shape. 두 클래스 모두
 * `_container` 를 갖는 `.fjs-container` div 를 들고 있고, 해당 인스턴스가
 * 담당하는 form 의 root DOM 노드다. editor 와 preview 가 같은 페이지에
 * 공존할 때 document 전역 selector 는 첫 번째 인스턴스만 집어서 preview
 * 쪽에 style 이 주입되지 않는다 — per-instance root 로 분리.
 */
interface FormLike {
  _container?: HTMLElement | null;
  /** form-js Form/FormEditor 모두 public `_id` 를 노출한다 (Ids.next()). */
  _id?: string;
}

interface InjectorLike {
  get<T = unknown>(name: string, strict?: boolean): T | null;
}

/**
 * LayoutHeightService — DI 서비스 클래스.
 * $inject: ['eventBus', 'formFieldRegistry', 'injector']
 *
 * 'form' DI 는 form-js-viewer 에만 등록되어 있고 form-js-editor 는
 * 'formEditor' 로 등록한다. 둘 다 `_container` 를 노출하므로 injector 에서
 * strict=false 로 둘 중 먼저 발견되는 것을 쓴다 — 양쪽 컨텍스트에서 안전.
 */
export class LayoutHeightService {
  static $inject = ['eventBus', 'formFieldRegistry', 'injector'];

  private readonly eventBus: EventBusLike;
  private readonly formFieldRegistry: FormFieldRegistryLike;
  private readonly formLike: FormLike | null;

  constructor(
    eventBus: EventBusLike,
    formFieldRegistry: FormFieldRegistryLike,
    injector: InjectorLike,
  ) {
    this.eventBus = eventBus;
    this.formFieldRegistry = formFieldRegistry;
    this.formLike =
      (injector.get<FormLike>('form', false) ??
        injector.get<FormLike>('formEditor', false)) || null;

    this._registerHooks();
  }

  /**
   * 이 서비스 인스턴스가 담당하는 form 의 DOM root 를 매 apply 마다 resolve.
   * form._container 가 attach 전이거나 없으면 document 로 fallback.
   * 주의: 전역 selector('.fjs-container') 는 페이지에 form 인스턴스가
   * 여러 개 있을 때 엉뚱한 트리를 가리키므로 쓰지 않는다.
   */
  private _resolveRoot(): ParentNode {
    const container = this.formLike?._container ?? null;
    if (container) return container;
    return typeof document !== 'undefined' ? document : ({} as ParentNode);
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
    applyLayoutHeight(this._resolveRoot(), fields, this.formLike?._id);
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
