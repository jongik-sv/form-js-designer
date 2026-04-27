/**
 * ValidateService — TSK-06-02
 *
 * DI 주입: formEditor, formFieldRegistry, eventBus
 * validate(schema?) → ValidationResult를 designer-core의 validateFormSchema에 위임하고
 * 결과를 eventBus.fire('designer.validate.done') 로 발화한다.
 */

import { validateFormSchema } from '@form-js-designer/designer-core';
import type { ValidationResult } from '@form-js-designer/designer-core';

interface FormEditorLike {
  getSchema(): Record<string, unknown>;
}

interface RegistryLike {
  get(type: string): unknown;
}

interface EventBusLike {
  fire(event: string, ...args: unknown[]): void;
}

export class ValidateService {
  static $inject = ['formEditor', 'formFieldRegistry', 'eventBus'];

  private readonly formEditor: FormEditorLike;
  private readonly registry: RegistryLike;
  private readonly eventBus: EventBusLike;

  constructor(
    formEditor: FormEditorLike,
    formFieldRegistry: RegistryLike,
    eventBus: EventBusLike,
  ) {
    this.formEditor = formEditor;
    this.registry = formFieldRegistry;
    this.eventBus = eventBus;
  }

  /**
   * 스키마를 검증하여 ValidationResult를 반환한다.
   * schema 미지정 시 formEditor.getSchema()를 사용한다.
   */
  validate(schema?: Record<string, unknown>): ValidationResult {
    const targetSchema = schema ?? this.formEditor.getSchema();
    const result = validateFormSchema(
      targetSchema,
      this.registry as Parameters<typeof validateFormSchema>[1],
    );
    this.eventBus.fire('designer.validate.done', result);
    return result;
  }
}
