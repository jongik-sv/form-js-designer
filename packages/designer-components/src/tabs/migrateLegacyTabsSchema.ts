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

function convertTabsNode(node: LegacyTabsNode): LegacyTabsNode {
  if (isNewTabsFormat(node)) {
    // 재귀는 여전히 필요 (자식 components 안의 중첩 tabs)
    const newComponents = Array.isArray(node.components)
      ? node.components.map((c) => migrateNode(c as Record<string, unknown>))
      : [];
    if (newComponents === node.components) return node;
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
