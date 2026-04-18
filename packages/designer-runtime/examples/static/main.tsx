/**
 * Static channel example — TSK-09-02
 *
 * page.schema.json + manifest.json을 정적으로 import하여
 * bootWithSchema 검증 후 ViewerHost에 렌더한다.
 */

import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ViewerHost } from '@form-js-designer/designer-core/host';
import { createStaticSource, bootWithSchema, MemoryStorage } from '../../src/index';
import type { FormSchema } from '../../src/index';
import type { BootResult } from '../../src/boot/bootTypes';

// 정적 import — 빌드 타임 번들 포함
import schemaJson from './page.schema.json';
import manifestJson from './manifest.json';

// 간단한 테스트용 registry mock (card/textfield/button 등록)
const mockRegistry = {
  get: (type: string) => {
    const types = ['card', 'textfield', 'button', 'stack', 'tabs', 'default'];
    return types.includes(type) ? {} : undefined;
  },
};

function App() {
  const [bootResult, setBootResult] = useState<BootResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storage = new MemoryStorage();

    (async () => {
      try {
        const source = createStaticSource(schemaJson as FormSchema, manifestJson);
        const { schema } = await source.load();
        const result = await bootWithSchema({
          schema,
          registry: mockRegistry,
          storage,
        });
        setBootResult(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    })();
  }, []);

  if (error) {
    return (
      <div data-testid="schema-error-box">
        <strong>Schema Boot Error</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!bootResult) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div data-testid="viewer-container">
      <ViewerHost schema={bootResult.schema} />
    </div>
  );
}

const appEl = document.getElementById('app');
if (appEl) {
  render(<App />, appEl);
}
