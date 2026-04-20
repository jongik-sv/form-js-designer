/**
 * TSK-01-03: LRU 캐시 자작 구현
 *
 * Map + doubly-linked list 방식으로 O(1) 조회/삽입/eviction 보장.
 * 외부 라이브러리 없이 구현 (기술 스펙 준수).
 */

interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

/**
 * 제네릭 LRU 캐시.
 * capacity 초과 시 가장 오래전에 사용된 항목(LRU)을 evict한다.
 */
export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, Node<K, V>>;

  /** 가장 최근에 사용된 노드 (head 방향) */
  private head: Node<K, V> | null = null;
  /** 가장 오래전에 사용된 노드 (tail 방향) */
  private tail: Node<K, V> | null = null;

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new RangeError('LRUCache capacity must be >= 1');
    }
    this.capacity = capacity;
    this.map = new Map();
  }

  /** 캐시에서 key에 해당하는 값을 가져온다. 없으면 undefined. */
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }
    // 접근 시 most-recently-used로 갱신
    this.moveToHead(node);
    return node.value;
  }

  /** 캐시에 key-value를 저장한다. 이미 존재하면 값 업데이트 + MRU 갱신. */
  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);

    if (this.map.size > this.capacity) {
      // LRU eviction: tail 제거
      const evicted = this.removeTail();
      if (evicted) {
        this.map.delete(evicted.key);
      }
    }
  }

  /** key가 캐시에 존재하는지 확인한다. (접근 순서 변경 없음) */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /** 캐시를 비운다. */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  // ── 내부 doubly-linked list 헬퍼 ─────────────────────

  private addToHead(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: Node<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // node는 head
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // node는 tail
      this.tail = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: Node<K, V>): void {
    if (this.head === node) return; // 이미 head
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): Node<K, V> | null {
    const tail = this.tail;
    if (!tail) return null;
    this.removeNode(tail);
    return tail;
  }
}
