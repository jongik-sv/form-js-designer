/**
 * API channel example — TSK-09-02
 *
 * createApiLoader로 /api/schemas/demo를 fetch한 후
 * bootWithSchema 검증 후 ViewerHost에 렌더한다.
 * E2E에서는 page.route('/api/schemas/demo*')로 mock 응답을 주입한다.
 */

import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ViewerHost } from '@form-js-designer/designer-core/host';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import { DesignerComponentsModule } from '@form-js-designer/designer-components';
import { DesignerTableModule } from '@form-js-designer/designer-table';
import { createApiLoader, bootWithSchema, MemoryStorage, SchemaBootError } from '../../src/index';
import type { FormSchema } from '../../src/index';
import type { BootResult } from '../../src/boot/bootTypes';

// form-js base/viewer CSS (npm bundle — CDN ORB 회피)
import '@bpmn-io/form-js-viewer/dist/assets/form-js-base.css';
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';

// ViewerHost에 주입할 additionalModules
const VIEWER_MODULES: unknown[] = [
  DesignerContainerModule,
  DesignerComponentsModule,
  DesignerTableModule,
];

// 간단한 테스트용 registry mock
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

    const loader = createApiLoader({
      baseUrl: '/api',
      schemaId: 'demo',
      env: 'dev',
      storage,
      onError: (err) => {
        console.warn('[API channel] loader error:', err.code, err.message);
      },
    });

    (async () => {
      try {
        const { schema } = await loader.load();
        const result = await bootWithSchema({
          schema: schema as FormSchema,
          registry: mockRegistry,
          storage,
        });
        setBootResult(result);
      } catch (err) {
        if (err instanceof SchemaBootError) {
          setError(`Schema validation failed: ${err.message}`);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
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
      <ViewerHost schema={bootResult.schema} additionalModules={VIEWER_MODULES} />
    </div>
  );
}

const appEl = document.getElementById('app');
if (appEl) {
  render(<App />, appEl);
}
