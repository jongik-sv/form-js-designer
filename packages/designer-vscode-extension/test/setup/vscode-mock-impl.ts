/**
 * vscode module mock implementation.
 * Aliased via vitest.config.ts: resolve.alias.vscode → this file.
 */

export class Position {
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

export class Range {
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

/** WorkspaceEdit mock — replace 연산을 내부 배열에 누적한다 */
export class WorkspaceEdit {
  readonly _replacements: Array<{ uri: unknown; range: Range; newText: string }> = [];

  replace(uri: unknown, range: Range, newText: string): void {
    this._replacements.push({ uri, range, newText });
  }

  get size(): number {
    return this._replacements.length;
  }
}

/** Uri mock — TSK-02-01 */
export class Uri {
  readonly scheme: string;
  readonly fsPath: string;
  private readonly _str: string;

  private constructor(scheme: string, fsPath: string, str: string) {
    this.scheme = scheme;
    this.fsPath = fsPath;
    this._str = str;
  }

  static file(path: string): Uri {
    return new Uri('file', path, `file://${path}`);
  }

  static parse(value: string): Uri {
    const fsPath = value.replace(/^file:\/\//, '');
    return new Uri('file', fsPath, value);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.fsPath, ...segments].join('/').replace(/\/+/g, '/');
    return Uri.file(joined);
  }

  toString(): string {
    return this._str;
  }

  with(change: { scheme?: string; path?: string }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.path ?? this.fsPath,
      this._str
    );
  }
}

/** ViewColumn mock — TSK-02-01 */
export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
} as const;

/** window mock — TSK-02-01 */
export const window = {
  registerCustomEditorProvider: () => ({ dispose: () => {} }),
};

/** commands mock — TSK-02-01 */
export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async (..._args: unknown[]) => undefined,
};
