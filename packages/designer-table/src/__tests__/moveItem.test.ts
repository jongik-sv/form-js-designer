/**
 * moveItem 순수 reducer 단위 테스트
 * QA: 8 케이스 (정상 이동, 같은 위치, 양끝, 존재하지 않는 id)
 */
import { describe, it, expect } from 'vitest';
import { moveItem } from '../dnd/moveItem';

describe('moveItem', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];

  // (정상) 중간 앞으로 이동
  it('b를 d 위치로 이동 → [a, c, d, b, e]', () => {
    const result = moveItem(order, 'b', 'd');
    expect(result).toEqual(['a', 'c', 'd', 'b', 'e']);
  });

  // (정상) 중간 뒤로 이동
  it('d를 b 위치로 이동 → [a, d, b, c, e]', () => {
    const result = moveItem(order, 'd', 'b');
    expect(result).toEqual(['a', 'd', 'b', 'c', 'e']);
  });

  // (정상) 같은 위치 이동 (no-op)
  it('같은 위치(a→a)로 이동 → 원본과 동일', () => {
    const result = moveItem(order, 'a', 'a');
    expect(result).toEqual(order);
  });

  // (정상) 맨 앞으로 이동
  it('e를 a 위치로 이동 → [e, a, b, c, d]', () => {
    const result = moveItem(order, 'e', 'a');
    expect(result).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  // (정상) 맨 뒤로 이동
  it('a를 e 위치로 이동 → [b, c, d, e, a]', () => {
    const result = moveItem(order, 'a', 'e');
    expect(result).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  // (엣지) 단일 원소 배열
  it('단일 원소 배열에서 자기 자신으로 이동 → 그대로', () => {
    const result = moveItem(['x'], 'x', 'x');
    expect(result).toEqual(['x']);
  });

  // (엣지) 존재하지 않는 from id → 원본 반환
  it('존재하지 않는 from id → 원본 그대로 반환', () => {
    const result = moveItem(order, 'z', 'b');
    expect(result).toEqual(order);
  });

  // (엣지) 존재하지 않는 to id → 원본 반환
  it('존재하지 않는 to id → 원본 그대로 반환', () => {
    const result = moveItem(order, 'a', 'z');
    expect(result).toEqual(order);
  });
});
