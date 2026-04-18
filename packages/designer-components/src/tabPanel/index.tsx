/**
 * TabPanelComponent — tabs-tabpanel-refactor
 *
 * Tabs 필드의 자식 전용 internal component.
 * - escapeGridRender: false — DesignerFormLayouter가 row 추적 대상으로 인식
 * - group: 'container' — container 계약 준수
 * - keyed: false, pathed: false — 데이터 바인딩 없음
 * - render: <ChildrenSlot field={field} /> 만 반환 (Tabs가 직접 렌더)
 * - 팔레트에서 숨김: module.ts의 Proxy가 ownKeys에서 제외
 */
import { h } from 'preact';
import { defineComponent, ChildrenSlot } from '@form-js-designer/designer-core';
import type { PureRenderProps, FieldSchema } from '@form-js-designer/designer-core';
import { tabPanelPropsSchema } from './propsSchema';
import { tabPanelId } from '../tabs/uuid';
import './TabPanel.css';

void h;

export interface TabPanelSchema extends FieldSchema {
  type: 'tabPanel';
  label: string;
  components: Array<{ id: string } & Record<string, unknown>>;
}

function TabPanelRender(props: PureRenderProps<TabPanelSchema>) {
  const field = props.field as TabPanelSchema;
  // render는 outline/독립 편집 등 다른 경로를 위한 안전장치.
  // Tabs.tsx 내부에서는 ChildrenSlot을 직접 호출하므로 이중 렌더 없음.
  return <ChildrenSlot field={field} />;
}

export const TabPanelComponent = defineComponent<TabPanelSchema>({
  type: 'tabPanel',
  name: '탭 패널',
  group: 'container',
  keyed: false,
  pathed: false,
  escapeGridRender: false,
  propsSchema: tabPanelPropsSchema,
  create: (options = {}) => {
    const id = (options.id as string | undefined) ?? tabPanelId();
    const label = (options.label as string | undefined) ?? 'Tab';
    return {
      components: [],
      ...options,
      id,
      type: 'tabPanel',
      label,
    };
  },
  render: TabPanelRender,
});
