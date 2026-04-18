/**
 * CLIRegistry — CLI 전용 컴포넌트 타입 레지스트리 인터페이스
 *
 * 브라우저 의존(Preact, DOM)을 제거한 순수 Node.js 정적 맵.
 * 에디터 측 formFieldRegistry와 동일한 검증 결과를 보장하기 위해
 * 동일한 컴포넌트 type 목록을 정적으로 등록한다.
 */
export interface CLIRegistry {
  /** 등록된 컴포넌트 type인지 확인 */
  has(type: string): boolean;
}
