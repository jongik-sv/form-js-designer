import { describe, it, expect } from 'vitest';
import type {
  FormJsMessage,
  RequestEditMessage,
  EditOpenedMessage,
  SaveSchemaMessage,
  SaveResultMessage,
  SourceUpdatedMessage,
} from '../../src/shared/messages';

describe('messages 타입 narrowing', () => {
  it('type: "request-edit" 메시지가 RequestEditMessage로 타입 narrowing된다', () => {
    const msg: FormJsMessage = {
      type: 'request-edit',
      mdStart: 10,
      mdEnd: 20,
    };

    if (msg.type === 'request-edit') {
      const narrowed: RequestEditMessage = msg;
      expect(narrowed.mdStart).toBe(10);
      expect(narrowed.mdEnd).toBe(20);
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('type: "edit-opened" 메시지가 EditOpenedMessage로 타입 narrowing된다', () => {
    const msg: FormJsMessage = {
      type: 'edit-opened',
      schema: '{"components":[]}',
      uri: 'file:///test.md',
      mdStart: 5,
      mdEnd: 15,
      docVersion: 1,
    };

    if (msg.type === 'edit-opened') {
      const narrowed: EditOpenedMessage = msg;
      expect(narrowed.schema).toBe('{"components":[]}');
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('type: "save-schema" 메시지가 SaveSchemaMessage로 타입 narrowing된다', () => {
    const msg: FormJsMessage = {
      type: 'save-schema',
      uri: 'file:///test.md',
      mdStart: 5,
      mdEnd: 10,
      schema: '{"components":[]}',
      docVersion: 1,
    };

    if (msg.type === 'save-schema') {
      const narrowed: SaveSchemaMessage = msg;
      expect(narrowed.schema).toBe('{"components":[]}');
      expect(narrowed.uri).toBe('file:///test.md');
      expect(narrowed.docVersion).toBe(1);
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('type: "save-result" 메시지의 ok 필드가 boolean 타입으로 추론된다', () => {
    const msgOk: FormJsMessage = { type: 'save-result', ok: true };
    const msgFail: FormJsMessage = { type: 'save-result', ok: false, error: 'write failed' };

    if (msgOk.type === 'save-result') {
      const narrowed: SaveResultMessage = msgOk;
      expect(narrowed.ok).toBe(true);
      expect(typeof narrowed.ok).toBe('boolean');
    }

    if (msgFail.type === 'save-result') {
      const narrowed: SaveResultMessage = msgFail;
      expect(narrowed.ok).toBe(false);
      expect(narrowed.error).toBe('write failed');
    }
  });

  it('type: "source-updated" 메시지가 SourceUpdatedMessage로 타입 narrowing된다', () => {
    const msg: FormJsMessage = {
      type: 'source-updated',
      uri: 'file:///test.md',
      version: 3,
    };

    if (msg.type === 'source-updated') {
      const narrowed: SourceUpdatedMessage = msg;
      expect(narrowed.uri).toBe('file:///test.md');
      expect(narrowed.version).toBe(3);
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('5종 메시지 인터페이스가 모두 존재하고 type 필드로 구분된다', () => {
    const types: FormJsMessage['type'][] = [
      'request-edit',
      'edit-opened',
      'save-schema',
      'save-result',
      'source-updated',
    ];
    expect(types).toHaveLength(5);
  });

  it('RequestEditMessage는 webview→ext 방향 메시지이다 (구조 검증)', () => {
    const msg: RequestEditMessage = { type: 'request-edit', mdStart: 0, mdEnd: 10 };
    expect(msg.type).toBe('request-edit');
    expect(typeof msg.mdStart).toBe('number');
    expect(typeof msg.mdEnd).toBe('number');
  });

  it('EditOpenedMessage는 ext→webview 방향 메시지이다 (구조 검증)', () => {
    const msg: EditOpenedMessage = {
      type: 'edit-opened',
      schema: '{}',
      uri: 'file:///test.md',
      mdStart: 1,
      mdEnd: 5,
      docVersion: 1,
    };
    expect(msg.type).toBe('edit-opened');
    expect(msg.schema).toBe('{}');
  });
});
