/**
 * validate 모듈 타입 — TSK-06-02
 * designer-core와 designer-cli가 공유하는 검증 결과 타입
 */

export interface ValidationError {
  /** JSON path to the field (e.g. "components[0].title") */
  path: string;
  /** Error code (e.g. "UNKNOWN_COMPONENT_TYPE", "INVALID_PROPS") */
  code: string;
  /** Human-readable message */
  message: string;
}

export interface ValidationWarning {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
