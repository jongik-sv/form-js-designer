import { Form } from '@bpmn-io/form-js-viewer';
import { DesignerContainerModule } from '@form-js-designer/designer-core';
import {
  DesignerComponentsModule,
  migrateLegacyTabsSchema,
} from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';

export interface MountOptions {
  container: HTMLElement;
  schema: Record<string, unknown>;
}

export interface MountHandle {
  update(schema: Record<string, unknown>): Promise<void>;
  destroy(): void;
}

export async function mountFormJs(opts: MountOptions): Promise<MountHandle> {
  const { container, schema } = opts;

  const form = new (Form as unknown as new (cfg: unknown) => {
    importSchema: (s: unknown) => Promise<void>;
    destroy: () => void;
  })({
    container,
    additionalModules: [
      DesignerContainerModule,
      DesignerComponentsModule,
      LayoutHeightModule,
    ],
  });

  await form.importSchema(migrateLegacyTabsSchema(schema));

  return {
    async update(next: Record<string, unknown>) {
      await form.importSchema(migrateLegacyTabsSchema(next));
    },
    destroy() {
      form.destroy();
    },
  };
}
