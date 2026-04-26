/**
 * relocatePalette — form-js editor 컨테이너 안의 .fjs-palette-container DOM을
 * 좌측 rail의 components 슬롯으로 이동시킨다.
 *
 * dragula 기반 form-js 팔레트는 element 자체에 listener를 박으므로 reparent 안전.
 * 이미 슬롯 안에 있으면 no-op. 팔레트 미존재면 false.
 */
export function relocatePalette(editorEl: Element, slotEl: Element): boolean {
  const palette = editorEl.querySelector('.fjs-palette-container') as HTMLElement | null;
  if (!palette) return false;
  if (palette.parentElement === slotEl) return true;
  slotEl.appendChild(palette);
  return true;
}
