import { describe, it, expect } from 'vitest';
import { relocatePalette } from '../../../src/editor/leftRail/relocatePalette';

describe('relocatePalette', () => {
  it('moves the palette element from the form-js editor into the slot', () => {
    const editor = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    editor.appendChild(palette);

    const slot = document.createElement('div');
    document.body.append(editor, slot);

    relocatePalette(editor, slot);
    expect(palette.parentElement).toBe(slot);
  });

  it('is a no-op when palette is already inside the slot', () => {
    const editor = document.createElement('div');
    const slot = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    slot.appendChild(palette);
    document.body.append(editor, slot);

    relocatePalette(editor, slot);
    expect(palette.parentElement).toBe(slot);
  });

  it('returns false when palette is missing', () => {
    const editor = document.createElement('div');
    const slot = document.createElement('div');
    expect(relocatePalette(editor, slot)).toBe(false);
  });

  it('returns true on successful move', () => {
    const editor = document.createElement('div');
    const palette = document.createElement('div');
    palette.className = 'fjs-palette-container';
    editor.appendChild(palette);
    const slot = document.createElement('div');
    expect(relocatePalette(editor, slot)).toBe(true);
  });
});
