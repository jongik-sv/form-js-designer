/**
 * TSK-01-04: test bridge 단위 테스트
 *
 * extension.ts의 test bridge 로직:
 * - _testMountState 맵 업데이트
 * - getMountState 커맨드 응답
 * - webview 메시지 test-mount-complete 수신 처리
 *
 * VSCode API는 사용하지 않고 순수 로직만 테스트한다.
 */
import { describe, it, expect } from 'vitest';
import {
  createTestMountState,
  updateMountState,
  getMountStateForUri,
  clearMountState,
} from '../../src/testBridge';
import type { BlockMountState } from '../../src/shared/messages';

describe('testBridge: createTestMountState', () => {
  it('빈 blocks 배열로 상태를 생성할 수 있다', () => {
    const state = createTestMountState([]);
    expect(state.blocks).toEqual([]);
  });

  it('blocks 배열을 포함한 상태를 생성한다', () => {
    const blocks: BlockMountState[] = [
      { schemaId: 'form-1', hasError: false },
      { schemaId: 'form-2', hasError: true },
    ];
    const state = createTestMountState(blocks);
    expect(state.blocks).toEqual(blocks);
  });
});

describe('testBridge: updateMountState / getMountStateForUri', () => {
  it('URI에 대한 마운트 상태를 저장하고 조회할 수 있다', () => {
    const uri = 'file:///test/single-block.md';
    const blocks: BlockMountState[] = [{ schemaId: 'form-1', hasError: false }];

    updateMountState(uri, blocks);
    const state = getMountStateForUri(uri);

    expect(state).toBeDefined();
    expect(state!.blocks).toEqual(blocks);
  });

  it('존재하지 않는 URI 조회 시 undefined를 반환한다', () => {
    const state = getMountStateForUri('file:///nonexistent.md');
    expect(state).toBeUndefined();
  });

  it('동일 URI에 상태를 두 번 업데이트하면 최신 값으로 덮어쓴다', () => {
    const uri = 'file:///test/update.md';
    const blocks1: BlockMountState[] = [{ schemaId: 'form-1', hasError: false }];
    const blocks2: BlockMountState[] = [
      { schemaId: 'form-1', hasError: false },
      { schemaId: 'form-2', hasError: true },
    ];

    updateMountState(uri, blocks1);
    updateMountState(uri, blocks2);
    const state = getMountStateForUri(uri);

    expect(state!.blocks).toEqual(blocks2);
    expect(state!.blocks).toHaveLength(2);
  });

  it('여러 URI의 상태를 독립적으로 저장한다', () => {
    const uri1 = 'file:///test/doc1.md';
    const uri2 = 'file:///test/doc2.md';
    const blocks1: BlockMountState[] = [{ schemaId: 'a', hasError: false }];
    const blocks2: BlockMountState[] = [{ schemaId: 'b', hasError: true }];

    updateMountState(uri1, blocks1);
    updateMountState(uri2, blocks2);

    expect(getMountStateForUri(uri1)!.blocks).toEqual(blocks1);
    expect(getMountStateForUri(uri2)!.blocks).toEqual(blocks2);
  });
});

describe('testBridge: clearMountState', () => {
  it('clearMountState(uri)는 해당 URI의 상태만 제거한다', () => {
    const uri = 'file:///test/clear.md';
    updateMountState(uri, [{ schemaId: 'x', hasError: false }]);

    clearMountState(uri);

    expect(getMountStateForUri(uri)).toBeUndefined();
  });

  it('clearMountState()는 모든 상태를 제거한다', () => {
    updateMountState('file:///a.md', [{ schemaId: 'a', hasError: false }]);
    updateMountState('file:///b.md', [{ schemaId: 'b', hasError: false }]);

    clearMountState();

    expect(getMountStateForUri('file:///a.md')).toBeUndefined();
    expect(getMountStateForUri('file:///b.md')).toBeUndefined();
  });
});

describe('testBridge: 다중 블록 + invalid 시나리오', () => {
  it('유효 2개 + invalid 1개 블록 상태를 정확히 저장한다', () => {
    const uri = 'file:///test/multi-block-with-invalid.md';
    const blocks: BlockMountState[] = [
      { schemaId: 'valid-form-1', hasError: false },
      { schemaId: 'valid-form-2', hasError: false },
      { schemaId: '', hasError: true }, // invalid JSON 블록은 schemaId 없음
    ];

    updateMountState(uri, blocks);
    const state = getMountStateForUri(uri);

    expect(state!.blocks).toHaveLength(3);
    expect(state!.blocks.filter((b) => !b.hasError)).toHaveLength(2);
    expect(state!.blocks.filter((b) => b.hasError)).toHaveLength(1);
  });

  it('reload 후 상태가 갱신되면 이전 상태와 독립적이다', () => {
    const uri = 'file:///test/reload-test.md';

    // 첫 번째 마운트
    updateMountState(uri, [{ schemaId: 'reload-form', hasError: false }]);
    expect(getMountStateForUri(uri)!.blocks).toHaveLength(1);

    // reload 시뮬레이션: clearMountState 후 재업데이트
    clearMountState(uri);
    expect(getMountStateForUri(uri)).toBeUndefined();

    // 재마운트
    updateMountState(uri, [{ schemaId: 'reload-form', hasError: false }]);
    expect(getMountStateForUri(uri)!.blocks).toHaveLength(1);
  });
});
