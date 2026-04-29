/**
 * chartCatalog — chartPlaceholder 11종 SVG 카탈로그 (Single Source of Truth)
 *
 * 각 차트 타입은 fullSvg(viewBox 0 0 320 180, 16:9)와
 * thumbnailSvg(viewBox 0 0 24 24)를 가진다. 색상은 모두 currentColor,
 * 톤은 fill-opacity 4단계(0.15 / 0.35 / 0.6 / 1)만 사용.
 *
 * 자산 작성 규약은 docs/designer/features/chart-placeholder/svg-style-guide.md 참고.
 *
 * v1: thumbnailSvg는 정의만 하고 미사용 — v2 팔레트 미리보기/select 옵션 아이콘 대비.
 */

// -----------------------------------------------------------------------------
// 환경 감지 (private helper) — designer-core가 isProductionEnv를 외부 export 하지
// 않으므로(기존 designer-i18n / designer-runtime도 각자 inline) 여기서도 동일 패턴
// 으로 인라인 헬퍼를 둔다. dev 환경에서만 console.warn 1회 출력하기 위함.
// -----------------------------------------------------------------------------
// TODO(designer-core export): designer-core가 isProductionEnv를 export하면
// 아래 인라인 헬퍼를 `import { isProductionEnv } from '@form-js-designer/designer-core'`로 교체한다.
// 동일 패턴이 다음 파일에도 있어 일괄 마이그레이션 대상:
//   - packages/designer-i18n/src/envUtils.ts
//   - packages/designer-runtime/src/watermark/WatermarkMonitor.ts
function isProductionEnv(): boolean {
  const meta = (import.meta as { env?: { PROD?: boolean } }).env;
  if (meta !== undefined) {
    return meta.PROD === true;
  }
  if (typeof process !== 'undefined' && process.env != null) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'stackedBar'
  | 'horizontalBar'
  | 'gauge'
  | 'heatmap'
  | 'treemap';

export interface ChartCatalogEntry {
  type: ChartType;
  /** enum select 옵션 라벨 (한국어) */
  koLabel: string;
  /** 16~24px용 단순화 SVG (현재 미사용 — v2 팔레트 미리보기) */
  thumbnailSvg: string;
  /** 캔버스/런타임 표시용 16:9 SVG */
  fullSvg: string;
}

// =============================================================================
// SVG 자산 22장
// 작성 순서: bar → line → pie → donut → area → scatter → stackedBar
// → horizontalBar → gauge → heatmap → treemap (각 full + thumb)
// =============================================================================

// 1) bar -----------------------------------------------------------------------
// 막대 5 + baseline (style-guide §5.1 sample)
const BAR_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="38"  y="100" width="36" height="60"  fill-opacity="0.6" />
  <rect x="90"  y="70"  width="36" height="90"  fill-opacity="0.6" />
  <rect x="142" y="90"  width="36" height="70"  fill-opacity="0.6" />
  <rect x="194" y="50"  width="36" height="110" fill-opacity="0.6" />
  <rect x="246" y="75"  width="36" height="85"  fill-opacity="0.6" />
</svg>`;

// 막대 3 + baseline (style-guide §5.2 sample)
const BAR_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="4"  y="10" width="4" height="10" fill-opacity="0.6" />
  <rect x="10" y="6"  width="4" height="14" fill-opacity="0.6" />
  <rect x="16" y="12" width="4" height="8"  fill-opacity="0.6" />
</svg>`;

// 2) line ----------------------------------------------------------------------
// 단일 절선 1개(꼭지점 5: 평탄+상승+하강+상승) + baseline
const LINE_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <polyline points="38,120 110,90 160,110 230,55 282,80"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

// 단일 곡선(꼭지점 3) — 단순화
const LINE_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <polyline points="4,16 12,8 20,12"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

// 3) pie -----------------------------------------------------------------------
// 원 + 1 슬라이스 강조(우상단). 중심 (160, 90), r=70.
// 강조 슬라이스: 12시(160,20) → 호로 약 4시 방향(225,123)까지 ≈ 약 130도.
const PIE_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <circle cx="160" cy="90" r="70" fill-opacity="0.15" />
  <path d="M 160 90 L 160 20 A 70 70 0 0 1 225 123 Z" fill-opacity="0.6" />
</svg>`;

// thumb: 원 + 1 슬라이스 강조. 중심 (12,12), r=9.
const PIE_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="9" fill-opacity="0.15" />
  <path d="M 12 12 L 12 3 A 9 9 0 0 1 20 16 Z" fill-opacity="0.6" />
</svg>`;

// 4) donut ---------------------------------------------------------------------
// 도넛 링 + 1 강조 조각 (구멍 r=35, 외경 r=70, 중심 (160,90))
// 두 동심원으로 링을 만들 수 없으니 evenodd 트릭 대신 stroke 두께로 표현.
// 외곽 링: stroke-width 24, r=58 → 외경 70, 내경 46. (시각적 도넛)
// 강조 조각: 같은 stroke 폭, dasharray 일부만 채움.
// 단순화를 위해 원형 stroke + 강조 path arc 사용.
const DONUT_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <circle cx="160" cy="90" r="58" fill="none" stroke="currentColor" stroke-width="24" stroke-opacity="0.15" />
  <path d="M 160 32 A 58 58 0 0 1 215 116" fill="none" stroke="currentColor" stroke-width="24" stroke-opacity="0.6" stroke-linecap="butt" />
</svg>`;

// thumb: stroke-width 4, r=7, 중심(12,12)
const DONUT_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.15" />
  <path d="M 12 5 A 7 7 0 0 1 18.5 14.5" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.6" stroke-linecap="butt" />
</svg>`;

// 5) area ----------------------------------------------------------------------
// 단일 영역(채움 0.35) + 그 위 stroke + baseline
const AREA_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <path d="M 38 130 L 110 95 L 160 110 L 230 60 L 282 85 L 282 160 L 38 160 Z"
    fill-opacity="0.35" />
  <polyline points="38,130 110,95 160,110 230,60 282,85"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

// thumb: 단순 영역 + baseline
const AREA_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <path d="M 4 16 L 12 8 L 20 12 L 20 20 L 4 20 Z" fill-opacity="0.35" />
  <polyline points="4,16 12,8 20,12"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

// 6) scatter -------------------------------------------------------------------
// 점 10개 산포(살짝 우상향) + baseline + 좌측축. r=3.
const SCATTER_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <line x1="20" y1="20"  x2="20"  y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <circle cx="50"  cy="135" r="3" fill-opacity="0.6" />
  <circle cx="75"  cy="125" r="3" fill-opacity="0.6" />
  <circle cx="100" cy="115" r="3" fill-opacity="0.6" />
  <circle cx="125" cy="120" r="3" fill-opacity="0.6" />
  <circle cx="150" cy="100" r="3" fill-opacity="0.6" />
  <circle cx="175" cy="95"  r="3" fill-opacity="0.6" />
  <circle cx="200" cy="105" r="3" fill-opacity="0.6" />
  <circle cx="225" cy="80"  r="3" fill-opacity="0.6" />
  <circle cx="250" cy="70"  r="3" fill-opacity="0.6" />
  <circle cx="275" cy="60"  r="3" fill-opacity="0.6" />
</svg>`;

// thumb: 점 5개. r=1.2.
const SCATTER_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <line x1="2" y1="4"  x2="2"  y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <circle cx="6"  cy="16" r="1.2" fill-opacity="0.6" />
  <circle cx="10" cy="13" r="1.2" fill-opacity="0.6" />
  <circle cx="14" cy="10" r="1.2" fill-opacity="0.6" />
  <circle cx="17" cy="11" r="1.2" fill-opacity="0.6" />
  <circle cx="20" cy="6"  r="1.2" fill-opacity="0.6" />
</svg>`;

// 7) stackedBar ----------------------------------------------------------------
// 세로 막대 5개. 각 막대 2단(하단 0.35 + 상단 0.6) + baseline.
// bar full과 동일 좌표(폭 36, 간격 16, 좌마진 38)
const STACKED_BAR_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="38"  y="125" width="36" height="35" fill-opacity="0.35" />
  <rect x="38"  y="100" width="36" height="25" fill-opacity="0.6" />
  <rect x="90"  y="115" width="36" height="45" fill-opacity="0.35" />
  <rect x="90"  y="70"  width="36" height="45" fill-opacity="0.6" />
  <rect x="142" y="125" width="36" height="35" fill-opacity="0.35" />
  <rect x="142" y="90"  width="36" height="35" fill-opacity="0.6" />
  <rect x="194" y="105" width="36" height="55" fill-opacity="0.35" />
  <rect x="194" y="50"  width="36" height="55" fill-opacity="0.6" />
  <rect x="246" y="120" width="36" height="40" fill-opacity="0.35" />
  <rect x="246" y="75"  width="36" height="45" fill-opacity="0.6" />
</svg>`;

// thumb: 막대 3개, 각 2단
const STACKED_BAR_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="4"  y="15" width="4" height="5" fill-opacity="0.35" />
  <rect x="4"  y="10" width="4" height="5" fill-opacity="0.6" />
  <rect x="10" y="13" width="4" height="7" fill-opacity="0.35" />
  <rect x="10" y="6"  width="4" height="7" fill-opacity="0.6" />
  <rect x="16" y="16" width="4" height="4" fill-opacity="0.35" />
  <rect x="16" y="12" width="4" height="4" fill-opacity="0.6" />
</svg>`;

// 8) horizontalBar -------------------------------------------------------------
// 가로 막대 5 + 좌측 세로축. 막대 높이 18, 간격 7, 시작 x=22, 좌측축 x=20.
const HORIZONTAL_BAR_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="20" x2="20" y2="160" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="22" y="28"  width="180" height="18" fill-opacity="0.6" />
  <rect x="22" y="53"  width="240" height="18" fill-opacity="0.6" />
  <rect x="22" y="78"  width="140" height="18" fill-opacity="0.6" />
  <rect x="22" y="103" width="220" height="18" fill-opacity="0.6" />
  <rect x="22" y="128" width="160" height="18" fill-opacity="0.6" />
</svg>`;

// thumb: 가로 막대 3 + 좌측축
const HORIZONTAL_BAR_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="3" y1="3" x2="3" y2="21" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="4" y="5"  width="12" height="3" fill-opacity="0.6" />
  <rect x="4" y="10" width="16" height="3" fill-opacity="0.6" />
  <rect x="4" y="15" width="9"  height="3" fill-opacity="0.6" />
</svg>`;

// 9) gauge ---------------------------------------------------------------------
// 반원 호(180°). 중심(160,150), 반지름 100. stroke-width 18.
// 외곽 호: 0.15(전체 180도), 채워진 호: 0.6(시작~중간 약 110도).
// 시작점 (60,150) → 끝점 (260,150). 채움은 약 110도 → 끝점 ≈ (160+100*cos(180-70), 150-100*sin(70)) → (94.8, 56)
const GAUGE_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <path d="M 60 150 A 100 100 0 0 1 260 150" fill="none" stroke="currentColor" stroke-width="18" stroke-opacity="0.15" stroke-linecap="butt" />
  <path d="M 60 150 A 100 100 0 0 1 195 64" fill="none" stroke="currentColor" stroke-width="18" stroke-opacity="0.6" stroke-linecap="butt" />
</svg>`;

// thumb: 반원 호 + 부분 채움. 중심(12,18), r=8, stroke-width 3.
const GAUGE_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M 4 18 A 8 8 0 0 1 20 18" fill="none" stroke="currentColor" stroke-width="3" stroke-opacity="0.15" stroke-linecap="butt" />
  <path d="M 4 18 A 8 8 0 0 1 14.7 11.3" fill="none" stroke="currentColor" stroke-width="3" stroke-opacity="0.6" stroke-linecap="butt" />
</svg>`;

// 10) heatmap ------------------------------------------------------------------
// 5×3 격자. 각 셀 톤은 0.15/0.35/0.6/1 중 하나로 분포.
// 셀 폭 52, 높이 40, 간격 4. 시작 (20, 20).
// 톤 분포 (15셀): 0.15 / 0.35 / 0.6 / 1 / 0.35 / 0.15 / 0.6 / 1 / 0.6 / 0.35 / 0.15 / 0.6 / 0.35 / 0.6 / 0.15
const HEATMAP_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <rect x="20"  y="20"  width="52" height="40" fill-opacity="0.15" />
  <rect x="76"  y="20"  width="52" height="40" fill-opacity="0.35" />
  <rect x="132" y="20"  width="52" height="40" fill-opacity="0.6" />
  <rect x="188" y="20"  width="52" height="40" fill-opacity="1" />
  <rect x="244" y="20"  width="52" height="40" fill-opacity="0.35" />
  <rect x="20"  y="64"  width="52" height="40" fill-opacity="0.15" />
  <rect x="76"  y="64"  width="52" height="40" fill-opacity="0.6" />
  <rect x="132" y="64"  width="52" height="40" fill-opacity="1" />
  <rect x="188" y="64"  width="52" height="40" fill-opacity="0.6" />
  <rect x="244" y="64"  width="52" height="40" fill-opacity="0.35" />
  <rect x="20"  y="108" width="52" height="40" fill-opacity="0.15" />
  <rect x="76"  y="108" width="52" height="40" fill-opacity="0.6" />
  <rect x="132" y="108" width="52" height="40" fill-opacity="0.35" />
  <rect x="188" y="108" width="52" height="40" fill-opacity="0.6" />
  <rect x="244" y="108" width="52" height="40" fill-opacity="0.15" />
</svg>`;

// thumb: 3×3 격자. 셀 6×6, 간격 1. 시작 (2,2).
const HEATMAP_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <rect x="2"  y="2"  width="6" height="6" fill-opacity="0.15" />
  <rect x="9"  y="2"  width="6" height="6" fill-opacity="0.6" />
  <rect x="16" y="2"  width="6" height="6" fill-opacity="0.35" />
  <rect x="2"  y="9"  width="6" height="6" fill-opacity="0.35" />
  <rect x="9"  y="9"  width="6" height="6" fill-opacity="1" />
  <rect x="16" y="9"  width="6" height="6" fill-opacity="0.6" />
  <rect x="2"  y="16" width="6" height="6" fill-opacity="0.6" />
  <rect x="9"  y="16" width="6" height="6" fill-opacity="0.35" />
  <rect x="16" y="16" width="6" height="6" fill-opacity="0.15" />
</svg>`;

// 11) treemap ------------------------------------------------------------------
// 큰 사각형 2(0.6, 0.35) + 작은 사각형 3(0.15). 캔버스 분할 — 좌상 큰 셀이 가장 진함.
// 분할: 좌측 큰 0.6 (140×140) | 우측 상단 큰 0.35 (140×80) | 우측 하단 3 small 0.15
const TREEMAP_FULL = `<svg viewBox="0 0 320 180" fill="currentColor">
  <rect x="20"  y="20" width="140" height="140" fill-opacity="0.6" />
  <rect x="162" y="20" width="138" height="80"  fill-opacity="0.35" />
  <rect x="162" y="102" width="44"  height="58" fill-opacity="0.15" />
  <rect x="208" y="102" width="44"  height="58" fill-opacity="0.15" />
  <rect x="254" y="102" width="46"  height="58" fill-opacity="0.15" />
</svg>`;

// thumb: 큰 1(0.6) + 작은 2(0.35, 0.15)
const TREEMAP_THUMB = `<svg viewBox="0 0 24 24" fill="currentColor">
  <rect x="2"  y="2"  width="12" height="20" fill-opacity="0.6" />
  <rect x="15" y="2"  width="7"  height="11" fill-opacity="0.35" />
  <rect x="15" y="14" width="7"  height="8"  fill-opacity="0.15" />
</svg>`;

// =============================================================================
// CHART_CATALOG — 11 entries, 위 순서 그대로
// =============================================================================
export const CHART_CATALOG: readonly ChartCatalogEntry[] = [
  { type: 'bar',           koLabel: '막대',     thumbnailSvg: BAR_THUMB,            fullSvg: BAR_FULL },
  { type: 'line',          koLabel: '선',       thumbnailSvg: LINE_THUMB,           fullSvg: LINE_FULL },
  { type: 'pie',           koLabel: '파이',     thumbnailSvg: PIE_THUMB,            fullSvg: PIE_FULL },
  { type: 'donut',         koLabel: '도넛',     thumbnailSvg: DONUT_THUMB,          fullSvg: DONUT_FULL },
  { type: 'area',          koLabel: '영역',     thumbnailSvg: AREA_THUMB,           fullSvg: AREA_FULL },
  { type: 'scatter',       koLabel: '분산',     thumbnailSvg: SCATTER_THUMB,        fullSvg: SCATTER_FULL },
  { type: 'stackedBar',    koLabel: '누적막대', thumbnailSvg: STACKED_BAR_THUMB,    fullSvg: STACKED_BAR_FULL },
  { type: 'horizontalBar', koLabel: '가로막대', thumbnailSvg: HORIZONTAL_BAR_THUMB, fullSvg: HORIZONTAL_BAR_FULL },
  { type: 'gauge',         koLabel: '게이지',   thumbnailSvg: GAUGE_THUMB,          fullSvg: GAUGE_FULL },
  { type: 'heatmap',       koLabel: '히트맵',   thumbnailSvg: HEATMAP_THUMB,        fullSvg: HEATMAP_FULL },
  { type: 'treemap',       koLabel: '트리맵',   thumbnailSvg: TREEMAP_THUMB,        fullSvg: TREEMAP_FULL },
] as const;

// CATALOG_INDEX는 외부에 노출하지 않는다(내부 lookup 전용).
const CATALOG_INDEX: ReadonlyMap<ChartType, ChartCatalogEntry> = new Map(
  CHART_CATALOG.map((e) => [e.type, e]),
);

// FALLBACK_ENTRY: 첫 번째 entry는 spec.md §3.4에 따라 'bar'여야 함.
// 카탈로그 무결성 sanity check(모듈 로드 시 1회). invariant 위반은 개발자 실수.
const FALLBACK_ENTRY: ChartCatalogEntry = (() => {
  const first = CHART_CATALOG[0];
  if (first === undefined || first.type !== 'bar') {
    throw new Error('[chartPlaceholder] catalog invariant violated: first entry must be "bar"');
  }
  return first;
})();

/**
 * getChart — chartType 문자열로 카탈로그 엔트리를 조회.
 *
 * - 정상 키 → 해당 entry
 * - undefined → bar 폴백 (경고 없음 — empty input은 정상 케이스)
 * - 알 수 없는 string → bar 폴백 + dev 환경에서 console.warn 1회
 */
export function getChart(type: string | undefined): ChartCatalogEntry {
  if (type === undefined) return FALLBACK_ENTRY;
  const entry = CATALOG_INDEX.get(type as ChartType);
  if (entry) return entry;
  if (!isProductionEnv()) {
    console.warn(`[chartPlaceholder] unknown chartType: "${type}", falling back to bar`);
  }
  return FALLBACK_ENTRY;
}
