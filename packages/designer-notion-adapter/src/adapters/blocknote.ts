/**
 * blocknote.ts — BlockNote v0.x custom block 플러그인 계약 구현
 *
 * BlockNote SDK의 createReactBlockSpec으로 FormJsViewerBlock을 래핑한다.
 * insertSpec으로 "+" 메뉴에 "form-js" 항목을 등록한다.
 *
 * NOTE: PoC 단계에서 BlockNote SDK는 stub 상태. 실제 플랫폼 확인 후 수정 필요.
 * TSK-03-01에서 플랫폼이 확정되면 이 파일의 타입/API를 업데이트한다.
 */

/** BlockNote custom block 데이터 타입 (stub) */
export interface FormJsBlockData {
  schema: string;
}

/** BlockNote custom block spec (stub — 실제 BlockNote SDK 타입으로 교체 필요) */
export interface BlockNoteBlockSpec {
  type: string;
  propSchema: Record<string, { default: unknown }>;
  content: 'none';
  render: (props: { block: { props: FormJsBlockData } }) => HTMLElement;
}

/** BlockNote "+" 메뉴 insertSpec (stub) */
export interface BlockNoteInsertSpec {
  group: string;
  name: string;
  execute: (editor: unknown) => void;
}

const DEFAULT_SCHEMA = JSON.stringify({ components: [] });

/**
 * BlockNote custom block spec 생성.
 * 실제 환경에서는 BlockNote SDK의 createReactBlockSpec으로 교체한다.
 */
export function createFormJsBlockSpec(): BlockNoteBlockSpec {
  return {
    type: 'formJs',
    propSchema: {
      schema: { default: DEFAULT_SCHEMA },
    },
    content: 'none',
    render(props) {
      const container = document.createElement('div');
      container.className = 'form-js-block-wrapper';

      // PoC: genericMount를 비동기로 호출 (실제 BlockNote는 동기 render 필요 — stub)
      import('./generic').then(({ genericMount }) => {
        genericMount(container, props.block.props.schema ?? DEFAULT_SCHEMA);
      });

      return container;
    },
  };
}

/**
 * BlockNote "+" 메뉴에 "form-js" 항목을 추가하는 insertSpec.
 */
export function createFormJsInsertSpec(editor: unknown): BlockNoteInsertSpec {
  return {
    group: '임베드',
    name: 'form-js',
    execute(_ed: unknown) {
      // PoC stub: 실제 BlockNote editor API로 블록 삽입
      console.warn('[form-js adapter] blockNotePlugin.execute — stub. 실제 BlockNote editor API 연동 필요.');
      void editor;
    },
  };
}

/** 패키지 공개 API: BlockNote 플러그인 팩토리 */
export const blockNotePlugin = {
  createBlockSpec: createFormJsBlockSpec,
  createInsertSpec: createFormJsInsertSpec,
};
