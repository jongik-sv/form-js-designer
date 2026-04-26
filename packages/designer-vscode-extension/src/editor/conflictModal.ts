/**
 * conflictModal.ts — TSK-02-04
 *
 * 충돌 모달 wrapper.
 * `showConflictModal(showWarningMessage)` — VSCode `window.showWarningMessage` 함수를 주입받아
 * 충돌 경고 modal을 표시하고, 사용자 응답을 'overwrite' | 'cancel'로 매핑한다.
 *
 * 모달 텍스트·버튼 라벨은 이 파일 한 곳에서만 관리된다.
 */

type ShowWarningMessage = (
  message: string,
  options: { modal: boolean; detail?: string },
  ...items: string[]
) => Promise<string | undefined>;

/** 사용자가 선택한 충돌 처리 결과 */
export type ConflictChoice = 'overwrite' | 'cancel';

/**
 * 충돌 모달을 표시하고 사용자의 선택을 반환한다.
 *
 * @param showWarningMessage - vscode.window.showWarningMessage 함수 (또는 테스트 stub)
 * @returns 'overwrite' (덮어쓰기 선택) | 'cancel' (취소 또는 dismiss)
 */
export async function showConflictModal(
  showWarningMessage: ShowWarningMessage
): Promise<ConflictChoice> {
  const result = await showWarningMessage(
    '이 문서가 편집기 외부에서 변경되었습니다. 저장하시겠습니까?',
    {
      modal: true,
      detail: '덮어쓰기 시 다른 변경사항이 사라질 수 있습니다.',
    },
    '덮어쓰기',
    '취소'
  );

  return result === '덮어쓰기' ? 'overwrite' : 'cancel';
}
