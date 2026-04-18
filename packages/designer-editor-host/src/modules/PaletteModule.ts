/**
 * PaletteModule — form-js additionalModules 규약 모듈 객체
 * TSK-06-01
 *
 * designer-components 그룹에 한국어 i18n 라벨을 매핑하는 thin wrapper.
 * 실 컴포넌트 등록은 DesignerComponentsModule 이 담당한다. Button / Table 은 form-js
 * native 컴포넌트를 그대로 사용한다.
 */

const GROUP_LABELS: Record<string, string> = {
  'designer-components': '디자이너 컴포넌트',
  container: '컨테이너',
  basic: '기본',
};

/**
 * PaletteGroupLabels 서비스 — formFields DI 주입
 * form-js DI 규약: class constructor with static inject 배열
 */
class PaletteGroupLabels {
  groupLabels: Record<string, string>;

  static inject = ['formFields'];

  constructor(formFields: { getAll?: () => Array<{ config?: { group?: string } }> }) {
    this.groupLabels = { ...GROUP_LABELS };

    // formFields.getAll()이 제공되면 등록된 컴포넌트의 group을 수집
    if (formFields && typeof formFields.getAll === 'function') {
      const all = formFields.getAll();
      for (const field of all) {
        const group = field?.config?.group;
        if (group && !this.groupLabels[group]) {
          this.groupLabels[group] = group;
        }
      }
    }
  }
}

/**
 * PaletteModule — form-js additionalModules 규약 객체
 */
export const PaletteModule = {
  __init__: ['paletteGroupLabels'],
  paletteGroupLabels: ['type', PaletteGroupLabels as unknown as new (...args: unknown[]) => unknown],
};
