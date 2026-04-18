/**
 * TableIcon — 팔레트 전용 SVG 아이콘.
 *
 * designer-components/src/icons 의 형제 아이콘들과 동일한 규약:
 *  - viewBox="0 0 54 54"
 *  - currentColor 사용 (팔레트 CSS 상속)
 *  - `h(Icon, { class, width, height, viewBox })` 경로에서 props가 기본값을 override
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

export const TableIcon: ComponentType<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={54}
    height={54}
    viewBox="0 0 54 54"
    fill="none"
    {...props}
  >
    <rect
      x={7}
      y={11}
      width={40}
      height={32}
      rx={2}
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect
      x={7}
      y={11}
      width={40}
      height={9}
      fill="currentColor"
      fillOpacity={0.15}
    />
    <line x1={7} y1={20} x2={47} y2={20} stroke="currentColor" strokeWidth={2} />
    <line x1={7} y1={30} x2={47} y2={30} stroke="currentColor" strokeWidth={1.5} />
    <line x1={20} y1={11} x2={20} y2={43} stroke="currentColor" strokeWidth={1.5} />
    <line x1={34} y1={11} x2={34} y2={43} stroke="currentColor" strokeWidth={1.5} />
  </svg>
);
