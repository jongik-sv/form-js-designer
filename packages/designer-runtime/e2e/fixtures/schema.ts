/**
 * E2E 공유 schema 픽스처 — TSK-09-02
 *
 * examples/static/page.schema.json과 동일한 객체를 export.
 * roundtrip.static.spec.ts + roundtrip.api.spec.ts 양쪽에서 import하여
 * "동일 schema → 동일 렌더" AC #4-1 전제 조건을 유지한다.
 */

export const demoSchema = {
  type: 'default',
  id: 'roundtrip-demo',
  components: [
    {
      id: 'card1',
      type: 'card',
      label: 'Demo Card',
      components: [
        {
          id: 'name-field',
          type: 'textfield',
          label: 'Name',
          key: 'name',
        },
        {
          id: 'email-field',
          type: 'textfield',
          label: 'Email',
          key: 'email',
        },
      ],
    },
    {
      id: 'submit-btn',
      type: 'button',
      label: 'Submit',
      action: 'submit',
    },
  ],
} as const;
