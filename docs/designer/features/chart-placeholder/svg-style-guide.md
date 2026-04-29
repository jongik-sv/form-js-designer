# SVG 디자인 스타일 가이드 — chartPlaceholder 22장

> 본 문서는 `chartPlaceholder` 컴포넌트가 사용하는 11종 × 2장(full + thumbnail) = **총 22장 SVG**를 작성할 때의 **단일 디자인 규약**이다.
>
> 이 가이드 한 장만 보고 작성자가 11종 모양을 일관되게 그릴 수 있어야 한다. spec.md §4.4(SVG 자산 작성 규약) 보강.

## 1. 공통 규칙 (22장 전부 적용)

| 항목 | 규약 | 비고 |
|---|---|---|
| **viewBox (full)** | `0 0 320 180` | 16:9. 캔버스 렌더용 |
| **viewBox (thumbnail)** | `0 0 24 24` | v2 팔레트/select 아이콘용 |
| **width/height 속성** | 작성하지 않음 | CSS `width: 100%; height: 100%`가 제어 |
| **색상** | `currentColor` 단일 | 다크/라이트 자동 적응. 하드코딩 색상 금지 |
| **톤(농도)** | `fill-opacity` 4단계 만 사용: `0.15` / `0.35` / `0.6` / `1` | 같은 currentColor를 농도로만 구분 |
| **축/격자 stroke** | `opacity="0.3"`, `stroke-width="1"`, `stroke="currentColor"` | `fill="none"` 필수 |
| **데이터 stroke (라인 등)** | `stroke="currentColor"`, `stroke-width="2"`, `fill="none"` (또는 영역 차트는 `fill-opacity="0.35"`) | |
| **텍스트** | **금지** — `<text>` 노드 0개 | 라벨/숫자/축값 모두 없음. 시안 의도만 전달 |
| **배경 fill** | **금지** — 투명 | 컨테이너 배경 상속(`<rect>` 전체 채움 같은 것 넣지 말 것) |
| **데이터 요소 개수** | 핵심 형태만 (막대 5 / 선 1 / 파이 분할 2~3 등) | 표 §4 참고 |
| **xmlns** | 작성하지 않음 | 인라인 SVG(`dangerouslySetInnerHTML`로 박힘 — root 속성 불필요) |
| **들여쓰기/포맷** | 한 줄 압축 OR 2-space 들여쓰기 일관 | 카탈로그는 한 줄 압축 권장(번들 크기) |
| **stroke-linecap/linejoin** | 곡선/꺾임에는 `stroke-linecap="round"` `stroke-linejoin="round"` | line/area/scatter trail 등 |

> **체크리스트** (자산 1장 작성 후 본인 검증)
> - [ ] `<text>` 0개
> - [ ] 배경 채움 `<rect>` 0개
> - [ ] `fill="#…"` 또는 `stroke="#…"` 같은 hex/rgb 0개 (모두 `currentColor`)
> - [ ] viewBox 정확 (full 320×180 / thumb 24×24)
> - [ ] `fill-opacity` 값이 `0.15` `0.35` `0.6` `1` 중 하나
> - [ ] 축선 `opacity="0.3"`

## 2. fullSvg 구조 권장 (320×180)

표준 영역(데이터 영역의 안전 마진):

```
x: 20 ~ 300   (좌우 margin 20)
y: 20 ~ 160   (상단 margin 20, 하단 baseline 자리 20)
baseline:  y = 160  (가로축)
left axis: x = 20   (세로축 — 차트 종류에 따라 생략 가능)
```

레이어 순서(아래→위):

1. 격자(쓰는 차트만, e.g. heatmap은 격자 자체가 데이터 → 본 단계 생략)
2. 축선 (`opacity="0.3"`, baseline 가로축은 거의 모든 차트에 권장)
3. 데이터 형태 (가장 진한 톤)
4. 강조점/마커 (있으면)

기본 골격:

```svg
<svg viewBox="0 0 320 180" fill="currentColor">
  <!-- 1) baseline / axis  -->
  <line x1="20" y1="160" x2="300" y2="160"
        stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <!-- 2) data shapes (currentColor + fill-opacity) -->
  …
</svg>
```

## 3. thumbnailSvg 구조 권장 (24×24)

- fullSvg를 그대로 축소하지 말 것 — **요소 수를 줄이고**(예: 막대 5→3) 단순화.
- 기본 영역: 데이터 영역 `x: 2~22`, `y: 2~20`, baseline `y=20`.
- 1px 미만 디테일 금지(rendering 깨짐).
- 축선은 차트 의도가 분명한 경우만(막대/라인/영역). 파이/도넛/게이지/트리맵 등 자체 형태로 인식되는 차트는 축선 생략.

## 4. 11종별 핵심 형태 가이드

> 작성자는 이 표만 보고 11종을 일관되게 그릴 수 있어야 한다. **요소 수와 톤은 표에 명시된 것을 우선**한다.

| # | type | 핵심 형태 (full) | 톤 사용 | 핵심 형태 (thumb) |
|---|---|---|---|---|
| 1 | `bar` | 세로 막대 **5개** + baseline | 막대 `0.6` (전부 동일 톤) | 막대 **3개** + baseline |
| 2 | `line` | 단일 절선/곡선 **1개** + baseline. 4~6 꼭지점 | stroke `currentColor` (fill 없음) | 단일 곡선 1개 (꼭지점 3) |
| 3 | `pie` | 원 1개 + 분할선 **2~3개** (즉 3~4 슬라이스). 전체 원 외곽 + 한 슬라이스만 `0.6`, 나머지 `0.15` | `0.15` + `0.6` 2단계 | 원 + 1 슬라이스 강조 |
| 4 | `donut` | 도넛 링 1개(가운데 구멍) + 분할 **2~3개**. 한 조각 `0.6`, 나머지 `0.15` | `0.15` + `0.6` | 도넛 링 + 1 강조 조각 |
| 5 | `area` | 단일 영역 **1개**(채움 `0.35`) + 그 위 stroke 1줄 + baseline | 영역 `0.35`, stroke `currentColor` | 단일 영역 1개 + baseline |
| 6 | `scatter` | 점 **8~12개** 산포(`<circle>` r=3~4) + baseline + 좌측축 | 점 `0.6` 통일 | 점 **5개** |
| 7 | `stackedBar` | 세로 막대 **5개**. 각 막대를 2단(`0.35` + `0.6`)으로 분할 + baseline | `0.35` 하단 + `0.6` 상단 | 막대 3개, 각 2단 |
| 8 | `horizontalBar` | 가로 막대 **4~5개** + 좌측 세로축 | 막대 `0.6` | 가로 막대 **3개** |
| 9 | `gauge` | 반원 호(180°). 외곽 호 `0.15`(stroke-width 굵게), 채워진 호 `0.6`(stroke-width 굵게, 시작~~중간 정도까지) | `0.15` + `0.6` | 반원 호 + 부분 채움 |
| 10 | `heatmap` | **5×3** 격자(또는 5×4). 각 셀의 톤을 `0.15`/`0.35`/`0.6`/`1` 중 하나로 무작위 분포(축은 생략 가능) | 4단계 톤 모두 사용 | **3×3** 격자 |
| 11 | `treemap` | 큰 사각형 **2개**(`0.6` `0.35`) + 작은 사각형 **2~3개**(`0.15`)로 한 화면 분할 | `0.15` + `0.35` + `0.6` | 큰 사각 1 + 작은 사각 2 |

### 4.x 구체 디자인 디시전 메모

- **bar / stackedBar / horizontalBar**: 막대 사이 간격 = 막대 폭의 약 0.4배. 5개 기준 막대 폭 36, 간격 16, 좌우 마진 38.
- **line / area**: 꼭지점은 부드럽게 — `path d="M ... C ..."` 또는 `polyline` + `stroke-linejoin="round"`. 우상향만 그리지 말 것(평탄+상승+하강 섞기 — 데이터 인상).
- **pie / donut**: 강조 슬라이스는 11~2시 방향(우상단)에 두기 — 시각적 균형.
- **scatter**: 점은 살짝 우상향 클러스터(상관관계 인상) — 점 r=3 (full) / r=1.2 (thumb).
- **gauge**: stroke-width 약 18 (full) / 3 (thumb). 중심 (160, 150). 반지름 약 100.
- **heatmap**: 셀 크기 균일. 셀 간 간격 1~2px(`stroke="currentColor"` `stroke-opacity="0.3"` 또는 셀 사이 빈 공간).
- **treemap**: 셀 사이 간격 2px. 한 모서리에서 시작해 분할 — 좌상단 큰 셀이 가장 진한 톤.

## 5. bar 샘플 (참조 표본)

> 본 절의 두 SVG는 위 규약을 그대로 따른다. 작성자는 자신이 만든 SVG가 아래 샘플과 같은 톤/축/요소 수 일관성을 보이는지 자체 비교한다.

### 5.1 bar fullSvg (viewBox 0 0 320 180)

```svg
<svg viewBox="0 0 320 180" fill="currentColor">
  <line x1="20" y1="160" x2="300" y2="160"
        stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="38"  y="100" width="36" height="60"  fill-opacity="0.6" />
  <rect x="90"  y="70"  width="36" height="90"  fill-opacity="0.6" />
  <rect x="142" y="90"  width="36" height="70"  fill-opacity="0.6" />
  <rect x="194" y="50"  width="36" height="110" fill-opacity="0.6" />
  <rect x="246" y="75"  width="36" height="85"  fill-opacity="0.6" />
</svg>
```

요소 수 자체 점검: 1 baseline + 5 막대 = 총 6 요소. `<text>` 0개. 배경 `<rect>` 0개.

### 5.2 bar thumbnailSvg (viewBox 0 0 24 24)

```svg
<svg viewBox="0 0 24 24" fill="currentColor">
  <line x1="2" y1="20" x2="22" y2="20"
        stroke="currentColor" stroke-width="1" opacity="0.3" fill="none" />
  <rect x="4"  y="10" width="4" height="10" fill-opacity="0.6" />
  <rect x="10" y="6"  width="4" height="14" fill-opacity="0.6" />
  <rect x="16" y="12" width="4" height="8"  fill-opacity="0.6" />
</svg>
```

요소 수 자체 점검: 1 baseline + 3 막대 = 총 4 요소. 24×24 안에서 1px 미만 디테일 없음.

## 6. 자산 작성 워크플로우 (제안)

1. 본 가이드 §1 / §2 / §3 / §4 를 한 번 통독.
2. 자기 차트 행의 "핵심 형태" 컬럼을 그대로 따라 fullSvg 작성.
3. §1 체크리스트 6개 항목 자체 점검.
4. fullSvg를 보고 요소 수를 줄여(thumb은 보통 데이터 요소 절반~2/3) thumbnailSvg 작성.
5. 두 SVG를 옆에 두고 톤/축선/요소 수가 §4 표와 일치하는지 마지막 확인.
6. 22장 전부 작성 후, bar 샘플(§5)을 기준 표본으로 두고 시각적 일관성을 일괄 비교.

## 7. 안티패턴 (하지 말 것)

- ❌ `<rect width="320" height="180" fill="#fafafa" />` 같은 배경 사각형
- ❌ `fill="#0066cc"` 등 hex 색상
- ❌ `<text x="160" y="170">Q1</text>` 같은 라벨 — 시안 의도 인식을 방해
- ❌ thumbnail에서 fullSvg 5개 막대를 그대로 욱여넣기 — 1px 미만 디테일은 깨진다
- ❌ stroke만 쓰고 fill 안 쓰는데 `fill="black"` 누락 → 의도치 않은 검정 채움. 데이터 stroke 형태에는 반드시 `fill="none"`

---

검토 OK 후 22장 작성에 착수한다(plan.md Task 1.2~). 본 가이드는 의도적으로 **단일 페이지 분량**을 유지한다 — 변경이 잦으면 일관성이 깨진다.
