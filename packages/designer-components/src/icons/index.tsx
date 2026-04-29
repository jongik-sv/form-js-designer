/**
 * Palette icons for designer components.
 *
 * form-js Palette (FieldDragPreview) renders each icon with
 * `h(Icon, { class, width, height, viewBox })`. The outer svg spreads
 * incoming props last so palette overrides our defaults
 * (width=54 → 36, preserves viewBox).
 *
 * Style 규약 (form-js SvgButton/SvgTable 와 동일):
 *  - viewBox="0 0 54 54"
 *  - fill/stroke 색상은 currentColor — 팔레트 CSS 에 맞춰 상속
 *  - 단일 파일 export, Preact ComponentType 시그니처
 */
import { h } from 'preact';
import type { ComponentType } from 'preact';

void h;

export interface IconProps {
  class?: string;
  width?: number | string;
  height?: number | string;
  viewBox?: string;
}

const SVG_BASE = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 54,
  height: 54,
  viewBox: '0 0 54 54',
  fill: 'none',
} as const;

export const CardIcon: ComponentType<IconProps> = (props) => (
  <svg {...SVG_BASE} {...props}>
    <rect
      x={8}
      y={10}
      width={38}
      height={34}
      rx={3}
      stroke="currentColor"
      strokeWidth={2}
    />
    <line
      x1={8}
      y1={20}
      x2={46}
      y2={20}
      stroke="currentColor"
      strokeWidth={2}
    />
    <line
      x1={14}
      y1={28}
      x2={40}
      y2={28}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <line
      x1={14}
      y1={34}
      x2={34}
      y2={34}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

export const TabsIcon: ComponentType<IconProps> = (props) => (
  <svg {...SVG_BASE} {...props}>
    <rect
      x={6}
      y={18}
      width={42}
      height={26}
      rx={2}
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect
      x={8}
      y={10}
      width={12}
      height={10}
      rx={2}
      fill="currentColor"
      fillOpacity={0.2}
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect
      x={22}
      y={12}
      width={12}
      height={8}
      rx={2}
      stroke="currentColor"
      strokeWidth={1.5}
    />
    <rect
      x={36}
      y={12}
      width={12}
      height={8}
      rx={2}
      stroke="currentColor"
      strokeWidth={1.5}
    />
  </svg>
);

export const ModalIcon: ComponentType<IconProps> = (props) => (
  <svg {...SVG_BASE} {...props}>
    <rect
      x={3}
      y={6}
      width={48}
      height={42}
      rx={2}
      fill="currentColor"
      fillOpacity={0.08}
    />
    <rect
      x={10}
      y={12}
      width={34}
      height={30}
      rx={3}
      fill="currentColor"
      fillOpacity={0.08}
      stroke="currentColor"
      strokeWidth={2}
    />
    <line
      x1={10}
      y1={21}
      x2={44}
      y2={21}
      stroke="currentColor"
      strokeWidth={2}
    />
    <line
      x1={36}
      y1={15}
      x2={40}
      y2={19}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <line
      x1={40}
      y1={15}
      x2={36}
      y2={19}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

export const ChartIcon: ComponentType<IconProps> = (props) => (
  <svg {...SVG_BASE} {...props}>
    {/* 축 */}
    <line
      x1={10}
      y1={44}
      x2={46}
      y2={44}
      stroke="currentColor"
      strokeWidth={2}
    />
    <line
      x1={10}
      y1={10}
      x2={10}
      y2={44}
      stroke="currentColor"
      strokeWidth={2}
    />
    {/* 막대 3개 */}
    <rect
      x={16}
      y={28}
      width={6}
      height={14}
      fill="currentColor"
      fillOpacity={0.6}
    />
    <rect
      x={26}
      y={20}
      width={6}
      height={22}
      fill="currentColor"
      fillOpacity={0.4}
    />
    <rect
      x={36}
      y={32}
      width={6}
      height={10}
      fill="currentColor"
      fillOpacity={0.8}
    />
  </svg>
);

