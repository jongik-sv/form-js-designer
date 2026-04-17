/**
 * rows-10k.ts — 10,000 행 고정 시드 생성기
 * Q2 spike `data.ts` (packages/designer-core/spike/phase1-q1q2/q2-tanstack/src/data.ts) 기반
 * TSK-05-02: `generateRows(10000, seed=42)` 호환 컨트랙트 유지
 */

export interface FixtureRow {
  id: number;
  name: string;
  email: string;
  score: number;
  createdAt: string; // ISO 문자열 (Date → string, FEEL 파이프라인 일관성)
  active: boolean;
  status: 'active' | 'inactive';
}

const FIRST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const LAST = ['민수', '지영', '현우', '서연', '도현', '수빈', '준영', '하늘', '은지', '태호'];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 고정 시드 행 생성기
 * @param count 생성할 행 수 (기본 10000)
 * @param seed 랜덤 시드 (기본 42, Q2 spike와 동일)
 */
export function generateRows(count = 10000, seed = 42): FixtureRow[] {
  const rand = mulberry32(seed);
  const rows: FixtureRow[] = new Array(count);
  const base = Date.now();
  for (let i = 0; i < count; i++) {
    const firstName = FIRST[Math.floor(rand() * FIRST.length)] ?? '김';
    const lastName = LAST[Math.floor(rand() * LAST.length)] ?? '민수';
    const name = firstName + lastName;
    const active = rand() > 0.5;
    rows[i] = {
      id: i + 1,
      name,
      email: `user${i + 1}@example.com`,
      score: Math.floor(rand() * 10000) / 100,
      createdAt: new Date(base - Math.floor(rand() * 365 * 86400 * 1000)).toISOString().split('T')[0]!,
      active,
      status: active ? 'active' : 'inactive',
    };
  }
  return rows;
}

/** 10k 행 캐시 (lazy-generate — 첫 호출 시 1회만 생성) */
let _rows10k: FixtureRow[] | null = null;

export function getRows10k(): FixtureRow[] {
  if (!_rows10k) {
    _rows10k = generateRows(10000, 42);
  }
  return _rows10k;
}
