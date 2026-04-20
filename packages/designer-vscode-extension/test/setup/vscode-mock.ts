/**
 * VSCode API mock for Vitest unit tests.
 * The `vscode` module is not available in Node test environment,
 * so we provide minimal stubs for Position and Range.
 */

class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  isAfter(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character);
  }

  translate(lineDelta: number, characterDelta = 0): Position {
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }

  with(line?: number, character?: number): Position {
    return new Position(line ?? this.line, character ?? this.character);
  }
}

class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(start: Position, end: Position);
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(
    startOrLine: Position | number,
    endOrCharacter: Position | number,
    endLine?: number,
    endCharacter?: number
  ) {
    if (typeof startOrLine === 'number') {
      this.start = new Position(startOrLine, endOrCharacter as number);
      this.end = new Position(endLine!, endCharacter!);
    } else {
      this.start = startOrLine;
      this.end = endOrCharacter as Position;
    }
  }

  get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Range) {
      return !positionOrRange.start.isBefore(this.start) && !positionOrRange.end.isAfter(this.end);
    }
    return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
  }
}

// Provide vscode mock globally via module mock
import { vi } from 'vitest';

vi.mock('vscode', () => ({
  Position,
  Range,
}));
