export interface Row {
  id: number;
  name: string;
  email: string;
  score: number;
  createdAt: Date;
  active: boolean;
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

export function generateRows(count: number, seed = 42): Row[] {
  const rand = mulberry32(seed);
  const rows: Row[] = new Array(count);
  const base = Date.now();
  for (let i = 0; i < count; i++) {
    const name = FIRST[Math.floor(rand() * FIRST.length)] + LAST[Math.floor(rand() * LAST.length)];
    rows[i] = {
      id: i + 1,
      name,
      email: `user${i + 1}@example.com`,
      score: Math.floor(rand() * 10000) / 100,
      createdAt: new Date(base - Math.floor(rand() * 365 * 86400 * 1000)),
      active: rand() > 0.5,
    };
  }
  return rows;
}
