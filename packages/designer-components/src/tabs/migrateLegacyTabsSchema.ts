/**
 * migrateLegacyTabsSchema — 기존 tabs[] 스키마를 신 tabPanel 구조로 변환
 *
 * - Pure function: 원본 객체를 변형하지 않고 새 객체를 반환
 * - Idempotent: 이미 신포맷인 스키마에 대해 no-op
 * - 재귀적: 중첩 components 내 tabs 필드도 변환
 */
import { tabPanelId } from './uuid';

interface LegacyTabItem {
  value: string;
  label: string;
  components?: Array<{ id: string } & Record<string, unknown>>;
}

interface TabPanelField {
  id: string;
  type: 'tabPanel';
  label: string;
  components: Array<{ id: string } & Record<string, unknown>>;
}

interface LegacyTabsNode extends Record<string, unknown> {
  type: 'tabs';
  tabs?: LegacyTabItem[];
  components?: Array<{ id: string } & Record<string, unknown>>;
  defaultValue?: string;
  /** Legacy tabs-specific height — migrated to layout.height. */
  tabHeight?: number;
  layout?: { height?: number; [key: string]: unknown };
}

/**
 * tabHeight 는 tabs 컴포넌트 전용 구 필드. 통합 height 시스템(layout.height)로 옮기고
 * 원본에서 제거한다. tabHeight 가 양수이고 layout.height 가 비어있으면 흡수한다.
 * 0(legacy "부모 꽉 채움") 이나 음수/NaN 은 드롭한다 — 현재 layout 시스템에는
 * 1:1 대응이 없으므로 사용자가 재설정하게 둔다.
 */
function absorbLegacyTabHeight(node: LegacyTabsNode): LegacyTabsNode {
  if (!('tabHeight' in node)) return node;
  const { tabHeight, ...rest } = node;
  const existingHeight = rest.layout?.height;
  const shouldAbsorb =
    typeof tabHeight === 'number' &&
    Number.isFinite(tabHeight) &&
    tabHeight > 0 &&
    existingHeight === undefined;
  if (shouldAbsorb) {
    return {
      ...rest,
      layout: { ...(rest.layout ?? {}), height: tabHeight },
    };
  }
  return rest as LegacyTabsNode;
}

function isNewTabsFormat(node: LegacyTabsNode): boolean {
  // 신포맷: components 배열의 첫 항목이 type: 'tabPanel' 이면 이미 변환된 것
  if (
    Array.isArray(node.components) &&
    node.components.length > 0 &&
    (node.components[0] as { type?: string }).type === 'tabPanel'
  ) {
    return true;
  }
  // 빈 components 이고 tabs도 없으면 신포맷으로 간주 (no-op)
  if (!Array.isArray(node.tabs) || node.tabs.length === 0) {
    return true;
  }
  return false;
}

function convertTabsNode(input: LegacyTabsNode): LegacyTabsNode {
  // 1단계: tabHeight → layout.height 흡수 및 tabHeight 제거 (신/구 포맷 공통)
  const node = absorbLegacyTabHeight(input);

  if (isNewTabsFormat(node)) {
    // 재귀는 여전히 필요 (자식 components 안의 중첩 tabs)
    const newComponents = Array.isArray(node.components)
      ? node.components.map((c) => migrateNode(c as Record<string, unknown>))
      : [];
    if (node === input && newComponents === input.components) return input;
    return { ...node, components: newComponents as Array<{ id: string } & Record<string, unknown>> };
  }

  const tabs = node.tabs as LegacyTabItem[];
  // value → new tabPanel id 매핑 테이블
  const valueToId = new Map<string, string>();
  const tabPanels: TabPanelField[] = tabs.map((tab) => {
    const id = tabPanelId();
    valueToId.set(tab.value, id);
    return {
      id,
      type: 'tabPanel',
      label: tab.label,
      components: (tab.components ?? []).map((c) => migrateNode(c as Record<string, unknown>)) as Array<{ id: string } & Record<string, unknown>>,
    };
  });

  // defaultValue 매핑
  let defaultValue: string | undefined;
  if (node.defaultValue && valueToId.has(node.defaultValue)) {
    defaultValue = valueToId.get(node.defaultValue);
  } else {
    defaultValue = tabPanels[0]?.id;
  }

  // tabs[] 제거, components로 교체
  const { tabs: _removed, ...rest } = node;
  void _removed;
  return {
    ...rest,
    components: tabPanels as unknown as Array<{ id: string } & Record<string, unknown>>,
    defaultValue,
  };
}

function migrateNode(node: Record<string, unknown>): Record<string, unknown> {
  if (!node || typeof node !== 'object') return node;

  if (node.type === 'tabs') {
    const converted = convertTabsNode(node as LegacyTabsNode);
    return converted as Record<string, unknown>;
  }

  // 자식 components 재귀 처리
  if (Array.isArray(node.components)) {
    const newComponents = (node.components as Array<Record<string, unknown>>).map(migrateNode);
    const changed = newComponents.some((c, i) => c !== (node.components as Array<Record<string, unknown>>)[i]);
    if (changed) {
      return { ...node, components: newComponents };
    }
  }

  return node;
}

/**
 * migrateLegacyTabsSchema<T>(schema: T): T
 *
 * schema가 tabs[] 구조를 가진 경우 tabPanel 구조로 변환하여 반환.
 * 원본 객체를 변형하지 않는다 (pure).
 */
export function migrateLegacyTabsSchema<T>(schema: T): T {
  if (!schema || typeof schema !== 'object') return schema;
  return migrateNode(schema as Record<string, unknown>) as unknown as T;
}
