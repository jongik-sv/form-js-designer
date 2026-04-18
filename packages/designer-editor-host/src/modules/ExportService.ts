/**
 * ExportService — TSK-06-02
 *
 * DI 주입: formEditor, validate
 * - downloadJson(): 현재 스키마를 JSON 파일로 다운로드
 * - buildPublishCommand(target, url?): designer-cli publish 명령 문자열 반환
 */

import type { ValidationResult } from '@form-js-designer/designer-core';

interface FormEditorLike {
  getSchema(): Record<string, unknown>;
}

interface ValidateServiceLike {
  validate(schema?: Record<string, unknown>): ValidationResult;
}

export class ExportService {
  static inject = ['formEditor', 'validate'];

  private readonly formEditor: FormEditorLike;
  private readonly validateService: ValidateServiceLike;

  constructor(formEditor: FormEditorLike, validate: ValidateServiceLike) {
    this.formEditor = formEditor;
    this.validateService = validate;
  }

  /**
   * 스키마 id를 파일명 기반 문자열로 반환하는 헬퍼.
   */
  private _schemaFilename(schema: Record<string, unknown>): string {
    return `${(schema['id'] as string | undefined) ?? 'form'}.schema.json`;
  }

  /**
   * 현재 스키마를 JSON 파일로 다운로드한다.
   * Validate 실패 시 confirm 다이얼로그 후 사용자 동의 시에만 진행.
   */
  downloadJson(): void {
    const schema = this.formEditor.getSchema();
    const result = this.validateService.validate(schema);

    if (!result.ok) {
      const confirmed = window.confirm(
        `검증 오류가 ${result.errors.length}건 있습니다. 그래도 내보내시겠습니까?`,
      );
      if (!confirmed) return;
    }

    try {
      const filename = this._schemaFilename(schema);
      const json = JSON.stringify(schema, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a') as HTMLAnchorElement;
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ExportService] downloadJson 실패:', err);
      throw err;
    }
  }

  /**
   * designer-cli publish 명령 문자열을 생성하여 반환한다.
   * Clipboard 복사는 컴포넌트 레이어에서 수행한다.
   */
  buildPublishCommand(target: 'static' | 'api', url?: string): string {
    const schema = this.formEditor.getSchema();
    const filename = this._schemaFilename(schema);
    let cmd = `designer-cli publish ${filename} --target ${target}`;
    if (url) {
      cmd += ` --url ${url}`;
    }
    return cmd;
  }
}
