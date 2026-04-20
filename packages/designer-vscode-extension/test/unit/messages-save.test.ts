/**
 * messages-save.test.ts — TSK-02-04
 *
 * SaveSchemaMessage / SourceUpdatedMessage 타입 narrowing 검증.
 * SaveSchemaMessage에 uri, mdStart, mdEnd, docVersion 필드가 추가되었는지 확인.
 */
import { describe, it, expect } from 'vitest';
import type {
  FormJsMessage,
  SaveSchemaMessage,
  SourceUpdatedMessage,
} from '../../src/shared/messages';

describe('SaveSchemaMessage — TSK-02-04 필드 확장', () => {
  it('SaveSchemaMessage에 uri, mdStart, mdEnd, docVersion 필드가 존재한다', () => {
    const msg: SaveSchemaMessage = {
      type: 'save-schema',
      uri: 'file:///test.md',
      mdStart: 5,
      mdEnd: 10,
      schema: '{"type":"default","components":[]}',
      docVersion: 3,
    };

    expect(msg.uri).toBe('file:///test.md');
    expect(msg.mdStart).toBe(5);
    expect(msg.mdEnd).toBe(10);
    expect(msg.docVersion).toBe(3);
    expect(msg.schema).toBe('{"type":"default","components":[]}');
  });

  it('FormJsMessage에서 type으로 SaveSchemaMessage로 narrowing된다', () => {
    const raw: FormJsMessage = {
      type: 'save-schema',
      uri: 'file:///doc.md',
      mdStart: 0,
      mdEnd: 10,
      schema: '{}',
      docVersion: 1,
    };

    if (raw.type === 'save-schema') {
      const narrowed: SaveSchemaMessage = raw;
      expect(narrowed.uri).toBe('file:///doc.md');
      expect(narrowed.docVersion).toBe(1);
    } else {
      throw new Error('narrowing failed');
    }
  });
});

describe('SourceUpdatedMessage — TSK-02-04 uri, version 필드', () => {
  it('SourceUpdatedMessage에 uri와 version 필드가 존재한다', () => {
    const msg: SourceUpdatedMessage = {
      type: 'source-updated',
      uri: 'file:///test.md',
      version: 7,
    };

    expect(msg.type).toBe('source-updated');
    expect(msg.uri).toBe('file:///test.md');
    expect(msg.version).toBe(7);
  });

  it('FormJsMessage에서 type으로 SourceUpdatedMessage로 narrowing된다', () => {
    const raw: FormJsMessage = {
      type: 'source-updated',
      uri: 'file:///some.md',
      version: 2,
    };

    if (raw.type === 'source-updated') {
      const narrowed: SourceUpdatedMessage = raw;
      expect(narrowed.uri).toBe('file:///some.md');
      expect(narrowed.version).toBe(2);
    } else {
      throw new Error('narrowing failed');
    }
  });
});
