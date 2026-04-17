/**
 * PanelWidgetRegistry — 위젯 레지스트리
 *
 * Map<string, PanelWidget<any>> 래퍼.
 * register / get / has / list API 제공.
 * createDefaultRegistry() 팩토리로 기본 8종 선등록 인스턴스 생성.
 */
import type { PanelWidget } from './types';
import { DuplicateWidgetError } from './types';
import { BUILTIN_WIDGETS } from './widgets/index';

export interface RegisterOptions {
  /** true 이면 이미 등록된 type을 덮어씀 (기본: false → throw) */
  overwrite?: boolean;
}

export class PanelWidgetRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly map = new Map<string, PanelWidget<any>>();

  /**
   * 위젯을 레지스트리에 등록한다.
   * @throws DuplicateWidgetError — 이미 등록된 type을 overwrite 없이 재등록 시
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(type: string, widget: PanelWidget<any>, options?: RegisterOptions): void {
    if (this.map.has(type) && !options?.overwrite) {
      throw new DuplicateWidgetError(type);
    }
    this.map.set(type, widget);
  }

  /**
   * 등록된 위젯을 조회한다.
   * @returns 위젯 인스턴스 또는 undefined (미등록 시)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(type: string): PanelWidget<any> | undefined {
    return this.map.get(type);
  }

  /**
   * type이 등록되어 있으면 true
   */
  has(type: string): boolean {
    return this.map.has(type);
  }

  /**
   * 등록된 모든 type 목록 반환 (삽입 순)
   */
  list(): readonly string[] {
    return Array.from(this.map.keys());
  }
}

/**
 * 기본 8종 위젯이 선등록된 PanelWidgetRegistry 인스턴스를 반환한다.
 * 호스트 앱은 이 인스턴스에 추가로 register() 하거나,
 * overwrite: true 로 기본 위젯을 교체할 수 있다 (AC #7 커스터마이징).
 */
export function createDefaultRegistry(): PanelWidgetRegistry {
  const registry = new PanelWidgetRegistry();
  for (const [type, widget] of Object.entries(BUILTIN_WIDGETS)) {
    registry.register(type, widget);
  }
  return registry;
}
